import type { Provider, Shift, TimeRecord, KioskLibraryItem, KioskCampaign } from "@/types";
import { pushToQueue, cacheActiveRecord, getCachedActiveRecord } from "./syncWorker";

// Utility helpers for HTTP
const BASE_URL = '/api';

function getHeaders() {
  const token = localStorage.getItem("auth-token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: { ...getHeaders(), ...(options.headers || {}) }
    });
    if (!res.ok) {
      let errStr = `Erro na API (${res.status})`;
      try { const data = await res.json(); errStr = data.error || errStr; } catch { /* ignore */ }
      throw new Error(errStr);
    }
    return await res.json();
  } catch (err: any) {
    if (err.message === "Failed to fetch" || err.message.includes("Network")) {
      err.isNetworkError = true;
    }
    throw err;
  }
}

async function apiUpload(fileOrBlob: File | Blob, filename: string = "upload.jpg") {
  const fd = new FormData();
  fd.append("file", fileOrBlob, filename);

  const token = localStorage.getItem("auth-token");
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/upload/campaign`, {
    method: 'POST',
    body: fd,
    headers
  });
  if (!res.ok) throw new Error("Upload falhou");
  const data = await res.json();
  return data.url;
}

// ===== PROVIDERS =====

export async function fetchProviders(): Promise<Provider[]> {
  if (!navigator.onLine) {
    try { return JSON.parse(localStorage.getItem("PONTOFACE_HOT_PROVIDERS") || "[]"); } catch { return []; }
  }
  try {
    const result = await apiFetch("/providers");
    localStorage.setItem("PONTOFACE_HOT_PROVIDERS", JSON.stringify(result));
    return result;
  } catch (err: any) {
    if (err.isNetworkError) {
      try { return JSON.parse(localStorage.getItem("PONTOFACE_HOT_PROVIDERS") || "[]"); } catch { return []; }
    }
    console.error("fetchProviders error:", err);
    return [];
  }
}

export async function insertProvider(p: Provider): Promise<{error?: any}> {
  try {
    await apiFetch("/providers", {
      method: "POST",
      body: JSON.stringify(p)
    });
    return {};
  } catch (error: any) {
    console.error("insertProvider LOCAL error:", error);
    return { error };
  }
}

export async function updateProviderDB(id: string, patch: Partial<Provider>): Promise<void> {
  try {
    await apiFetch(`/providers/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch)
    });
  } catch (err) {
    console.error("updateProviderDB error:", err);
  }
}

export async function deleteProviderDB(id: string): Promise<void> {
  try {
    await apiFetch(`/providers/${id}`, {
      method: "DELETE"
    });
  } catch (err) {
    console.error("deleteProviderDB error:", err);
  }
}

// ===== SHIFTS =====

export async function fetchShifts(): Promise<Shift[]> {
  if (!navigator.onLine) {
    try { return JSON.parse(localStorage.getItem("PONTOFACE_HOT_SHIFTS") || "[]"); } catch { return []; }
  }
  try {
    const result = await apiFetch("/shifts");
    localStorage.setItem("PONTOFACE_HOT_SHIFTS", JSON.stringify(result));
    return result;
  } catch (err: any) {
    if (err.isNetworkError) {
      try { return JSON.parse(localStorage.getItem("PONTOFACE_HOT_SHIFTS") || "[]"); } catch { return []; }
    }
    console.error("fetchShifts error:", err);
    return [];
  }
}

export async function insertShift(s: Shift): Promise<void> {
  try {
    await apiFetch("/shifts", {
      method: "POST",
      body: JSON.stringify(s)
    });
  } catch (err) {
    console.error("insertShift error:", err);
  }
}

