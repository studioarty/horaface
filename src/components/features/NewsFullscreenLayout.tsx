import React, { useState, useEffect } from 'react';
import type { NewsItem } from '@/hooks/useKioskWidgets';
import { Newspaper } from 'lucide-react';

interface NewsFullscreenLayoutProps {
    layout: string;
    news: NewsItem[];
    isActive: boolean;
    isSidebar?: boolean;
}

export function NewsFullscreenLayout({ layout, news, isActive, isSidebar }: NewsFullscreenLayoutProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Auto-slide interno para layouts que necessitam (3d, cards)
    useEffect(() => {
        if (!isActive || news.length === 0) return;

        // Alterna a notícia central a cada 5 segundos
        const timer = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % news.length);
        }, 5000);

        return () => clearInterval(timer);
    }, [isActive, news.length]);

    if (news.length === 0) return null;

    // Filtrar notícias que tenham alguma imagem utilizável para os layouts mais ricos
    const validNews = news.slice(0, 10); // Limitar para performance
    const currentNews = validNews[currentIndex];

    const renderGrid = () => {
        const gridItems = validNews.slice(0, 4); // Pega as 4 primeiras
        return (
            <div className="w-full h-full flex flex-col pt-32 pb-24 px-12 bg-[#090b10] z-0">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                    <Newspaper className="text-cyan-500 size-8" /> Plantão de Notícias
                </h2>
                <div className="grid grid-cols-2 grid-rows-2 gap-6 flex-1 h-full">
                    {gridItems.map((item, i) => (
                        <div key={item.id + i} className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">
                            {item.image ? (
                                <img src={item.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-1000" />
                            ) : (
                                <div className="absolute inset-0 w-full h-full bg-slate-900" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                            <div className="absolute bottom-0 left-0 right-0 p-8">
                                <span className={`inline-block px-3 py-1 rounded bg-black/60 backdrop-blur-md text-sm font-bold border border-white/10 mb-3 ${item.color}`}>
                                    {item.source}
                                </span>
                                <h3 className="text-2xl font-bold text-white drop-shadow-lg leading-tight line-clamp-3">{item.title}</h3>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderCards = () => {
        return (
            <div className="w-full h-full flex items-center justify-center pt-20 pb-12 bg-gradient-to-br from-slate-900 to-black z-0 overflow-hidden relative">
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                    {currentNews?.image && (
                        <img src={currentNews.image} className="w-full h-full object-cover blur-2xl scale-125" alt="" />
                    )}
                </div>

                <div className="relative w-[80%] max-w-5xl h-[65vh] flex z-10">
                    {validNews.map((item, i) => {
                        const isCenter = i === currentIndex;
                        const isLeft = i === (currentIndex - 1 + validNews.length) % validNews.length;
                        const isRight = i === (currentIndex + 1) % validNews.length;

                        let transform = 'translateX(100vw) scale(0.8) opacity-0';
                        let zIndex = 0;

                        if (isCenter) {
                            transform = 'translateX(0) scale(1) opacity-100 rotate-0';
                            zIndex = 30;
                        } else if (isLeft) {
                            transform = 'translateX(-60%) scale(0.8) opacity-40 -rotate-6';
                            zIndex = 20;
                        } else if (isRight) {
                            transform = 'translateX(60%) scale(0.8) opacity-40 rotate-6';
                            zIndex = 20;
                        }

                        return (
                            <div
                                key={item.id + i}
                                className="absolute inset-0 transition-all duration-1000 ease-out origin-bottom flex justify-center"
                                style={{ transform, zIndex, opacity: transform.includes('opacity-0') ? 0 : 1 }}
                            >
                                <div className="w-full h-full bg-slate-900 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10 flex flex-col relative">
                                    <div className="h-[60%] w-full relative">
                                        {item.image ? (
                                            <img src={item.image} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                                <Newspaper className="size-24 text-slate-700" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                                    </div>
                                    <div className="flex-1 p-8 sm:p-12 flex flex-col justify-center bg-slate-900 relative z-10">
                                        <span className={`inline-block self-start px-4 py-1.5 rounded-full bg-slate-800 text-sm font-bold tracking-widest uppercase mb-4 shadow-lg ${item.color}`}>
                                            {item.source}
                                        </span>
                                        <h3 className="text-3xl sm:text-5xl font-bold text-white leading-tight drop-shadow-md">{item.title}</h3>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        );
    };

    const render3DCarousel = () => {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center pt-10 pb-20 bg-[#050505] z-0 relative perspective-[1200px] overflow-hidden">
                {/* Background Dinâmico e Desfocado */}
                {currentNews?.image && (
                    <div className="absolute inset-0 z-0">
                        <img src={currentNews.image} className="w-full h-full object-cover opacity-30 blur-[60px] scale-110 transition-all duration-1000" alt="" />
                        <div className="absolute inset-0 bg-black/60" />
                    </div>
                )}

                <div className="absolute top-16 left-16 z-20 flex items-center gap-4 animate-fade-down">
                    <div className="size-12 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center shadow-2xl">
                        <Newspaper className="text-white size-6" />
                    </div>
                    <div>
                        <h2 className="text-white font-bold text-2xl tracking-widest uppercase">Radar Global</h2>
                        <p className="text-cyan-400 font-mono text-xs">ATUALIZAÇÃO EM TEMPO REAL</p>
                    </div>
                </div>

                <div className="relative w-full h-[60vh] flex items-center justify-center z-10 transform-style-3d mt-10">
                    {validNews.map((item, i) => {
                        const diff = (i - currentIndex + validNews.length) % validNews.length;
                        // Lógica Carrossel: Mostrar 5 itens no arranjo circular (0 central, 1 direita, 2 mais direita / 4 esquerda, 3 esq profunda)
                        let offsetZ = -1000;
                        let offsetX = 0;
                        let rotateY = 0;
                        let opacity = 0;
                        let blur = 'blur(10px)';

                        if (diff === 0) {
                            offsetZ = 0;
                            offsetX = 0;
                            rotateY = 0;
                            opacity = 1;
                            blur = 'blur(0px)';
                        } else if (diff === 1 || diff === validNews.length - 1) {
                            const sign = diff === 1 ? 1 : -1;
                            offsetX = 45 * sign;
                            offsetZ = -300;
                            rotateY = -35 * sign;
                            opacity = 0.6;
                            blur = 'blur(2px)';
                        } else if (diff === 2 || diff === validNews.length - 2) {
                            const sign = diff === 2 ? 1 : -1;
                            offsetX = 70 * sign;
                            offsetZ = -600;
                            rotateY = -45 * sign;
                            opacity = 0.2;
                            blur = 'blur(6px)';
                        }

                        return (
                            <div
                                key={item.id + i}
                                className="absolute w-[80%] max-w-4xl h-full flex transition-all duration-[1200ms] ease-[cubic-bezier(0.25,1,0.5,1)] origin-center"
                                style={{
                                    transform: `translateX(${offsetX}%) translateZ(${offsetZ}px) rotateY(${rotateY}deg)`,
                                    opacity,
                                    filter: blur,
                                    zIndex: 100 - Math.abs(diff === validNews.length - 1 ? 1 : diff)
                                }}
                            >
                                <div className="w-full h-full bg-[#0a0f18] rounded-[2rem] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.9)] border border-white/5 relative flex">

                                    <div className="w-[45%] h-full relative">
                                        {item.image ? (
                                            <img src={item.image} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-slate-800" />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0a0f18]" />
                                    </div>

                                    <div className="w-[55%] h-full flex flex-col justify-center p-10 pr-16 relative">
                                        <div className={`absolute top-10 right-10 flex items-center gap-2 ${item.color}`}>
                                            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                                            <span className="text-sm font-bold uppercase tracking-widest">{item.source}</span>
                                        </div>
                                        <h3 className="text-4xl lg:text-5xl font-bold text-white leading-[1.1] drop-shadow-lg mb-6">{item.title}</h3>
                                        <div className="h-1 w-20 bg-gradient-to-r from-cyan-500 to-transparent rounded-full" />
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        );
    };

    const renderSidebar = () => {
        return (
            <div className="w-full h-full bg-[#050505] p-6 flex flex-col pt-10 overflow-hidden relative z-0">
                <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-900 to-black opacity-80 z-0" />
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3 relative z-10 uppercase tracking-widest border-b border-white/10 pb-4">
                    <Newspaper className="text-cyan-500 size-5" /> Notícias
                </h2>
                <div className="flex-1 flex flex-col gap-6 overflow-hidden relative z-10">
                    {validNews.slice(0, 3).map((item, i) => (
                        <div key={item.id + i} className="group relative rounded-xl overflow-hidden shadow-lg border border-white/5 bg-slate-900/50 shrink-0 animate-fade-in block" style={{ animationDelay: `${i * 150}ms` }}>
                            {item.image && (
                                <div className="h-32 w-full relative">
                                    <img src={item.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                                </div>
                            )}
                            <div className="p-4 relative">
                                <span className={`inline-block px-2 py-0.5 rounded bg-black/60 text-[10px] font-bold border border-white/5 mb-2 uppercase ${item.color}`}>
                                    {item.source}
                                </span>
                                <h3 className="text-sm font-semibold text-white leading-snug line-clamp-3">{item.title}</h3>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    if (isSidebar) return renderSidebar();

    switch (layout) {
        case 'grid': return renderGrid();
        case 'cards': return renderCards();
        case '3d': return render3DCarousel();
        default: return null;
    }
}
