import { useSyncExternalStore } from "react";
import type { TimeRecord, Provider, Shift } from "@/types";
import {
  fetchTimeRecords,
  insertCheckIn as apiCheckIn,
  insertCheckOut as apiCheckOut,
  fetchActiveRecord,
  resetProviderRecords as apiResetProvider,
  resetAllTimeRecords as apiResetAll,
  deleteTimeRecord as apiDeleteTimeRecord,
  removeCheckOut as apiRemoveCheckOut,
  fetchProviders,
  fetchShifts,
  fetchKioskSettings,
} from "@/lib/api";
import { getKioskSnapshot } from "./useKioskStore";

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

// ── Poll every minute to process auto-checkouts in the background ──
if (typeof window !== "undefined") {
  setInterval(() => {
    // Only poll if there's an active record to avoid unnecessary DB calls when empty
    // Actually, checking autoCloseOverdueRecords is fine, it will fetch when needed.
    loadRecords(true);
  }, 30000);
}

async function autoCloseOverdueRecords() {
  if (typeof document === "undefined") return;
  try {
    const [records, providers, shifts, settings] = await Promise.all([
      fetchTimeRecords(),
      fetchProviders(),
      fetchShifts(),
      fetchKioskSettings(),
    ]);

    const activeRecords = records.filter((r) => r.status === "active" && !r.checkOut);
    const tolerance = settings.autoCheckoutToleranceMinutes ?? 15;

    for (const record of activeRecords) {
      const provider = providers.find((p) => p.id === record.providerId);
      if (!provider) continue;

      const checkInDate = new Date(record.checkIn);
      const checkInDay = checkInDate.getDay();

      const providerShiftIds = provider.shiftIds && provider.shiftIds.length > 0
        ? provider.shiftIds
        : provider.shiftId
          ? [provider.shiftId]
          : [];
      const providerShifts = providerShiftIds.map((id) => shifts.find((s) => s.id === id)).filter(Boolean) as Shift[];
      const shiftForDay = providerShifts.filter((shift) => {
        const shiftDays = shift.days || [];
        return shiftDays.length === 0 || shiftDays.includes(checkInDay);
      });

      if (shiftForDay.length === 0) continue;

      const checkInMinutes = checkInDate.getHours() * 60 + checkInDate.getMinutes();
      let matchedShift: Shift | null = null;
      let minDiff = Infinity;

      for (const shift of shiftForDay) {
        const [sH, sM] = shift.startTime.split(":").map(Number);
        const [eH, eM] = shift.endTime.split(":").map(Number);
        const startMin = sH * 60 + sM;
        const endMin = eH * 60 + eM;

        let isMatch = false;
        if (endMin < startMin) {
          isMatch = checkInMinutes >= startMin - 30 || checkInMinutes <= endMin + tolerance;
        } else {
          isMatch = checkInMinutes >= startMin - 30 && checkInMinutes <= endMin + tolerance;
        }

        if (isMatch) {
          matchedShift = shift;
          break;
        }

        let diff = Math.abs(checkInMinutes - startMin);
        if (diff > 720) diff = 1440 - diff;
        if (diff < minDiff) {
          minDiff = diff;
          matchedShift = shift;
        }
      }

      if (!matchedShift) continue;

      const [eH, eM] = matchedShift.endTime.split(":").map(Number);
      const [sH, sM] = matchedShift.startTime.split(":").map(Number);
      const startMinShift = sH * 60 + sM;
      const endMinShift   = eH * 60 + eM;

      const targetDate = new Date(checkInDate);
      targetDate.setHours(eH, eM + tolerance, 0, 0);

      const exactShiftEnd = new Date(checkInDate);
      exactShiftEnd.setHours(eH, eM, 0, 0);

      // Turno da noite cruza meia-noite (ex: 22:00–03:18)
      // O fim do turno é no DIA SEGUINTE — ajusta datas +1 dia
      const isOvernightShift = endMinShift < startMinShift;
      if (isOvernightShift && targetDate.getTime() <= checkInDate.getTime()) {
        targetDate.setDate(targetDate.getDate() + 1);
        exactShiftEnd.setDate(exactShiftEnd.getDate() + 1);
      }

      if (Date.now() >= targetDate.getTime()) {
        console.log(`[Auto-Checkout] Encerramento automático de ${provider.name} no registro ${record.id}`);
        
        let warningImageBase64 = "";
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 640;
          canvas.height = 480;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#EF4444";
            ctx.fillRect(0, 0, 640, 480);

            ctx.fillStyle = "#DC2626";
            for (let i = -480; i < 640; i += 60) {
              ctx.beginPath();
              ctx.moveTo(i, 0);
              ctx.lineTo(i + 40, 0);
              ctx.lineTo(i + 40 + 480, 480);
              ctx.lineTo(i + 480, 480);
              ctx.closePath();
              ctx.fill();
            }

            ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
            ctx.fillRect(40, 40, 560, 400);

            ctx.fillStyle = "#FFFFFF";
            ctx.font = "bold 42px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("SAÍDA AUTOMÁTICA", 320, 200);

            ctx.font = "24px sans-serif";
            ctx.fillText("Tolerância do Turno Excedida", 320, 270);

            ctx.font = "18px monospace";
            ctx.fillText(exactShiftEnd.toLocaleString("pt-BR"), 320, 340);
          }
          warningImageBase64 = canvas.toDataURL("image/jpeg", 0.8);
        } catch (canvasErr) {
          console.error("Canvas image generation failed:", canvasErr);
        }

        await apiCheckOut(
          record.id,
          record.checkIn,
          0,
          provider.id,
          warningImageBase64,
          "SAÍDA AUTOMÁTICA",
          exactShiftEnd.toISOString()
        );
      }
    }
  } catch (err) {
    console.error("Error in autoCloseOverdueRecords:", err);
  }
}

