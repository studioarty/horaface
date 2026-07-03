import { useState, useEffect, useCallback, useRef } from 'react';
import { ShieldCheck } from 'lucide-react';
import { fetchKioskSettings, updateKioskMonitorDB, type KioskSettings, type KioskImage } from '@/lib/api';

interface KioskScreenSaverProps {
  onWake: () => void;
  kioskId?: string;
}

export default function KioskScreenSaver({ onWake, kioskId = 'default' }: KioskScreenSaverProps) {
  const [settings, setSettings] = useState<KioskSettings>({
    images: [],
    idleTimeoutSec: 30,
    slideIntervalSec: 8,
    showClock: true,
    message: 'Toque na tela para registrar seu ponto',
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [touchPulse, setTouchPulse] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load settings on mount and poll every 15s for image list updates
  useEffect(() => {
    fetchKioskSettings().then(setSettings).catch(console.error);
    const iv = setInterval(() => {
      fetchKioskSettings()
        .then((s) => setSettings(s))
        .catch(console.error);
    }, 15000);
    return () => clearInterval(iv);
  }, []);

  // Continue sending heartbeats while in screensaver mode
  useEffect(() => {
    const hb = setInterval(() => {
      updateKioskMonitorDB(kioskId, {
        kiosk_online: true,
        last_heartbeat: new Date().toISOString(),
      }).catch(() => {});
    }, 10000);
    return () => clearInterval(hb);
  }, [kioskId]);

  const images = settings.images;
  const slideInterval = settings.slideIntervalSec;
  const showClock = settings.showClock;
  const message = settings.message;

  useEffect(() => {
    const iv = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (images.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
        setFadeIn(true);
      }, 800);
    }, slideInterval * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [images.length, slideInterval]);

  useEffect(() => {
    const iv = setInterval(() => setTouchPulse((p) => !p), 2000);
    return () => clearInterval(iv);
  }, []);

  const handleTouch = useCallback(() => {
    onWake();
  }, [onWake]);

  const currentImage = images[currentIndex];

  return (
    <div
      className="fixed inset-0 z-[200] cursor-pointer select-none"
      onClick={handleTouch}
      onTouchStart={handleTouch}
      role="button"
      tabIndex={0}
      aria-label="Toque para abrir o ponto eletrônico"
    >
      {currentImage ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
            style={{ backgroundImage: `url(${currentImage.url})`, opacity: fadeIn ? 1 : 0 }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/60" />
        </>
      ) : (
        <div className="absolute inset-0 bg-[#030712]" />
      )}

      <div className="relative z-10 flex h-full flex-col items-center justify-between p-8 sm:p-12">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-500/15 backdrop-blur-sm border border-cyan-500/20">
              <ShieldCheck className="size-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-cyan-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>PontoFace</h1>
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/30">Quiosque: {kioskId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="font-mono text-xs text-white/40">Online</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6">
          {showClock && (
            <div className="text-center">
              <p
                className="text-7xl sm:text-8xl lg:text-9xl font-bold text-white tabular-nums leading-none"
                style={{ fontFamily: 'Rajdhani, sans-serif', textShadow: '0 0 60px rgba(255,255,255,0.15)' }}
              >
                {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="mt-2 font-mono text-sm sm:text-base text-white/40">
                {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          )}

          <div className="flex flex-col items-center gap-4 mt-4">
            <div
              className={`size-20 sm:size-24 rounded-full border-2 border-dashed flex items-center justify-center transition-all duration-1000 ${
                touchPulse ? 'border-cyan-400/60 bg-cyan-400/5 scale-110' : 'border-white/20 bg-white/5 scale-100'
              }`}
            >
              <svg
                width="40" height="40" viewBox="0 0 24 24" fill="none"
                className={`transition-all duration-1000 ${touchPulse ? 'text-cyan-400/80' : 'text-white/30'}`}
              >
                <path
                  d="M12 11V4a1 1 0 0 1 2 0v7h1a1 1 0 0 1 1 1v1.5a6.5 6.5 0 0 1-13 0V14a2 2 0 0 1 2-2h1V8a1 1 0 1 1 2 0v3h1V6a1 1 0 0 1 2 0v5h1Z"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="text-lg sm:text-xl text-white/70 text-center max-w-md" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {message}
            </p>
          </div>
        </div>

        <div className="flex w-full items-end justify-between">
          {currentImage && <p className="text-xs text-white/20 font-mono">{currentImage.label}</p>}
          {images.length > 1 && (
            <div className="flex gap-1.5">
              {images.map((img, i) => (
                <div
                  key={img.id}
                  className={`h-1 rounded-full transition-all duration-500 ${
                    i === currentIndex ? 'w-6 bg-cyan-400/80' : 'w-1.5 bg-white/20'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