export async function updateShiftDB(id: string, patch: Partial<Shift>): Promise<void> {
  try {
    await apiFetch(`/shifts/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch)
    });
  } catch (err) {
    console.error("updateShiftDB error:", err);
  }
}

export async function deleteShiftDB(id: string): Promise<void> {
  try {
    await apiFetch(`/shifts/${id}`, {
      method: "DELETE"
    });
  } catch (err) {
    console.error("deleteShiftDB error:", err);
  }
}

// ===== TIME RECORDS =====

export async function fetchTimeRecords(): Promise<TimeRecord[]> {
  try {
    return await apiFetch("/records");
  } catch (err) {
    console.error("fetchTimeRecords error:", err);
    return [];
  }
}

export async function fetchTodayRecords(): Promise<TimeRecord[]> {
  // O Node REST `/api/records` retorna todos ordendados.
  // Para filtrar localmente o de "Hoje":
  const todayDate = new Date().toISOString().split("T")[0];
  try {
    const all = await fetchTimeRecords();
    return all.filter(r => r.checkIn.startsWith(todayDate));
  } catch (err) {
    console.error("fetchTodayRecords error:", err);
    return [];
  }
}

export async function insertCheckIn(providerId: string, photoUrl?: string, location?: string): Promise<TimeRecord> {
  const now = new Date();
  const id = "rec-" + Date.now();
  const payload = {
    id,
    providerId: providerId,  // Nota: o backend node deve suportar camelCase
    checkIn: now.toISOString(),
    photoUrl: photoUrl || "",
    status: "active",
    date: now.toISOString().split("T")[0],
    location: location || ""
  };

  if (!navigator.onLine) {
    pushToQueue({ type: "check_in", payload });
    cacheActiveRecord(providerId, payload as TimeRecord);
    return payload as TimeRecord;
  }

  try {
    const record = await apiFetch("/records", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    cacheActiveRecord(providerId, record);
    return record;
  } catch (err: any) {
    if (err.isNetworkError) {
      pushToQueue({ type: "check_in", payload });
      cacheActiveRecord(providerId, payload as TimeRecord);
      return payload as TimeRecord;
    }
    console.error("insertCheckIn error:", err);
    cacheActiveRecord(providerId, payload as TimeRecord);
    return payload as TimeRecord;
  }
}

export async function insertCheckOut(
  recordId: string,
  checkInTime: string,
  minExitMinutes: number = 15,
  providerId?: string,
  checkOutPhoto?: string,
  checkOutLocation?: string
): Promise<{ success: boolean; message: string }> {
  const diffMinutes = (Date.now() - new Date(checkInTime).getTime()) / 60000;
  // Permitir saídas a qualquer momento (incluindo antes do limite configurado de 3 minutos).
  // Mantemos apenas uma proteção de 5 segundos (0.083 minutos) para evitar cliques duplos acidentais.
  if (diffMinutes < 0.083) {
    const remainingSecs = Math.max(1, Math.ceil(5 - (diffMinutes * 60)));
    return { success: false, message: `Saída muito rápida. Aguarde mais ${remainingSecs} segundo(s) para evitar batida duplicada.` };
  }

  const payload = { checkOut: new Date().toISOString(), status: 'completed' };

  const handleSuccess = () => {
    if (providerId) cacheActiveRecord(providerId, null);
    return { success: true, message: "Saída registrada com sucesso!" };
  };

  if (!navigator.onLine) {
    pushToQueue({ type: "check_out", payload: { id: recordId, check_out: payload.checkOut } });
    return handleSuccess();
  }

  try {
    await apiFetch(`/records/${recordId}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  } catch (err: any) {
    if (err.isNetworkError) {
      pushToQueue({ type: "check_out", payload: { id: recordId, check_out: payload.checkOut } });
      return handleSuccess();
    }
    console.error("insertCheckOut error:", err);
    return { success: false, message: "Erro ao registrar saída." };
  }

  return handleSuccess();
}

export async function insertSilentAttempt(providerId: string, photoUrl?: string, location?: string): Promise<void> {
  console.log("Local insertSilentAttempt:", providerId, location);
}

export async function fetchActiveRecord(providerId: string): Promise<TimeRecord | null> {
  if (!navigator.onLine) return getCachedActiveRecord(providerId);

  try {
    const record = await apiFetch(`/records/active/${providerId}`);
    cacheActiveRecord(providerId, record);
    return record;
  } catch (err: any) {
    if (err.isNetworkError) {
      return getCachedActiveRecord(providerId);
    }
    return null;
  }
}

export async function resetProviderRecords(providerId: string): Promise<{ success: boolean; error?: string }> {
  if (!navigator.onLine) return { success: false, error: "Offline" };
  try {
    await apiFetch(`/records/provider/${providerId}`, { method: "DELETE" });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function resetAllTimeRecords(): Promise<{ success: boolean; error?: string }> {
  if (!navigator.onLine) return { success: false, error: "Offline" };
  try {
    await apiFetch(`/records/all`, { method: "DELETE" });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteTimeRecord(recordId: string): Promise<{ success: boolean; error?: string }> {
  return { success: true };
}

export async function removeCheckOut(recordId: string): Promise<{ success: boolean; error?: string; record?: TimeRecord }> {
  return { success: true };
}

// ===== KIOSK SETTINGS =====

export interface WorkLocation {
  name: string;
  lat: string;
  lng: string;
  radius: number;
}

export interface KioskSettings {
  library: KioskLibraryItem[];
  campaigns: KioskCampaign[];
  idleTimeoutSec: number;
  slideIntervalSec: number;
  showClock: boolean;
  message: string;
  minCheckoutMinutes: number;
  newsTickerSpeed: number;
  enableNewsTicker: boolean;
  newsTickerUrl: string;
  rssLayout: string;
  rssSources: string[];
  rssTargetKiosks?: string[];
  liteTargetKiosks?: string[];
  mobileLat?: string;
  mobileLng?: string;
  mobileRadius?: number;
  digitalSignageUrl?: string;
  workLocations?: WorkLocation[];
  autoCheckoutToleranceMinutes?: number;
  autoCheckoutWarningMinutes?: number;
  backupKey?: string;
  breakStartTime?: string;
  breakEndTime?: string;
}

export async function fetchKioskSettings(): Promise<KioskSettings> {
  const defaults: KioskSettings = {
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
    mobileRadius: 100,
    digitalSignageUrl: "",
    workLocations: [],
    autoCheckoutToleranceMinutes: 15,
    autoCheckoutWarningMinutes: 3,
    backupKey: "",
    breakStartTime: "09:00",
    breakEndTime: "09:15",
  };

  if (!navigator.onLine) {
    try { return JSON.parse(localStorage.getItem("PONTOFACE_HOT_SETTINGS") || "null") || defaults; } catch { return defaults; }
  }

  try {
    const data = await apiFetch("/settings");
    localStorage.setItem("PONTOFACE_HOT_SETTINGS", JSON.stringify(data));
    return data;
  } catch (err: any) {
    try { return JSON.parse(localStorage.getItem("PONTOFACE_HOT_SETTINGS") || "null") || defaults; } catch {}
    return defaults;
  }
}

export async function updateKioskSettingsDB(patch: Partial<KioskSettings>): Promise<{success: boolean, error?: any}> {
  try {
    await apiFetch("/settings", {
      method: "PUT",
      body: JSON.stringify(patch)
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ===== KIOSK MONITOR (Multi-kiosk) =====

export interface KioskMonitorData {
  id: string;
  name: string;
  location: string;
  cameraActive: boolean;
  snapshotUrl: string;
  kioskOnline: boolean;
  lastHeartbeat: string | null;
  isApproved?: boolean;
}

export async function fetchAllKiosks(): Promise<KioskMonitorData[]> {
  try {
    return await apiFetch("/monitor");
  } catch {
    return [];
  }
}

export async function fetchKioskMonitor(kioskId: string = "default"): Promise<KioskMonitorData> {
  try {
    const data = await apiFetch(`/monitor/${kioskId}`);
    return data;
  } catch {
    return {
      id: kioskId,
      name: "Quiosque",
      location: "",
      cameraActive: false,
      snapshotUrl: "",
      kioskOnline: false,
      lastHeartbeat: null,
    };
  }
}

export async function registerKiosk(kioskId: string, name: string, location: string): Promise<void> {
  try {
    await apiFetch("/monitor", {
      method: "POST",
      body: JSON.stringify({
        id: kioskId,
        name,
        location,
        kioskOnline: true,
        lastHeartbeat: new Date().toISOString()
      })
    });
  } catch (err) {
    console.error("registerKiosk error:", err);
  }
}

export async function updateKioskMonitorDB(
  kioskId: string,
  patch: Partial<KioskMonitorData>,
): Promise<void> {
  try {
    await apiFetch(`/monitor/${kioskId}`, {
      method: "PUT",
      body: JSON.stringify(patch)
    });
  } catch (err) {
    console.error("updateKioskMonitor error:", err);
  }
}

export async function deleteKioskDB(kioskId: string): Promise<void> {
  try {
    await apiFetch(`/monitor/${kioskId}`, {
      method: "DELETE"
    });
  } catch (err) {
    console.error("deleteKioskDB error:", err);
  }
}

// ===== STORAGE =====

export async function uploadSnapshot(blob: Blob, kioskId: string = "default"): Promise<string> {
  try {
    return await apiUpload(blob, `live-${kioskId}.jpg`);
  } catch (err) {
    console.error("uploadSnapshot err:", err);
    return "";
  }
}

export async function uploadKioskMedia(file: File): Promise<{ url: string; errorMsg?: string }> {
  try {
    const url = await apiUpload(file, file.name);
    return { url };
  } catch (err) {
    return { url: '', errorMsg: "Falha local no upload" };
  }
}

export async function uploadCampaignMedia(file: File, folder: string): Promise<{ url: string; path: string } | null> {
  try {
    const url = await apiUpload(file, file.name);
    return { url, path: url };
  } catch (err) {
    return null;
  }
}

export async function deleteKioskMedia(url: string): Promise<void> {
  // Not natively supported by current node.js storage without rewriting endpoints. Skipping to save ops.
}

export async function uploadFacePhoto(blob: Blob, providerId: string, index: number): Promise<string> {
  try {
    return await apiUpload(blob, `face-${providerId}-${index}.jpg`);
  } catch (err) {
    return "";
  }
}

// ===== ADMIN & HOLIDAYS =====
export interface AdminUser {
  id: string;
  username: string;
  email?: string;
  role: string;
  createdAt?: string;
}

export async function setupAdmin(): Promise<{ message?: string; error?: string }> {
  try {
    const res = await apiFetch("/auth/setup", { method: "POST" });
    return { message: res.message };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function loginAdmin(username: string, pass: string): Promise<{ token?: string; user?: any; error?: string }> {
  try {
    const res = await apiFetch("/auth/login", { 
      method: "POST", 
      body: JSON.stringify({ username, password: pass }) 
    });
    return { token: res.token, user: res.user };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function fetchAdmins(): Promise<AdminUser[]> {
  // Atualmente o Node back-end tem /auth/audit mas não tem GET /admins explícito visível
  // Todavia, vamos mockar se não achar rota porque admins nativos agora são estáticos!
  // Porém o backend é gerenciável apenas por loginAdmin(root)
  return [];
}

export async function insertAdmin(username: string, email: string, pass: string, role: string): Promise<{ success: boolean; error?: string }> {
  // The local node backend from `server.ts` does NOT have an /api/admins endpoint yet, just basic setup!
  return { success: false, error: "Apenas Super Admin nativo pelo Node local suportado agora." };
}

export async function deleteAdminDB(id: string): Promise<void> {}
export async function updateAdminPasswordDB(id: string, newPass: string): Promise<void> {}

export interface Holiday {
  id: string;
  name: string;
  targetDate: string;
}

export async function fetchHolidays(): Promise<Holiday[]> {
  try {
    return await apiFetch("/holidays");
  } catch {
    return [];
  }
}

export async function insertHoliday(name: string, date: string): Promise<{success: boolean; error?: string; id?: string}> {
  try {
    const res = await apiFetch("/holidays", {
      method: "POST",
      body: JSON.stringify({ id: `hol-${Date.now()}`, name, targetDate: date })
    });
    return { success: true, id: res.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteHolidayDB(id: string): Promise<void> {
  try {
    await apiFetch(`/holidays/${id}`, { method: "DELETE" });
  } catch (e) {
    console.error("deleteHoliday", e);
  }
}

export async function fetchProviderRecords(providerId: string): Promise<TimeRecord[]> {
  try {
    const data = await apiFetch(`/records?providerId=${providerId}`);
    return data;
  } catch {
    return [];
  }
}

export function calculateMonthHours(records: TimeRecord[], holidays: Holiday[]): number {
  let totalHours = 0;
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  records.forEach((rec) => {
    if (!rec.checkOut) return;
    const dIn = new Date(rec.checkIn);
    if (dIn.getMonth() === currentMonth && dIn.getFullYear() === currentYear) {
      const dayOfWeek = dIn.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const hours = (new Date(rec.checkOut).getTime() - dIn.getTime()) / 3600000;
        totalHours += hours;
      }
    }
  });

  const cutoffDate = new Date("2026-03-21T00:00:00").getTime();
  holidays.forEach((hol) => {
    if (!hol.isRoutine) {
      const holDate = new Date(`${hol.targetDate}T12:00:00`);
      const creditTime = new Date(`${hol.targetDate}T18:00:00`).getTime();

      if (holDate.getTime() >= cutoffDate) {
        if (holDate.getMonth() === currentMonth && holDate.getFullYear() === currentYear) {
          const dayOfWeek = holDate.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            if (now.getTime() >= creditTime) {
              totalHours += 8.5;
            }
          }
        }
      }
    }
  });

  return totalHours;
}

