import { useSyncExternalStore } from "react";
import type { Provider } from "@/types";
import { fetchProviders, insertProvider, updateProviderDB, deleteProviderDB } from "@/lib/api";

let data: Provider[] = [];
let loaded = false;
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
  return data;
}

async function loadProviders() {
  if (loaded || loading) return;
  loading = true;
  try {
    const providers = await fetchProviders();
    data = providers;
    loaded = true;
    emit();
  } catch (err) {
    console.error("loadProviders error:", err);
  } finally {
    loading = false;
  }
}

async function addProvider(p: Provider) {
  data = [p, ...data];
  emit();
  await insertProvider(p);
}

async function updateProvider(id: string, patch: Partial<Provider>) {
  data = data.map((p) => (p.id === id ? { ...p, ...patch } : p));
  emit();
  await updateProviderDB(id, patch);
}

async function removeProvider(id: string) {
  data = data.filter((p) => p.id !== id);
  emit();
  await deleteProviderDB(id);
}

function getProvider(id: string): Provider | undefined {
  return data.find((p) => p.id === id);
}

function getActiveProviders(): Provider[] {
  return data.filter((p) => p.active);
}

function getProviderShiftIds(p: Provider): string[] {
  if (p.shiftIds && p.shiftIds.length > 0) return p.shiftIds;
  if (p.shiftId) return [p.shiftId];
  return [];
}

function getKnownFaces() {
  const faces: { id: string; name: string; descriptor: number[] }[] = [];
  for (const p of data) {
    if (!p.active) continue;
    if (p.faceDescriptors && p.faceDescriptors.length > 0) {
      for (const desc of p.faceDescriptors) {
        if (desc.length > 0) {
          faces.push({ id: p.id, name: p.name, descriptor: desc });
        }
      }
    } else if (p.faceDescriptor && p.faceDescriptor.length > 0) {
      faces.push({ id: p.id, name: p.name, descriptor: p.faceDescriptor });
    }
  }
  return faces;
}

function reload() {
  loaded = false;
  loading = false;
  loadProviders();
}

interface StoreAPI {
  providers: Provider[];
  addProvider: typeof addProvider;
  updateProvider: typeof updateProvider;
  removeProvider: typeof removeProvider;
  getProvider: typeof getProvider;
  getActiveProviders: typeof getActiveProviders;
  getKnownFaces: typeof getKnownFaces;
  getProviderShiftIds: typeof getProviderShiftIds;
  loadProviders: typeof loadProviders;
  reload: typeof reload;
}

export function useProviderStore(): StoreAPI;
export function useProviderStore<T>(selector: (s: StoreAPI) => T): T;
export function useProviderStore<T>(selector?: (s: StoreAPI) => T) {
  const providers = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Trigger initial load
  if (!loaded && !loading) loadProviders();

  const api: StoreAPI = {
    providers,
    addProvider,
    updateProvider,
    removeProvider,
    getProvider,
    getActiveProviders,
    getKnownFaces,
    getProviderShiftIds,
    loadProviders,
    reload,
  };

  return selector ? selector(api) : api;
}
