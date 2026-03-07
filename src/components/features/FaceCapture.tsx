import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, CheckCircle2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWebcam } from '@/hooks/useWebcam';
import { loadModels, detectFace, capturePhoto, drawDetection } from '@/lib/faceApi';
import ScanOverlay from './ScanOverlay';
import { DETECTION_INTERVAL_MS } from '@/constants/config';

interface CapturePosition {
  id: string;
  label: string;
  instruction: string;
  icon: string;
}

const POSITIONS: CapturePosition[] = [
  { id: 'front', label: 'Frontal', instruction: 'Olhe diretamente para a câmera', icon: '🙂' },
  { id: 'left', label: 'Esquerda', instruction: 'Vire levemente o rosto para a esquerda', icon: '👈' },
  { id: 'right', label: 'Direita', instruction: 'Vire levemente o rosto para a direita', icon: '👉' },
  { id: 'up', label: 'Inclinado', instruction: 'Incline levemente a cabeça para cima', icon: '👆' },
];

const MIN_CAPTURES = 4;
const STABLE_FRAMES_REQUIRED = 5; // ~2.5s of stable detection at 500ms intervals
const COUNTDOWN_SECONDS = 3;

interface CapturedData {
  positionId: string;
  photo: string;
  descriptor: number[];
}

interface FaceCaptureProps {
  onCapture: (photo: string, descriptor: number[], allDescriptors: number[][], allPhotos: string[]) => void;
  onCancel: () => void;
}

