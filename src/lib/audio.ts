/**
 * Geração sintética do som de notificação clássico (dois bipes agudos rápidos)
 * usando a Web Audio API do próprio navegador. Funciona 100% offline e sem arquivos externos.
 */
export function playChatNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    
    // Tenta retomar o contexto se estiver suspenso por políticas de autoplay
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    // Primeiro bipe (mais curto e um pouco mais grave: Nota Lá 880Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    gain1.gain.setValueAtTime(0.12, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.08);
    
    // Segundo bipe (ligeiramente mais longo e agudo: Nota Dó 1046Hz, tocado 100ms depois)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1046.5, ctx.currentTime + 0.10);
    gain2.gain.setValueAtTime(0.12, ctx.currentTime + 0.10);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    
    osc2.start(ctx.currentTime + 0.10);
    osc2.stop(ctx.currentTime + 0.22);
  } catch (e) {
    console.error('Falha ao reproduzir áudio de notificação:', e);
  }
}

/**
 * Geração sintética do som clássico de envio de mensagem (um bipe agudo rápido ascendente)
 * que simula perfeitamente o som de clique/envio do WhatsApp Web.
 */
export function playMessageSentSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    // WhatsApp Web sent: modulação de frequência rápida de grave para agudo
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1150, ctx.currentTime + 0.04);
    
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
  } catch (e) {
    console.error('Falha ao reproduzir áudio de envio:', e);
  }
}
