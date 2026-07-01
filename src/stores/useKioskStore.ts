import { useSyncExternalStore } from "react";
import {
  fetchKioskSettings,
  updateKioskSettingsDB,
  type KioskSettings,
} from "@/lib/api";
import type { KioskLibraryItem, KioskCampaign } from "@/types";

interface KioskState extends KioskSettings {
  loaded: boolean;
}

let state: KioskState = {
  library: [],
  campaigns: [],
  idleTimeoutSec: 30,
  slideIntervalSec: 8,
  showClock: true,
  message: "Toque na tela para registrar seu ponto",
  minCheckoutMinutes: 15,
  newsTickerSpeed: 35,
  enableNewsTicker: true,
  newsTickerUrl: "https://g1.globo.com/rss/g1/",
  rssLayout: "3d",
  rssSources: ["g1", "cnn"],
  rssTargetKiosks: [],
  liteTargetKiosks: [],
  mobileLat: "",
  mobileLng: "",
  mobileRadius: 100, // Tolerância Padrão da Cerca
  workLocations: [],
  autoCheckoutToleranceMinutes: 15,
  autoCheckoutWarningMinutes: 3,
  backupKey: "",
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

export function getKioskSnapshot() {
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

// Wrapper for explicitly awaiting fetch
async function fetchSettings() {
   await loadSettings();
   return state;
}

// Wrapper for Sync State
function getState() {
   return state;
}

// === LIBRARY ACTIONS ===
async function addLibraryItem(item: Omit<KioskLibraryItem, "id">) {
  const id = "lib-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
  const newLibrary = [...state.library, { ...item, id }];
  state = { ...state, library: newLibrary };
  emit();
  await updateKioskSettingsDB({ library: newLibrary });
}

async function removeLibraryItem(id: string) {
  const newLibrary = state.library.filter((i) => i.id !== id);
  // Optional: remove this item from all existing campaigns to avoid loose links
  const newCampaigns = state.campaigns.map(c => ({
    ...c,
    mediaItems: c.mediaItems.filter(mId => mId !== id)
  }));
  state = { ...state, library: newLibrary, campaigns: newCampaigns };
  emit();
  await updateKioskSettingsDB({ library: newLibrary, campaigns: newCampaigns });
}

async function updateLibraryItem(id: string, patch: Partial<KioskLibraryItem>) {
  const newLibrary = state.library.map((i) => (i.id === id ? { ...i, ...patch } : i));
  state = { ...state, library: newLibrary };
  emit();
  await updateKioskSettingsDB({ library: newLibrary });
}

// === CAMPAIGN ACTIONS ===
async function createCampaign(campaign: Omit<KioskCampaign, "id">) {
  const id = "camp-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
  const newCampaigns = [...state.campaigns, { ...campaign, id }];
  state = { ...state, campaigns: newCampaigns };
  emit();
  await updateKioskSettingsDB({ campaigns: newCampaigns });
}

async function updateCampaign(id: string, patch: Partial<KioskCampaign>) {
  const newCampaigns = state.campaigns.map((c) => (c.id === id ? { ...c, ...patch } : c));
  state = { ...state, campaigns: newCampaigns };
  emit();
  await updateKioskSettingsDB({ campaigns: newCampaigns });
}

async function deleteCampaign(id: string) {
  const newCampaigns = state.campaigns.filter((c) => c.id !== id);
  state = { ...state, campaigns: newCampaigns };
  emit();
  await updateKioskSettingsDB({ campaigns: newCampaigns });
}

async function updateSettings(
  partial: Partial<Pick<KioskSettings, "idleTimeoutSec" | "slideIntervalSec" | "showClock" | "message" | "minCheckoutMinutes" | "newsTickerSpeed" | "enableNewsTicker" | "newsTickerUrl" | "rssLayout" | "rssSources" | "rssTargetKiosks" | "liteTargetKiosks" | "mobileLat" | "mobileLng" | "mobileRadius" | "workLocations" | "autoCheckoutToleranceMinutes" | "autoCheckoutWarningMinutes" | "backupKey">>,
) {
  state = { ...state, ...partial };
  emit();
  return await updateKioskSettingsDB(partial);
}

function reload() {
  state = { ...state, loaded: false };
  loading = false;
  loadSettings();
}

interface StoreAPI extends KioskState {
  addLibraryItem: typeof addLibraryItem;
  removeLibraryItem: typeof removeLibraryItem;
  updateLibraryItem: typeof updateLibraryItem;
  createCampaign: typeof createCampaign;
  updateCampaign: typeof updateCampaign;
  deleteCampaign: typeof deleteCampaign;
  updateSettings: typeof updateSettings;
  loadSettings: typeof loadSettings;
  fetchSettings: typeof fetchSettings;
  reload: typeof reload;
}

export function useKioskStore(): StoreAPI;
export function useKioskStore<T>(selector: (s: StoreAPI) => T): T;
export function useKioskStore<T>(selector?: (s: StoreAPI) => T) {
  const snap = useSyncExternalStore(subscribe, getKioskSnapshot, getKioskSnapshot);

  if (!snap.loaded && !loading) loadSettings();

  const api: StoreAPI = {
    ...snap,
    addLibraryItem,
    removeLibraryItem,
    updateLibraryItem,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    updateSettings,
    loadSettings,
    fetchSettings,
    reload,
  };

  return selector ? selector(api) : api;
}

// Export getState for non-hook usage
useKioskStore.getState = getState;