export default function FaceCapture({ onCapture, onCancel }: FaceCaptureProps) {
  const { videoRef, isActive, isLoading: camLoading, start, stop } = useWebcam();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoCaptureRef = useRef(false);

  const [modelStatus, setModelStatus] = useState<string>('Iniciando...');
  const [modelsReady, setModelsReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [lastDescriptor, setLastDescriptor] = useState<Float32Array | null>(null);
  const [stableCount, setStableCount] = useState(0);

  const [currentStep, setCurrentStep] = useState(0);
  const [captures, setCaptures] = useState<CapturedData[]>([]);
  const [captureFlash, setCaptureFlash] = useState(false);

  // Countdown state
  const [countdown, setCountdown] = useState<number | null>(null);
  const [countdownActive, setCountdownActive] = useState(false);

  // Transition pause between captures
  const [transitioning, setTransitioning] = useState(false);

  const currentPosition = POSITIONS[currentStep];
  const allCaptured = captures.length >= MIN_CAPTURES;

  // Load models and start camera
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadModels((stage) => {
          if (!cancelled) setModelStatus(stage);
        });
        if (!cancelled) {
          setModelsReady(true);
          await start();
        }
      } catch (err) {
        console.error('Erro ao carregar modelos:', err);
        if (!cancelled) setModelStatus('Erro ao carregar modelos');
      }
    })();
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  // Face detection loop
  const runDetection = useCallback(async () => {
    if (!videoRef.current || !modelsReady || !isActive) return;

    try {
      const result = await detectFace(videoRef.current);

      if (result) {
        setFaceDetected(true);
        setLastDescriptor(result.descriptor);
        setStableCount((prev) => prev + 1);

        if (canvasRef.current && videoRef.current) {
          drawDetection(canvasRef.current, videoRef.current, result, false);
        }
      } else {
        setFaceDetected(false);
        setLastDescriptor(null);
        setStableCount(0);
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
    } catch (err) {
      console.error('Erro na detecção:', err);
    }
  }, [modelsReady, isActive, videoRef]);

  useEffect(() => {
    if (!modelsReady || !isActive) return;
    const loop = () => {
      runDetection();
      intervalRef.current = setTimeout(loop, DETECTION_INTERVAL_MS);
    };
    loop();
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [modelsReady, isActive, runDetection]);

  // Auto-capture: start countdown when face is stable enough
  useEffect(() => {
    if (allCaptured || transitioning || countdownActive) return;

    const isStable = stableCount >= STABLE_FRAMES_REQUIRED && faceDetected && lastDescriptor;

    if (isStable && !autoCaptureRef.current) {
      autoCaptureRef.current = true;
      setCountdownActive(true);
      setCountdown(COUNTDOWN_SECONDS);

      let remaining = COUNTDOWN_SECONDS;
      countdownRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          // Time to capture
          if (countdownRef.current) clearInterval(countdownRef.current);
          countdownRef.current = null;
          setCountdown(null);
          setCountdownActive(false);
          // Trigger auto-capture
          performCapture();
        } else {
          setCountdown(remaining);
        }
      }, 1000);
    }

    // If face lost during countdown, cancel
    if (!faceDetected && countdownActive) {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      setCountdown(null);
      setCountdownActive(false);
      autoCaptureRef.current = false;
    }

    return () => {};
  }, [stableCount, faceDetected, allCaptured, transitioning, countdownActive, lastDescriptor]);

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const performCapture = useCallback(() => {
    if (!videoRef.current || !lastDescriptor || !currentPosition) return;

    const photo = capturePhoto(videoRef.current);
    const descriptorArray = Array.from(lastDescriptor);

    const newCapture: CapturedData = {
      positionId: currentPosition.id,
      photo,
      descriptor: descriptorArray,
    };

    setCaptures((prev) => {
      const updated = [...prev, newCapture];

      // If all captured, auto-finish after a brief delay
      if (updated.length >= MIN_CAPTURES) {
        setTimeout(() => {
          const allDescriptors = updated.map((c) => c.descriptor);
          const allPhotos = updated.map((c) => c.photo);
          stop();
          onCapture(updated[0].photo, updated[0].descriptor, allDescriptors, allPhotos);
        }, 1500);
      }

      return updated;
    });

    // Flash effect
    setCaptureFlash(true);
    setTimeout(() => setCaptureFlash(false), 400);

    // Reset for next position
    setStableCount(0);
    setFaceDetected(false);
    autoCaptureRef.current = false;

    // Transition to next step with a brief pause
    if (currentStep < POSITIONS.length - 1) {
      setTransitioning(true);
      setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
        setTransitioning(false);
      }, 1200);
    }
  }, [videoRef, lastDescriptor, currentPosition, currentStep, stop, onCapture]);

  const handleRecaptureAll = () => {
    setCaptures([]);
    setCurrentStep(0);
    setStableCount(0);
    setFaceDetected(false);
    setCountdown(null);
    setCountdownActive(false);
    autoCaptureRef.current = false;
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  const handleCancel = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    stop();
    onCancel();
  };

  const scanStatus: 'idle' | 'scanning' | 'detected' = !isActive
    ? 'idle'
    : !modelsReady
      ? 'scanning'
      : faceDetected
        ? 'detected'
        : 'scanning';

  // Calculate progress ring for countdown
  const countdownProgress = countdown !== null ? ((COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      <div className="flex items-center gap-1">
        {POSITIONS.map((pos, i) => {
          const captured = i < captures.length;
          const active = i === currentStep && !allCaptured;
          const isCapturing = active && countdownActive;
          return (
            <div key={pos.id} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`relative flex size-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-500 ${
                  captured
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400 scale-95'
                    : isCapturing
                      ? 'border-amber-400 bg-amber-400/10 text-amber-400'
                      : active
                        ? 'border-cyan-400 bg-cyan-400/10 text-cyan-400 animate-pulse'
                        : 'border-slate-700 bg-slate-800/50 text-slate-600'
                }`}
              >
                {captured ? (
                  <CheckCircle2 className="size-5 text-emerald-400" />
                ) : isCapturing ? (
                  <span className="text-base font-bold text-amber-400">{countdown}</span>
                ) : (
                  <span className="text-base">{pos.icon}</span>
                )}
                {/* Progress ring during countdown */}
                {isCapturing && (
                  <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 40 40">
                    <circle
                      cx="20" cy="20" r="18"
                      fill="none" stroke="rgba(251,191,36,0.3)" strokeWidth="2"
                    />
                    <circle
                      cx="20" cy="20" r="18"
                      fill="none" stroke="#fbbf24" strokeWidth="2.5"
                      strokeDasharray={`${2 * Math.PI * 18}`}
                      strokeDashoffset={`${2 * Math.PI * 18 * (1 - countdownProgress / 100)}`}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-linear"
                    />
                  </svg>
                )}
              </div>
              <span className={`text-[10px] font-medium transition-colors ${
                captured ? 'text-emerald-400' : active ? 'text-cyan-400' : 'text-slate-600'
              }`}>
                {pos.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Current position instruction */}
      {!allCaptured && currentPosition && (
        <div className={`rounded-lg border px-3 py-3 text-center transition-all duration-500 ${
          transitioning
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : countdownActive
              ? 'border-amber-400/30 bg-amber-400/5'
              : 'border-cyan-500/20 bg-cyan-500/5'
        }`}>
          {transitioning ? (
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-400">
                Capturado! Prepare-se para a próxima posição...
              </p>
            </div>
          ) : (
            <>
              <p className={`text-sm font-semibold ${countdownActive ? 'text-amber-400' : 'text-cyan-400'}`}>
                {countdownActive
                  ? `Capturando em ${countdown}...`
                  : `Posição ${currentStep + 1}/${POSITIONS.length}: ${currentPosition.label}`}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {countdownActive
                  ? 'Mantenha a posição, não se mova!'
                  : currentPosition.instruction}
              </p>
              {!countdownActive && !faceDetected && (
                <p className="mt-1.5 text-[11px] text-slate-500">
                  A captura será automática ao detectar seu rosto estável
                </p>
              )}
              {faceDetected && !countdownActive && (
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  <div className="flex gap-0.5">
                    {Array.from({ length: STABLE_FRAMES_REQUIRED }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 w-4 rounded-full transition-all duration-300 ${
                          i < stableCount
                            ? 'bg-cyan-400'
                            : 'bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-500 ml-1">
                    Estabilizando...
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Camera view */}
      {!allCaptured && (
        <div className="relative overflow-hidden rounded-lg bg-black aspect-[4/3]">
          <video
            ref={videoRef}
            className="size-full object-cover"
            muted
            playsInline
            autoPlay
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 size-full"
          />
          <ScanOverlay
            status={scanStatus}
            label={
              !modelsReady
                ? modelStatus
                : countdownActive
                  ? `Capturando ${currentPosition?.label} em ${countdown}...`
                  : transitioning
                    ? '✓ Captura realizada!'
                    : faceDetected
                      ? stableCount >= STABLE_FRAMES_REQUIRED
                        ? 'Rosto estável — capturando automaticamente...'
                        : 'Mantenha a posição...'
                      : undefined
            }
          />

          {/* Countdown overlay */}
          {countdownActive && countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative flex items-center justify-center">
                {/* Pulsing ring */}
                <div className="absolute size-28 rounded-full border-4 border-amber-400/40 animate-ping" />
                <div className="relative flex size-24 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm border-2 border-amber-400">
                  <span className="text-5xl font-bold text-amber-400 tabular-nums" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    {countdown}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Capture flash */}
          {captureFlash && (
            <div className="absolute inset-0 bg-white/40 pointer-events-none transition-opacity duration-300" />
          )}

          {/* Transition success overlay */}
          {transitioning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex size-20 items-center justify-center rounded-full bg-emerald-500/20 backdrop-blur-sm border border-emerald-500/40">
                <CheckCircle2 className="size-10 text-emerald-400" />
              </div>
            </div>
          )}

          {camLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          )}

          {/* Position guide overlay */}
          {!transitioning && !countdownActive && currentPosition && faceDetected && (
            <div className="absolute top-3 inset-x-3 flex justify-center pointer-events-none">
              <div className="rounded-lg bg-black/60 backdrop-blur-sm px-3 py-1.5 flex items-center gap-2">
                <span className="text-lg">{currentPosition.icon}</span>
                <span className="text-xs font-medium text-white/80">{currentPosition.instruction}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Captured thumbnails */}
      {captures.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {allCaptured ? '✓ Todas as posições capturadas — salvando...' : `${captures.length}/${MIN_CAPTURES} capturas realizadas`}
          </p>
          <div className="grid grid-cols-4 gap-2">
            {captures.map((cap, i) => {
              const pos = POSITIONS[i];
              return (
                <div key={cap.positionId} className="relative">
                  <img
                    src={cap.photo}
                    alt={pos?.label || `Captura ${i + 1}`}
                    className="aspect-square w-full rounded-lg border border-emerald-500/30 object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 rounded-b-lg bg-black/70 px-1 py-0.5 text-center">
                    <span className="text-[9px] font-medium text-emerald-400">
                      ✓ {pos?.label}
                    </span>
                  </div>
                </div>
              );
            })}
            {/* Remaining placeholders */}
            {!allCaptured && Array.from({ length: POSITIONS.length - captures.length }).map((_, i) => {
              const pos = POSITIONS[captures.length + i];
              const isNext = i === 0;
              return (
                <div
                  key={`placeholder-${i}`}
                  className={`aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-0.5 transition-all ${
                    isNext ? 'border-cyan-500/30 bg-cyan-500/5 animate-pulse' : 'border-slate-700 bg-slate-800/20'
                  }`}
                >
                  <span className="text-sm">{pos?.icon}</span>
                  <span className={`text-[9px] ${isNext ? 'text-cyan-400' : 'text-slate-600'}`}>
                    {pos?.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All captured success message */}
      {allCaptured && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Loader2 className="size-4 animate-spin text-emerald-400" />
            <p className="text-sm font-semibold text-emerald-400">
              Processando capturas...
            </p>
          </div>
          <p className="text-xs text-slate-400">
            As {MIN_CAPTURES} posições foram capturadas automaticamente.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {captures.length > 0 && !allCaptured && (
          <Button
            variant="outline"
            onClick={handleRecaptureAll}
            className="gap-2 border-slate-700 text-slate-400"
          >
            <RotateCcw className="size-4" />
            Recomeçar
          </Button>
        )}
        <Button
          variant="outline"
          onClick={handleCancel}
          className="flex-1 border-slate-700 text-slate-400"
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
