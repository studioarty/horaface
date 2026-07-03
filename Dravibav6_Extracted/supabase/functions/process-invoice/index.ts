import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const ONSPACE_AI_KEY = Deno.env.get('ONSPACE_AI_KEY') || '';
const ONSPACE_AI_URL = 'https://api.onspace.ai/v1/chat/completions';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: `Bearer ${token}` } }
      }
    );

    // Get user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { fileId, fileUrl, fileName } = await req.json();

    console.log('Processing invoice:', fileName);

    // Update status to processing
    await supabaseClient
      .from('invoice_data')
      .upsert({
        file_id: fileId,
        user_id: user.id,
        extraction_status: 'processing',
      });

    // Call OnSpace AI for invoice extraction
    const prompt = `Você é um assistente especializado em extrair dados de notas fiscais brasileiras. 
Analise o documento fornecido e extraia as seguintes informações em formato JSON:
- invoice_number: número da nota fiscal
- issue_date: data de emissão (formato YYYY-MM-DD)
- due_date: data de vencimento (formato YYYY-MM-DD)
- supplier_name: nome do fornecedor/emissor
- supplier_cnpj: CNPJ do fornecedor (apenas números)
- total_amount: valor total (número decimal)
- tax_amount: valor dos impostos (número decimal)
- net_amount: valor líquido (número decimal)
- currency: moeda (padrão BRL)
- items: array com os itens da nota, cada item com { description, quantity, unit_price, total }

Se algum campo não for encontrado, use null. Retorne APENAS o JSON válido, sem texto adicional.

Arquivo: ${fileName}
URL: ${fileUrl}`;

    const aiResponse = await fetch(ONSPACE_AI_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ONSPACE_AI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em contabilidade e processamento de documentos fiscais brasileiros. Extraia dados com precisão.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      throw new Error(`OnSpace AI: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const extractedText = aiData.choices[0].message.content;

    console.log('AI Response:', extractedText);

    // Parse JSON from AI response
    let invoiceData;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = extractedText.match(/```json\n([\s\S]*?)\n```/) || 
                       extractedText.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : extractedText;
      invoiceData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      throw new Error('Falha ao processar resposta da IA');
    }

    // Save extracted data
    const { error: saveError } = await supabaseClient
      .from('invoice_data')
      .upsert({
        file_id: fileId,
        user_id: user.id,
        invoice_number: invoiceData.invoice_number,
        issue_date: invoiceData.issue_date,
        due_date: invoiceData.due_date,
        supplier_name: invoiceData.supplier_name,
        supplier_cnpj: invoiceData.supplier_cnpj,
        total_amount: invoiceData.total_amount,
        tax_amount: invoiceData.tax_amount,
        net_amount: invoiceData.net_amount,
        currency: invoiceData.currency || 'BRL',
        items: invoiceData.items,
        raw_data: invoiceData,
        extraction_status: 'completed',
        extraction_date: new Date().toISOString(),
      });

    if (saveError) throw saveError;

    return new Response(
      JSON.stringify({ success: true, data: invoiceData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
