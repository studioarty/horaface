import { MODEL_URL, FACE_MATCH_THRESHOLD } from "@/constants/config";

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;
let faceapi: any = null;

async function getFaceApi(): Promise<any> {
  if (faceapi) return faceapi;

  return new Promise((resolve, reject) => {
    if ((window as any).faceapi) {
      faceapi = (window as any).faceapi;
      resolve(faceapi);
      return;
    }

    const script = document.createElement("script");
    script.src = "/face-api.js";
    script.onload = () => {
      faceapi = (window as any).faceapi;
      if (faceapi) {
        resolve(faceapi);
      } else {
        reject(new Error("face-api.js não disponível após carregar script"));
      }
    };
    script.onerror = () => reject(new Error("Falha ao carregar face-api.js"));
    document.head.appendChild(script);
  });
}

export async function loadModels(
  onProgress?: (stage: string) => void,
): Promise<void> {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      onProgress?.("Carregando biblioteca facial...");
      const api = await getFaceApi();

      onProgress?.("Carregando detector facial...");
      await api.nets.tinyFaceDetector.loadFromUri(MODEL_URL);

      onProgress?.("Carregando marcadores faciais...");
      await api.nets.faceLandmark68Net.loadFromUri(MODEL_URL);

      onProgress?.("Carregando modelo de reconhecimento...");
      await api.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

      modelsLoaded = true;
      onProgress?.("Modelos carregados");
    } catch (err) {
      loadingPromise = null;
      throw err;
    }
  })();

  return loadingPromise;
}

export function areModelsLoaded(): boolean {
  return modelsLoaded;
}

export async function detectFace(
  video: HTMLVideoElement,
  optionsInput?: { isLite?: boolean }
): Promise<any | null> {
  if (!modelsLoaded || !faceapi) return null;

  try {
    // V19 Otimização de Performance
    // Lite Mode: Processamento ágil com menor grade neural (224x224).
    // Normal Mode: Precisão superior à longa distância (416x416).
    const size = optionsInput?.isLite ? 224 : 416;

    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: size,
      // Reduzindo o Score Threshold de 0.5 p/ 0.4 para a câmera piscar 
      // achando o rosto mto mais veloz no escuro.
      scoreThreshold: 0.4,
    });

    const result = await faceapi
      .detectSingleFace(video, options)
      .withFaceLandmarks()
      .withFaceDescriptor();

    return result || null;
  } catch {
    return null;
  }
}

export function matchFace(
  descriptor: Float32Array,
  knownFaces: { id: string; name: string; descriptor: number[] }[],
): { id: string; name: string; distance: number } | null {
  if (knownFaces.length === 0 || !faceapi) return null;

  let bestMatch: { id: string; name: string; distance: number } | null = null;
  // console.log(`[Face Match] Iniciando comparação contra ${knownFaces.length} vetores de face...`);

  for (const known of knownFaces) {
    if (!known.descriptor || known.descriptor.length !== 128) {
      console.warn(`[Face Match] Descritor inválido para ${known.name} (${known.descriptor?.length} axes). Ignorando...`);
      continue;
    }
    const knownDesc = new Float32Array(known.descriptor);
    const distance = faceapi.euclideanDistance(descriptor, knownDesc);

    if (distance < 0.6) {
      console.log(`[Face Match] -> '${known.name}' (id:${known.id}) | Distância obtida: ${distance.toFixed(3)} | Threshold Configurado: ${FACE_MATCH_THRESHOLD}`);
    }

    if (!bestMatch || distance < bestMatch.distance) {
      bestMatch = { id: known.id, name: known.name, distance };
    }
  }

  if (bestMatch && bestMatch.distance < FACE_MATCH_THRESHOLD) {
    console.log(`[Face Match] ✅ SUCESSO! Menor dist: ${bestMatch.distance.toFixed(3)} p/ '${bestMatch.name}' (Match: < ${FACE_MATCH_THRESHOLD})`);
    return bestMatch;
  }

  if (bestMatch) {
    console.log(`[Face Match] ❌ RECUSADO (Muito diferente). Menor dist: ${bestMatch.distance.toFixed(3)} p/ '${bestMatch.name}' (Recusado: >= ${FACE_MATCH_THRESHOLD})`);
  }

  return null;
}

export function capturePhoto(video: HTMLVideoElement): string {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.drawImage(video, 0, 0);
  }
  return canvas.toDataURL("image/jpeg", 0.8);
}

export function drawDetection(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  detection: any,
  matched: boolean,
) {
  if (!faceapi) return;

  const displaySize = {
    width: video.clientWidth,
    height: video.clientHeight,
  };
  faceapi.matchDimensions(canvas, displaySize);

  const resized = faceapi.resizeResults(detection, displaySize);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const box = resized.detection.box;
  const color = matched ? "#10B981" : "#22D3EE";

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  const cornerLen = 20;

  ctx.beginPath();
  ctx.moveTo(box.x, box.y + cornerLen);
  ctx.lineTo(box.x, box.y);
  ctx.lineTo(box.x + cornerLen, box.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(box.x + box.width - cornerLen, box.y);
  ctx.lineTo(box.x + box.width, box.y);
  ctx.lineTo(box.x + box.width, box.y + cornerLen);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(box.x + box.width, box.y + box.height - cornerLen);
  ctx.lineTo(box.x + box.width, box.y + box.height);
  ctx.lineTo(box.x + box.width - cornerLen, box.y + box.height);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(box.x + cornerLen, box.y + box.height);
  ctx.lineTo(box.x, box.y + box.height);
  ctx.lineTo(box.x, box.y + box.height - cornerLen);
  ctx.stroke();

  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.3;
  ctx.strokeRect(box.x, box.y, box.width, box.height);
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

export { faceapi };
