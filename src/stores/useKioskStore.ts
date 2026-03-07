import { useSyncExternalStore } from "react";
import {
  fetchKioskSettings,
  updateKioskSettingsDB,
  type KioskImage,
  type KioskSettings,
} from "@/lib/api";

interface KioskState extends KioskSettings {
  loaded: boolean;
}

let state: KioskState = {
  images: [],
  idleTimeoutSec: 30,
  slideIntervalSec: 8,
  showClock: true,
  message: "Toque na tela para registrar seu ponto",
  loaded: false,
};

let loading = false;
const subs = new Set<() => void>();

function emit() {
  subs.forEach((fn) => fn());
}

function subscribe(cb: () => void) {
  subs.add(cb);
  return () => { subs.delete(cb); };
}

function getSnapshot() {
  return state;
}

async function loadSettings() {
  if (state.loaded || loading) return;
  loading = true;
  try {
    const settings = await fetchKioskSettings();
    state = { ...settings, loaded: true };
    emit();
  } catch (err) {
    console.error("loadKioskSettings error:", err);
  } finally {
    loading = false;
  }
}

async function addImage(url: string, label: string) {
  const id = "img-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
  const newImages = [...state.images, { id, url, label }];
  state = { ...state, images: newImages };
  emit();
  await updateKioskSettingsDB({ images: newImages });
}

async function removeImage(id: string) {
  const newImages = state.images.filter((i) => i.id !== id);
  state = { ...state, images: newImages };
  emit();
  await updateKioskSettingsDB({ images: newImages });
}

async function reorderImages(images: KioskImage[]) {
  state = { ...state, images };
  emit();
  await updateKioskSettingsDB({ images });
}

async function updateSettings(
  partial: Partial<Pick<KioskSettings, "idleTimeoutSec" | "slideIntervalSec" | "showClock" | "message">>,
) {
  state = { ...state, ...partial };
  emit();
  await updateKioskSettingsDB(partial);
}

function reload() {
  state = { ...state, loaded: false };
  loading = false;
  loadSettings();
}

interface StoreAPI extends KioskState {
  addImage: typeof addImage;
  removeImage: typeof removeImage;
  reorderImages: typeof reorderImages;
  updateSettings: typeof updateSettings;
  loadSettings: typeof loadSettings;
  reload: typeof reload;
}

export type { KioskImage };

export function useKioskStore(): StoreAPI;
export function useKioskStore<T>(selector: (s: StoreAPI) => T): T;
export function useKioskStore<T>(selector?: (s: StoreAPI) => T) {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  if (!snap.loaded && !loading) loadSettings();

  const api: StoreAPI = {
    ...snap,
    addImage,
    removeImage,
    reorderImages,
    updateSettings,
    loadSettings,
    reload,
  };

  return selector ? selector(api) : api;
}
