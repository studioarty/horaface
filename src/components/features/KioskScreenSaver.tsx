import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ShieldCheck, CloudOff, CloudLightning } from 'lucide-react';
import { fetchKioskSettings, updateKioskMonitorDB, type KioskSettings } from '@/lib/api';
import type { KioskLibraryItem } from '@/types';
import { useKioskWidgets } from '@/hooks/useKioskWidgets';
import { NewsTicker } from './NewsTicker';
import { NewsFullscreenLayout } from './NewsFullscreenLayout';

interface KioskScreenSaverProps {
  onWake: () => void;
  kioskId?: string;
}

const CACHE_NAME = 'ponto-kiosk-media-v1';

export default function KioskScreenSaver({ onWake, kioskId = 'default' }: KioskScreenSaverProps) {
  const [settings, setSettings] = useState<KioskSettings>({
    library: [],
    campaigns: [],
    idleTimeoutSec: 30,
    slideIntervalSec: 8,
    showClock: true,
    message: 'Toque na tela para registrar suas horas',
    minCheckoutMinutes: 15,
    newsTickerSpeed: 35,
    enableNewsTicker: true,
    newsTickerUrl: 'https://g1.globo.com/rss/g1/',
    rssLayout: '3d',
    rssSources: ['g1'],
    liteTargetKiosks: [],
  });

  const isLite = useMemo(() => {
    if (!settings.liteTargetKiosks) return false;
    return settings.liteTargetKiosks.includes(kioskId);
  }, [settings.liteTargetKiosks, kioskId]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const [sidebarIndex, setSidebarIndex] = useState(0);
  const [sidebarFadeIn, setSidebarFadeIn] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [touchPulse, setTouchPulse] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [localMapUrl, setLocalMapUrl] = useState<Record<string, string>>({}); // id -> blobUrl

  const { news, weather } = useKioskWidgets();

  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  // 1. Monitoramento de Conexão
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2. Sync Global Settings (Desconsidera falhas se offline, mantendo ultimo estado)
  useEffect(() => {
    const fetchDB = async () => {
      try {
        const s = await fetchKioskSettings();
        setSettings(s);
      } catch (err) {
        console.warn("Kiosk rodando em cache devido a erro de rede", err);
      }
    };

    fetchDB();
    const iv = setInterval(fetchDB, 3000); // Polling agressivo para 3s (Tempo Real)
    return () => clearInterval(iv);
  }, []);

  // 3. Heartbeat (apenas tenta, falha silensiosa se offline)
  useEffect(() => {
    if (isOffline) return;
    const hb = setInterval(() => {
      updateKioskMonitorDB(kioskId, { kioskOnline: true, lastHeartbeat: new Date().toISOString() }).catch(() => { });
    }, 10000);
    return () => clearInterval(hb);
  }, [kioskId, isOffline]);

  // 4. Temporização & Pulse
  useEffect(() => {
    const iv = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => {
    const iv = setInterval(() => setTouchPulse((p) => !p), 2000);
    return () => clearInterval(iv);
  }, []);

  // ==============================================
  // 5. MOTOR DE REGRAS LÓGICAS (Campaign Builder Zonal)
  // ==============================================
  const activeSignageConfig = useMemo(() => {
    const currMinute = currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const currDay = currentTime.getDay();
    const now = new Date();

    const activeCamp = (settings.campaigns || []).filter(c => {
      if (c.status !== 'active') return false;

      if (c.targetKiosks && c.targetKiosks.length > 0) {
        if (!c.targetKiosks.includes(kioskId)) return false;
      }

      if (c.executionType === 'scheduled') {
        if (c.startDate && new Date(c.startDate) > now) return false;
        if (c.endDate && new Date(c.endDate) < now) return false;
      }

      const s = c.scheduleRules;
      if (s) {
        if (!s.days.includes(currDay)) return false;
        if (currMinute < s.startTime || currMinute > s.endTime) return false;
      }
      return true;
    });

    const mainMediaIds = Array.from(new Set(activeCamp.flatMap(c => c.mediaItems)));
    const sidebarMediaIds = Array.from(new Set(activeCamp.flatMap(c => c.sidebarItems || [])));
    const activeLayout = activeCamp.find(c => c.layoutType && c.layoutType !== 'fullscreen')?.layoutType || 'fullscreen';

    const mainPlaylist: KioskLibraryItem[] = [];
    mainMediaIds.forEach(id => {
      const hit = settings.library?.find(l => l.id === id);
      if (hit) mainPlaylist.push(hit);
    });

    const sidebarPlaylist: KioskLibraryItem[] = [];
    sidebarMediaIds.forEach(id => {
      const hit = settings.library?.find(l => l.id === id);
      if (hit) sidebarPlaylist.push(hit);
    });

    return { mainPlaylist, sidebarPlaylist, activeLayout };
  }, [settings.campaigns, settings.library, currentTime.getMinutes(), currentTime.getDay(), kioskId]);


  // ==============================================
  // 6. MOTOR OFFLINE SYNC (Cache API Background)
  // ==============================================
  useEffect(() => {
    const allActiveMedia = [...activeSignageConfig.mainPlaylist, ...activeSignageConfig.sidebarPlaylist];
    if (allActiveMedia.length === 0) return;

    let isMounted = true;
    const syncCache = async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        const newLocalMap: Record<string, string> = { ...localMapUrl };
        let hasChanges = false;

        for (const media of allActiveMedia) {
          if (newLocalMap[media.id]) continue;

          const cachedResponse = await cache.match(media.url);
          if (cachedResponse) {
            const blob = await cachedResponse.blob();
            if (isMounted) {
              newLocalMap[media.id] = URL.createObjectURL(blob);
              hasChanges = true;
            }
          } else if (!isOffline && media.type === 'video' || media.type === 'image') {
            try {
              await cache.add(media.url);
              const freshResponse = await cache.match(media.url);
              if (freshResponse && isMounted) {
                const blob = await freshResponse.blob();
                newLocalMap[media.id] = URL.createObjectURL(blob);
                hasChanges = true;
              }
            } catch (fetchErr) {
              if (isMounted) {
                newLocalMap[media.id] = media.url;
                hasChanges = true;
              }
            }
          } else {
            if (isMounted) {
              newLocalMap[media.id] = media.url;
              hasChanges = true;
            }
          }
        }

        if (hasChanges && isMounted) {
          setLocalMapUrl(newLocalMap);
        }

      } catch (err) {
        console.error("Cache Engine Error:", err);
      }
    };

    syncCache();
    return () => { isMounted = false; };
  }, [activeSignageConfig, isOffline]);


  // ==============================================
  // 6.b ZONAL BUILDER
  // ==============================================
  const playableMedia = useMemo(() => {
    const list: any[] = activeSignageConfig.mainPlaylist.filter(m => localMapUrl[m.id]);

    const rssTargets = settings.rssTargetKiosks || [];
    const isRssAllowed = rssTargets.length === 0 || rssTargets.includes(kioskId);

    // Se o layout for Tela Cheia com a TV ligada no Ticker, empilha a tela de News
    if (activeSignageConfig.activeLayout === 'fullscreen' && settings.enableNewsTicker && isRssAllowed && settings.rssLayout && settings.rssLayout !== 'ticker-only' && news.length > 0) {
      list.push({
        id: 'rss-fullscreen-slide',
        type: 'rss',
        url: '',
        label: 'Plantão de Notícias',
        durationSec: 15
      });
    }

    return list;
  }, [activeSignageConfig.mainPlaylist, activeSignageConfig.activeLayout, localMapUrl, settings.enableNewsTicker, settings.rssLayout, settings.rssTargetKiosks, news, kioskId]);

  const playableSidebar = useMemo(() => {
    return activeSignageConfig.sidebarPlaylist.filter(m => localMapUrl[m.id]);
  }, [activeSignageConfig.sidebarPlaylist, localMapUrl]);

  // ==============================================
  // 7. LOOPS DE REPRODUÇÃO - MAIN ZONE
  // ==============================================
  useEffect(() => {
    if (currentIndex >= playableMedia.length && playableMedia.length > 0) {
      setCurrentIndex(0);
    }
  }, [playableMedia.length, currentIndex]);

  const currentMedia = playableMedia[currentIndex];

  useEffect(() => {
    if (!currentMedia || playableMedia.length <= 1) return;

    // Vídeos aguardam o evento onEnded Nativo. Imagens/Gifs usam timer configurado/padrão.
    if (currentMedia.type === 'video' && !currentMedia.durationSec) return;

    const playDuration = (currentMedia.durationSec || settings.slideIntervalSec) * 1000;

    const timer = setTimeout(() => {
      setFadeIn(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % playableMedia.length);
        setFadeIn(true);
      }, 1000); // Crossfade 1s
    }, Math.max(playDuration - 1000, 1000));

    return () => clearTimeout(timer);
  }, [currentIndex, currentMedia, playableMedia.length, settings.slideIntervalSec]);

  // Video AutoPlay Manager
  useEffect(() => {
    playableMedia.forEach((m, i) => {
      if (m.type === 'video') {
        const vid = videoRefs.current[`main-${m.id}`];
        if (vid) {
          if (i === currentIndex) {
            vid.currentTime = 0;
            vid.play().catch(e => console.warn('Autoplay video bloqueado/falhou', e));
          } else {
            vid.pause();
          }
        }
      }
    });
  }, [currentIndex, playableMedia, localMapUrl]); // Roda quando o Blob Offline fica pronto tbm

  const handleVideoEnded = useCallback((mediaId: string) => {
    const media = playableMedia.find(m => m.id === mediaId);
    if (!media || media.durationSec || playableMedia.length <= 1) return;

    setFadeIn(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % playableMedia.length);
      setFadeIn(true);
    }, 1000);
  }, [playableMedia]);

  // ==============================================
  // 8. LOOPS DE REPRODUÇÃO - SIDEBAR ZONE
  // ==============================================
  useEffect(() => {
    if (sidebarIndex >= playableSidebar.length && playableSidebar.length > 0) {
      setSidebarIndex(0);
    }
  }, [playableSidebar.length, sidebarIndex]);

  const currentSidebar = playableSidebar[sidebarIndex];

  useEffect(() => {
    if (!currentSidebar || playableSidebar.length <= 1) return;

    if (currentSidebar.type === 'video' && !currentSidebar.durationSec) return;

    const playDuration = (currentSidebar.durationSec || settings.slideIntervalSec) * 1000;

    const timer = setTimeout(() => {
      setSidebarFadeIn(false);
      setTimeout(() => {
        setSidebarIndex((prev) => (prev + 1) % playableSidebar.length);
        setSidebarFadeIn(true);
      }, 1000); 
    }, Math.max(playDuration - 1000, 1000));

    return () => clearTimeout(timer);
  }, [sidebarIndex, currentSidebar, playableSidebar.length, settings.slideIntervalSec]);

  useEffect(() => {
    playableSidebar.forEach((m, i) => {
      if (m.type === 'video') {
        const vid = videoRefs.current[`sidebar-${m.id}`];
        if (vid) {
          if (i === sidebarIndex) {
            vid.currentTime = 0;
            vid.play().catch(e => console.warn('Autoplay sidebar bloqueado', e));
          } else {
            vid.pause();
          }
        }
      }
    });
  }, [sidebarIndex, playableSidebar, localMapUrl]);

  const handleSidebarVideoEnded = useCallback((mediaId: string) => {
    const media = playableSidebar.find(m => m.id === mediaId);
    if (!media || media.durationSec || playableSidebar.length <= 1) return;

    setSidebarFadeIn(false);
    setTimeout(() => {
      setSidebarIndex((prev) => (prev + 1) % playableSidebar.length);
      setSidebarFadeIn(true);
    }, 1000);
  }, [playableSidebar]);

  const handleTouch = useCallback(() => {
    onWake();
  }, [onWake]);



  const renderWidget = (m: KioskLibraryItem | any, isActive: boolean, opacity: number, zIndex: number, loopName: 'main'|'sidebar') => {
    if (m.type === 'rss') {
      return (
        <div key={`${loopName}-${m.id}`} className={`absolute inset-0 overflow-hidden bg-black ${isLite ? '' : 'transition-opacity duration-1000 ease-in-out'}`} style={{ opacity, zIndex }}>
          {isActive && <NewsFullscreenLayout layout={settings.rssLayout} news={news} isActive={isActive} isSidebar={loopName === 'sidebar'} />}
        </div>
      );
    }

    const srcUrl = localMapUrl[m.id] || m.url;

    if (m.type === 'video') {
      return srcUrl ? (
        <video
          key={`${loopName}-${m.id}`}
          ref={(el) => (videoRefs.current[`${loopName}-${m.id}`] = el)}
          src={srcUrl}
          className={`absolute inset-0 w-full h-full object-contain bg-black ${isLite ? '' : 'transition-opacity duration-1000 ease-in-out'}`}
          style={{ opacity, zIndex }}
          muted
          playsInline
          loop={!!m.durationSec || (loopName === 'main' ? playableMedia.length === 1 : playableSidebar.length === 1)}
          onEnded={() => loopName === 'main' ? handleVideoEnded(m.id) : handleSidebarVideoEnded(m.id)}
        />
      ) : <div key={`${loopName}-${m.id}`} />;
    }

    if (m.type === 'youtube') {
      const match = m.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
      const videoId = match ? match[1] : '';
      const ytUrl = `https://www.youtube.com/embed/${videoId}?autoplay=${isActive?1:0}&mute=1&controls=0&loop=1&playlist=${videoId}`;
      return (
        <div key={`${loopName}-${m.id}`} className={`absolute inset-0 bg-black overflow-hidden ${isLite ? '' : 'transition-opacity duration-1000 ease-in-out'}`} style={{ opacity, zIndex }}>
          {isActive && (
            <iframe src={ytUrl} className="w-[120%] h-[120%] -ml-[10%] -mt-[10%] border-none pointer-events-none scale-[1.0]" allow="autoplay; fullscreen" />
          )}
        </div>
      );
    }

    if (m.type === 'iframe') {
      return (
        <div key={`${loopName}-${m.id}`} className={`absolute inset-0 bg-black ${isLite ? '' : 'transition-opacity duration-1000 ease-in-out'}`} style={{ opacity, zIndex }}>
          {isActive && (
            <iframe src={m.url} className="w-full h-full border-none pointer-events-none" allow="autoplay; fullscreen" />
          )}
        </div>
      );
    }

    if (m.type === 'weather') {
      return (
        <div key={`${loopName}-${m.id}`} className={`absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 to-slate-900 ${isLite ? '' : 'transition-opacity duration-1000 ease-in-out'}`} style={{ opacity, zIndex }}>
          {isActive && (
            <div className="flex flex-col items-center animate-fade-up px-8 text-center">
              <CloudLightning className="size-20 sm:size-40 text-blue-400 mb-6 drop-shadow-[0_0_30px_rgba(96,165,250,0.5)]" />
              <h2 className="text-6xl sm:text-8xl font-bold text-white tabular-nums tracking-tighter">{weather?.temperature || '--'}°</h2>
              <p className="text-xl sm:text-3xl text-blue-200 mt-4 font-semibold">{weather?.condition || 'Carregando clima...'}</p>
              <p className="text-sm sm:text-xl text-blue-400/80 mt-2 flex items-center justify-center gap-2">📍 {(!settings.mobileLat && !settings.mobileLng) ? 'Cidade Indisponível' : 'GPS do Quiosque'}</p>
            </div>
          )}
        </div>
      );
    }

    if (m.type === 'clock') {
      return (
        <div key={`${loopName}-${m.id}`} className={`absolute inset-0 flex flex-col items-center justify-center bg-[#030712] ${isLite ? '' : 'transition-opacity duration-1000 ease-in-out'}`} style={{ opacity, zIndex }}>
          {isActive && (
            <div className="flex flex-col items-center animate-fade-in px-4">
              <h1 className="text-[6rem] sm:text-[10rem] font-bold text-white tabular-nums leading-none tracking-tighter drop-shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </h1>
              <p className="text-xl sm:text-4xl text-cyan-400 mt-4 font-mono uppercase tracking-widest text-center">
                {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
              </p>
            </div>
          )}
        </div>
      );
    }

    if (m.type === 'richtext') {
      return (
        <div key={`${loopName}-${m.id}`} className={`absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-tr from-purple-900 via-indigo-900 to-slate-900 p-8 sm:p-20 ${isLite ? '' : 'transition-opacity duration-1000 ease-in-out'}`} style={{ opacity, zIndex }}>
          {isActive && (
             <div className="text-center animate-fade-up max-w-5xl">
                 <h1 className="text-3xl sm:text-5xl font-extrabold text-white leading-relaxed whitespace-pre-wrap drop-shadow-xl" dangerouslySetInnerHTML={{ __html: m.content || m.label }} />
             </div>
          )}
        </div>
      );
    }

    // Standard Image
    return srcUrl ? (
      <div
        key={`${loopName}-${m.id}`}
        className={`absolute inset-0 bg-contain bg-no-repeat bg-center bg-black ${isLite ? '' : 'transition-opacity duration-1000 ease-in-out'}`}
        style={{ backgroundImage: `url(${srcUrl})`, opacity, zIndex }}
      />
    ) : <div key={`${loopName}-${m.id}`} />;
  };

  return (
    <div
      className="fixed inset-0 z-[200] cursor-pointer select-none bg-black overflow-hidden flex"
      onClick={handleTouch}
      onTouchStart={handleTouch}
      role="button"
      tabIndex={0}
      aria-label="Toque para abrir o Aferidor de Horas"
    >
      {/* ========================================================= */}
      {/* ZONE 1: PRIMARY PLAYLIST LAYER                            */}
      {/* ========================================================= */}
      <div className={`relative h-full overflow-hidden ${activeSignageConfig.activeLayout === 'sidebar_right' ? 'w-3/4' : activeSignageConfig.activeLayout === 'split_half' ? 'w-1/2' : 'w-full'}`}>
        {playableMedia.map((m, i) => renderWidget(m, i === currentIndex, i === currentIndex && fadeIn ? 1 : 0, i === currentIndex ? 0 : -1, 'main'))}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/60 z-0 pointer-events-none" />
        {playableMedia.length === 0 && <div className="absolute inset-0 bg-[#030712] z-0 pointer-events-none" />}
      </div>

      {/* ========================================================= */}
      {/* ZONE 2: SIDEBAR PLAYLIST LAYER                            */}
      {/* ========================================================= */}
      {activeSignageConfig.activeLayout !== 'fullscreen' && (
        <div className={`relative h-full overflow-hidden border-l border-slate-800 bg-slate-950 ${activeSignageConfig.activeLayout === 'sidebar_right' ? 'w-1/4' : 'w-1/2'}`}>
          {playableSidebar.map((m, i) => renderWidget(m, i === sidebarIndex, i === sidebarIndex && sidebarFadeIn ? 1 : 0, i === sidebarIndex ? 0 : -1, 'sidebar'))}
          <div className="absolute inset-0 bg-black/40 z-0 pointer-events-none shadow-[inset_10px_0_30px_rgba(0,0,0,0.5)]" />
        </div>
      )}

      {/* Interface Float Layer (Relógios e UI Baseada Na Tela) */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-between p-8 sm:p-12 pb-20 sm:pb-24 pointer-events-none">

        {/* Superior Header Info */}
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex size-10 items-center justify-center rounded-xl border border-cyan-500/20 ${isLite ? 'bg-cyan-900/40' : 'bg-cyan-500/15 backdrop-blur-sm'}`}>
              <ShieldCheck className="size-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-cyan-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>HoraFace</h1>
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/30 truncate max-w-[200px]">Campanhas: {settings.campaigns.length}</p>
            </div>
          </div>

          <div className="flex gap-4">
            {isOffline ? (
              <div className="flex items-center gap-2 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/30">
                <CloudOff className="size-3.5 text-red-400" />
                <span className="font-mono text-xs text-red-400 font-bold tracking-wider">OFFLINE (CACHE MODE)</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="font-mono text-xs text-white/40">Sincronizado</span>
              </div>
            )}
          </div>
        </div>

        {/* Central HUD */}
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-4 mt-10">
            <div
              className={`size-20 sm:size-24 rounded-full border-2 border-dashed flex items-center justify-center transition-all duration-1000 ${touchPulse ? 'border-cyan-400/80 bg-cyan-400/10 shadow-[0_0_30px_rgba(34,211,238,0.2)] scale-110' : 'border-white/30 bg-white/5 scale-100'
                }`}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className={`transition-all duration-1000 ${touchPulse ? 'text-cyan-400' : 'text-white/50'}`}>
                <path d="M12 11V4a1 1 0 0 1 2 0v7h1a1 1 0 0 1 1 1v1.5a6.5 6.5 0 0 1-13 0V14a2 2 0 0 1 2-2h1V8a1 1 0 1 1 2 0v3h1V6a1 1 0 0 1 2 0v5h1Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-lg sm:text-2xl text-white font-medium text-center max-w-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {settings.message}
            </p>
          </div>
        </div>

        {/* Rodapé - Indicador de Playlists e Progress */}
        <div className="flex w-full items-end justify-between">
          <div className={`px-3 py-1.5 rounded flex items-center gap-2 ${isLite ? 'bg-black/80' : 'bg-black/40 backdrop-blur-sm'}`}>
            {currentMedia && (
              <>
                {localMapUrl[currentMedia.id] ? <CloudLightning className="size-3 text-cyan-400" /> : <div className="w-2 h-2 rounded-full bg-slate-500 animate-pulse" />}
                <p className="text-[10px] text-white/50 font-mono tracking-wide">{currentMedia.label}</p>
              </>
            )}
          </div>
          {playableMedia.length > 1 && (
            <div className={`flex gap-2 px-3 py-2 rounded-full ${isLite ? 'bg-black/80' : 'bg-black/40 backdrop-blur-sm'}`}>
              {playableMedia.map((m, i) => (
                <div
                  key={m.id + i}
                  className={`h-1.5 rounded-full ${isLite ? '' : 'transition-all duration-500'} ${i === currentIndex ? 'w-8 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'w-2 bg-white/30'}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Letreiro Deslizante (News/Weather/Clock) */}
      {(() => {
        const rssTargets = settings.rssTargetKiosks || [];
        const isRssAllowed = rssTargets.length === 0 || rssTargets.includes(kioskId);
        if (isRssAllowed) {
          return <NewsTicker news={news} weather={weather} currentTime={currentTime} speed={settings.newsTickerSpeed} />;
        }
        return null;
      })()}
    </div>
  );
}
