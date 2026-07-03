/**
 * Azure Neural TTS — HoraFace
 * Voz: pt-BR-FranciscaNeural (feminina, natural)
 * Free tier: 500.000 chars/mês — muito acima do uso esperado
 */

import { getKioskSnapshot } from '@/stores/useKioskStore';

const AZURE_KEY    = import.meta.env.VITE_AZURE_SPEECH_KEY as string;
const AZURE_REGION = (import.meta.env.VITE_AZURE_SPEECH_REGION as string) || 'brazilsouth';
const DEFAULT_VOICE = 'pt-BR-FranciscaNeural';

// Lê a voz do KioskStore (sincronizado via Supabase — funciona em todos os dispositivos)
// Fallback para localStorage para resposta imediata na UI
const getVoice = () =>
  getKioskSnapshot().ttsVoice ||
  localStorage.getItem('horaface_tts_voice') ||
  DEFAULT_VOICE;


// Cache em memória: texto → blob URL — evita chamadas repetidas à API
const audioCache = new Map<string, string>();

/**
 * Gera e reproduz áudio via Azure Neural TTS.
 * Usa cache em memória para não repetir chamadas à API.
 * Em caso de falha, faz fallback para Web Speech API.
 */
export async function speakAzure(text: string): Promise<void> {
  try {
    const voice = getVoice();
    const cacheKey = `${voice}::${text}`;
    let audioUrl = audioCache.get(cacheKey);

    if (!audioUrl) {
      // Não está em cache — chama a API
      const ssml = `
        <speak version='1.0' xml:lang='pt-BR'>
          <voice xml:lang='pt-BR' name='${voice}'>
            <prosody rate="0%" pitch="0%">
              ${text}
            </prosody>
          </voice>
        </speak>`.trim();

      const res = await fetch(
        `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': AZURE_KEY,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
          },
          body: ssml,
        }
      );

      if (!res.ok) throw new Error(`Azure TTS HTTP ${res.status}`);

      const blob = await res.blob();
      audioUrl = URL.createObjectURL(blob);
      audioCache.set(cacheKey, audioUrl);
      console.log(`[TTS] Gerado e cacheado [${voice}]: "${text}"`);
    } else {
      console.log(`[TTS] Tocando do cache: "${text}"`);
    }

    const audio = new Audio(audioUrl);
    audio.play().catch(err => {
      console.warn('[TTS] Falha ao tocar áudio:', err);
      fallbackTTS(text);
    });

  } catch (err) {
    console.warn('[TTS] Azure falhou, usando Web Speech API:', err);
    fallbackTTS(text);
  }
}

/**
 * Fallback: Web Speech API nativa do browser
 */
function fallbackTTS(text: string): void {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  utterance.rate = 1.05;
  utterance.pitch = 1.1;
  const voices = window.speechSynthesis.getVoices();
  utterance.voice =
    voices.find(v => v.name.includes('Neural') && v.lang.includes('pt-BR')) ||
    voices.find(v => v.name.includes('Google') && v.lang.includes('pt-BR')) ||
    voices.find(v => v.lang.includes('pt-BR')) ||
    null;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

/**
 * Atalho: cumprimentar colaborador com nome + tipo (entrada/saída)
 */
export function greetCollaborator(type: 'in' | 'out', name: string): void {
  const firstName = name.split(' ')[0];
  let text: string;

  if (type === 'in') {
    const h = new Date().getHours();
    const greeting = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    text = `${greeting}, ${firstName}! Entrada registrada com sucesso.`;
  } else {
    text = `Até logo, ${firstName}! Saída registrada com sucesso.`;
  }

  // Pequeno delay para garantir que o browser desbloqueie o contexto de áudio
  setTimeout(() => speakAzure(text), 150);
}
