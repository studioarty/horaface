import { useSyncExternalStore } from "react";
import type { TimeRecord } from "@/types";
import { MIN_EXIT_MINUTES } from "@/constants/config";
import {
  fetchTimeRecords,
  insertCheckIn as apiCheckIn,
  insertCheckOut as apiCheckOut,
  fetchActiveRecord,
} from "@/lib/api";

let data: TimeRecord[] = [];
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

async function loadRecords() {
  if (loaded || loading) return;
  loading = true;
  try {
    const records = await fetchTimeRecords();
    data = records;
    loaded = true;
    emit();
  } catch (err) {
    console.error("loadRecords error:", err);
  } finally {
    loading = false;
  }
}

async function addCheckIn(providerId: string): Promise<TimeRecord> {
  const record = await apiCheckIn(providerId);
  data = [record, ...data];
  emit();
  return record;
}

async function addCheckOut(recordId: string): Promise<{ success: boolean; message: string }> {
  const record = data.find((r) => r.id === recordId);
  if (!record) return { success: false, message: "Registro não encontrado." };

  const result = await apiCheckOut(recordId, record.checkIn);
  if (result.success) {
    data = data.map((r) =>
      r.id === recordId
        ? { ...r, checkOut: new Date().toISOString(), status: "completed" as const }
        : r,
    );
    emit();
  }
  return result;
}

function getActiveRecord(providerId: string): TimeRecord | undefined {
  return data.find((r) => r.providerId === providerId && r.status === "active");
}

function getTodayRecords(): TimeRecord[] {
  const today = new Date().toISOString().split("T")[0];
  return data.filter((r) => r.date === today);
}

function getRecordsByDate(start: string, end: string): TimeRecord[] {
  return data.filter((r) => r.date >= start && r.date <= end);
}

function getRecordsByProvider(providerId: string): TimeRecord[] {
  return data.filter((r) => r.providerId === providerId);
}

function canCheckOut(recordId: string): { allowed: boolean; remainingMinutes: number } {
  const record = data.find((r) => r.id === recordId);
  if (!record) return { allowed: false, remainingMinutes: MIN_EXIT_MINUTES };
  const diffMinutes = (Date.now() - new Date(record.checkIn).getTime()) / 60000;
  const remaining = Math.ceil(MIN_EXIT_MINUTES - diffMinutes);
  return { allowed: diffMinutes >= MIN_EXIT_MINUTES, remainingMinutes: Math.max(0, remaining) };
}

// Fetch active record from DB (for kiosk use)
async function fetchActiveRecordFromDB(providerId: string): Promise<TimeRecord | null> {
  return fetchActiveRecord(providerId);
}

function reload() {
  loaded = false;
  loading = false;
  loadRecords();
}

interface StoreAPI {
  records: TimeRecord[];
  addCheckIn: typeof addCheckIn;
  addCheckOut: typeof addCheckOut;
  getActiveRecord: typeof getActiveRecord;
  getTodayRecords: typeof getTodayRecords;
  getRecordsByDate: typeof getRecordsByDate;
  getRecordsByProvider: typeof getRecordsByProvider;
  canCheckOut: typeof canCheckOut;
  loadRecords: typeof loadRecords;
  fetchActiveRecordFromDB: typeof fetchActiveRecordFromDB;
  reload: typeof reload;
}

export function useTimeStore(): StoreAPI;
export function useTimeStore<T>(selector: (s: StoreAPI) => T): T;
export function useTimeStore<T>(selector?: (s: StoreAPI) => T) {
  const records = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  if (!loaded && !loading) loadRecords();

  const api: StoreAPI = {
    records,
    addCheckIn,
    addCheckOut,
    getActiveRecord,
    getTodayRecords,
    getRecordsByDate,
    getRecordsByProvider,
    canCheckOut,
    loadRecords,
    fetchActiveRecordFromDB,
    reload,
  };

  return selector ? selector(api) : api;
}
