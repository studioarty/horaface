import React from 'react';
import type { NewsItem, WeatherData } from '@/hooks/useKioskWidgets';

import { useKioskStore } from '@/stores/useKioskStore';

interface NewsTickerProps {
    news: NewsItem[];
    weather: WeatherData | null;
    currentTime: Date;
    speed?: number;
}

export function NewsTicker({ news, weather, currentTime, speed }: NewsTickerProps) {
    const { newsTickerSpeed, liteTargetKiosks } = useKioskStore();
    const rawSpeed = speed ?? newsTickerSpeed ?? 35;
    
    // Ler Variável Lite Localmente
    const kioskIdSync = React.useMemo(() => new URLSearchParams(window.location.search).get('id'), []);
    const isLite = React.useMemo(() => {
        if (!liteTargetKiosks) return false;
        return liteTargetKiosks.includes(kioskIdSync || 'default');
    }, [liteTargetKiosks, kioskIdSync]);
    
    // Variável para Crossfade sem animação horizontal
    const [liteIndex, setLiteIndex] = React.useState(0);
    
    React.useEffect(() => {
        if (!isLite || news.length === 0) return;
        const interval = setInterval(() => {
            setLiteIndex((prev) => (prev + 1) % news.length);
        }, 8000); // Pisca uma notícia a cada 8s
        return () => clearInterval(interval);
    }, [isLite, news.length]);

    // Fator Escalar: Mantém a velocidade visual de leitura constante mesmo com o aumento das fontes
    // O baseline (rawSpeed) foi tunado historicamente para 10 itens do G1.
    const finalSpeed = React.useMemo(() => {
        const factor = Math.max(1, news.length / 10);
        return rawSpeed * factor;
    }, [news.length, rawSpeed]);

    return (
        <div className="absolute bottom-0 left-0 right-0 h-10 sm:h-12 bg-[#030712]/90 backdrop-blur-md border-t border-cyan-500/20 flex items-center z-50 overflow-hidden shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">

            {/* CSS Animado Invisível (Keyframes via Injeção Segura) baseados na instrução do usuário */}
            <style>{`
        @keyframes marquee {
          0% { transform: translateX(100vw); }
          100% { transform: translateX(-100%); }
        }
        .animate-news-marquee {
          display: inline-block;
          white-space: nowrap;
        }
        .lite-crossfade-news {
          animation: fadeinout 8s infinite;
        }
        @keyframes fadeinout {
          0%, 100% { opacity: 0; }
          10%, 90% { opacity: 1; }
        }
        .animate-news-marquee:hover {
          animation-play-state: paused !important;
        }
      `}</style>

            {/* Relógio e Clima (Canto Esquerdo Discreto) */}
            <div className="flex-shrink-0 flex items-center h-full bg-cyan-950/80 px-4 sm:px-6 relative z-10 border-r border-cyan-500/30 shadow-[4px_0_10px_rgba(0,0,0,0.5)]">
                <span className="font-mono text-cyan-400 font-bold text-lg sm:text-xl tabular-nums drop-shadow-md">
                    {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>

                {weather && (
                    <>
                        <div className="w-px h-6 bg-cyan-500/30 mx-4" />
                        <div className="flex items-center gap-2" title={weather.condition}>
                            <span className="text-sm sm:text-base drop-shadow-sm">{weather.icon}</span>
                            <span className="font-mono text-cyan-100 font-medium text-sm sm:text-base">
                                {weather.temperature}°C
                            </span>
                            <span className="font-mono text-cyan-500/70 text-[10px] sm:text-xs hidden lg:block ml-1">
                                {weather.city.toUpperCase()}
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* Ticker de Notícias (Meio e Direita Animado) */}
            <div className="flex-1 overflow-hidden h-full flex items-center relative">
                <div className="absolute left-0 w-8 h-full bg-gradient-to-r from-[#030712]/90 to-transparent z-10 pointer-events-none" />

                {news.length > 0 ? (
                    isLite ? (
                         // LITE MODE: Sem Translação. Apenas uma notícia centralizada que pisca suavemente.
                        <div className="w-full h-full flex items-center justify-center px-8 lite-crossfade-news" key={liteIndex}>
                            <span className="text-white/90 font-medium text-sm sm:text-base tracking-wide flex items-center justify-center text-center line-clamp-1" style={{ fontFamily: 'Arial, sans-serif' }}>
                                <span className={`${news[liteIndex].color || 'text-cyan-400'} font-bold mx-2 shrink-0`}>
                                    {news[liteIndex].source || 'News'}
                                </span>
                                {news[liteIndex].title}
                            </span>
                        </div>
                    ) : (
                        // MODO NORMAL: Letreiro SBT Rotativo Contínuo
                        <div
                            key={finalSpeed}
                            className="animate-news-marquee pl-[100vw] will-change-transform"
                            style={{ animation: `marquee ${finalSpeed}s linear infinite` }}
                        >
                            {news.map((item, i) => (
                                <span key={item.id} className="text-white/80 font-medium text-sm sm:text-base tracking-wide inline-flex items-center" style={{ fontFamily: 'Arial, sans-serif' }}>
                                    <span className={`${item.color || 'text-cyan-400'} font-bold mx-2`}>{item.source || 'News'}</span>
                                    {item.link ? (
                                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-300 hover:underline transition-colors cursor-pointer">
                                            {item.title}
                                        </a>
                                    ) : (
                                        <span>{item.title}</span>
                                    )}
                                    {i < news.length - 1 && <span className="text-emerald-500/30 mx-6">|</span>}
                                </span>
                            ))}
                        </div>
                    )
                ) : (
                    <div className="text-white/30 text-xs font-mono px-6 italic animate-pulse">
                        Sintetizando informações e clima local...
                    </div>
                )}

                <div className="absolute right-0 w-8 h-full bg-gradient-to-l from-[#030712]/90 to-transparent z-10 pointer-events-none" />
            </div>

        </div>
    );
}
