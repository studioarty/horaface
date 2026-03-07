import { useRef, useState, useCallback, useEffect } from "react";

interface UseWebcamReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
}

export function useWebcam(): UseWebcamReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activeRef = useRef(false);
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    console.log("useWebcam: stop() chamado");
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log("useWebcam: track parada:", track.kind, track.readyState);
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load(); // Reset the video element completely
    }
    activeRef.current = false;
    setIsActive(false);
  }, []);

  const start = useCallback(async () => {
    // If already active with a live stream, skip
    if (activeRef.current && streamRef.current) {
      const tracks = streamRef.current.getTracks();
      const allLive = tracks.length > 0 && tracks.every((t) => t.readyState === "live");
      if (allLive) {
        console.log("useWebcam: já ativa com stream live, skip");
        return;
      }
    }

    console.log("useWebcam: start() — solicitando câmera...");
    setIsLoading(true);
    setError(null);

    // Stop any existing stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    activeRef.current = false;
    setIsActive(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      console.log("useWebcam: stream obtido, tracks:", stream.getTracks().length);
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        console.error("useWebcam: elemento <video> não encontrado no DOM");
        setError("Elemento de vídeo não disponível. Tente recarregar.");
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setIsLoading(false);
        return;
      }

      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      // Wait for the video metadata to load
      await new Promise<void>((resolve, reject) => {
        // If metadata is already loaded
        if (video.readyState >= 1) {
          console.log("useWebcam: metadata já carregada");
          resolve();
          return;
        }

        const timeoutId = setTimeout(() => {
          video.removeEventListener("loadedmetadata", onLoaded);
          video.removeEventListener("error", onError);
          reject(new Error("Timeout aguardando metadata do vídeo"));
        }, 10000);

        const onLoaded = () => {
          clearTimeout(timeoutId);
          video.removeEventListener("loadedmetadata", onLoaded);
          video.removeEventListener("error", onError);
          console.log("useWebcam: loadedmetadata disparado");
          resolve();
        };

        const onError = () => {
          clearTimeout(timeoutId);
          video.removeEventListener("loadedmetadata", onLoaded);
          video.removeEventListener("error", onError);
          reject(new Error("Erro ao carregar stream de vídeo"));
        };

        video.addEventListener("loadedmetadata", onLoaded);
        video.addEventListener("error", onError);
      });

      await video.play();
      activeRef.current = true;
      setIsActive(true);
      console.log("useWebcam: câmera ativa, video playing, size:", video.videoWidth, "x", video.videoHeight);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("useWebcam: erro ao acessar câmera:", message);

      // Clean up on error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      activeRef.current = false;
      setIsActive(false);

      if (message.includes("NotAllowedError") || message.includes("Permission")) {
        setError("Permissão da câmera negada. Permita o acesso nas configurações do navegador.");
      } else if (message.includes("NotFoundError") || message.includes("DevicesNotFound")) {
        setError("Nenhuma câmera encontrada no dispositivo.");
      } else if (message.includes("NotReadableError")) {
        setError("Câmera em uso por outro aplicativo.");
      } else if (message.includes("Timeout")) {
        setError("Timeout ao iniciar câmera. Tente novamente.");
      } else {
        setError("Não foi possível acessar a câmera. Verifique as permissões.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies — uses refs for state checks

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      console.log("useWebcam: cleanup on unmount");
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      activeRef.current = false;
    };
  }, []);

  return {
    videoRef: videoRef as React.RefObject<HTMLVideoElement>,
    isActive,
    isLoading,
    error,
    start,
    stop,
  };
}