async function loadRecords(force = false) {
  if (loading) return;
  if (loaded && !force) return;
  loading = true;
  try {
    await autoCloseOverdueRecords();
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

async function addCheckIn(providerId: string, photoUrl?: string, location?: string): Promise<TimeRecord> {
  const record = await apiCheckIn(providerId, photoUrl, location);
  data = [record, ...data];
  emit();
  return record;
}

async function addCheckOut(recordId: string): Promise<{ success: boolean; message: string }> {
  const record = data.find((r) => r.id === recordId);
  if (!record) return { success: false, message: "Registro não encontrado." };

  const minExit = getKioskSnapshot().minCheckoutMinutes || 15;
  const result = await apiCheckOut(recordId, record.checkIn, minExit);
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
  const minExitMinutes = getKioskSnapshot().minCheckoutMinutes || 15;
  if (!record) return { allowed: false, remainingMinutes: minExitMinutes };
  const diffMinutes = (Date.now() - new Date(record.checkIn).getTime()) / 60000;
  const remaining = Math.ceil(minExitMinutes - diffMinutes);
  return { allowed: diffMinutes >= minExitMinutes, remainingMinutes: Math.max(0, remaining) };
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

async function resetProvider(providerId: string): Promise<{ success: boolean; error?: string }> {
  loading = true;
  emit();
  const res = await apiResetProvider(providerId);
  if (res.success) {
    data = data.filter((r) => r.providerId !== providerId);
  }
  loading = false;
  emit();
  return res;
}

async function resetAll(): Promise<{ success: boolean; error?: string }> {
  loading = true;
  emit();
  const res = await apiResetAll();
  if (res.success) {
    data = [];
  }
  loading = false;
  emit();
  return res;
}

async function deleteRecord(recordId: string): Promise<{ success: boolean; error?: string }> {
  loading = true;
  emit();
  const res = await apiDeleteTimeRecord(recordId);
  if (res.success) {
    data = data.filter((r) => r.id !== recordId);
  }
  loading = false;
  emit();
  return res;
}

async function undoCheckOut(recordId: string): Promise<{ success: boolean; error?: string }> {
  loading = true;
  emit();
  const res = await apiRemoveCheckOut(recordId);
  if (res.success && res.record) {
    data = data.map((r) => (r.id === recordId ? res.record! : r));
  }
  loading = false;
  emit();
  return res;
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
  resetProvider: typeof resetProvider;
  resetAll: typeof resetAll;
  deleteRecord: typeof deleteRecord;
  undoCheckOut: typeof undoCheckOut;
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
    resetProvider,
    resetAll,
    deleteRecord,
    undoCheckOut,
  };

  return selector ? selector(api) : api;
}
