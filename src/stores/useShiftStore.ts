import { useSyncExternalStore } from "react";
import type { Shift } from "@/types";
import { fetchShifts, insertShift, updateShiftDB, deleteShiftDB } from "@/lib/api";

let data: Shift[] = [];
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

async function loadShifts() {
  if (loaded || loading) return;
  loading = true;
  try {
    const shifts = await fetchShifts();
    data = shifts;
    loaded = true;
    emit();
  } catch (err) {
    console.error("loadShifts error:", err);
  } finally {
    loading = false;
  }
}

async function addShift(shift: Shift) {
  data = [...data, shift];
  emit();
  await insertShift(shift);
}

async function updateShift(id: string, patch: Partial<Shift>) {
  data = data.map((s) => (s.id === id ? { ...s, ...patch } : s));
  emit();
  await updateShiftDB(id, patch);
}

async function removeShift(id: string) {
  data = data.filter((s) => s.id !== id);
  emit();
  await deleteShiftDB(id);
}

function getShift(id: string): Shift | undefined {
  return data.find((s) => s.id === id);
}

function reload() {
  loaded = false;
  loading = false;
  loadShifts();
}

interface StoreAPI {
  shifts: Shift[];
  addShift: typeof addShift;
  updateShift: typeof updateShift;
  removeShift: typeof removeShift;
  getShift: typeof getShift;
  loadShifts: typeof loadShifts;
  reload: typeof reload;
}

export function useShiftStore(): StoreAPI;
export function useShiftStore<T>(selector: (s: StoreAPI) => T): T;
export function useShiftStore<T>(selector?: (s: StoreAPI) => T) {
  const shifts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  if (!loaded && !loading) loadShifts();

  const api: StoreAPI = {
    shifts,
    addShift,
    updateShift,
    removeShift,
    getShift,
    loadShifts,
    reload,
  };

  return selector ? selector(api) : api;
}
