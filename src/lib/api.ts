import { supabase } from "./supabase";
import type { Provider, Shift, TimeRecord } from "@/types";
import { MIN_EXIT_MINUTES } from "@/constants/config";

// ===== PROVIDERS =====

function mapProviderFromDB(row: any): Provider {
  return {
    id: row.id,
    name: row.name,
    cpf: row.cpf,
    role: row.role || "",
    company: row.company || "",
    photo: row.photo_url || "",
    faceDescriptor: row.face_descriptors?.[0] || [],
    faceDescriptors: row.face_descriptors || [],
    facePhotos: row.face_photo_urls || [],
    shiftId: row.shift_ids?.[0] || "",
    shiftIds: row.shift_ids || [],
    active: row.active,
    createdAt: row.created_at,
  };
}

export async function fetchProviders(): Promise<Provider[]> {
  const { data, error } = await supabase
    .from("providers")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("fetchProviders error:", error);
    return [];
  }
  return (data || []).map(mapProviderFromDB);
}

export async function insertProvider(p: Provider): Promise<void> {
  const { error } = await supabase.from("providers").insert({
    id: p.id,
    name: p.name,
    cpf: p.cpf,
    role: p.role,
    company: p.company,
    photo_url: p.photo,
    face_descriptors: p.faceDescriptors || (p.faceDescriptor ? [p.faceDescriptor] : []),
    face_photo_urls: p.facePhotos || [],
    shift_ids: p.shiftIds || (p.shiftId ? [p.shiftId] : []),
    active: p.active,
  });
  if (error) console.error("insertProvider error:", error);
}

export async function updateProviderDB(id: string, patch: Partial<Provider>): Promise<void> {
  const dbPatch: any = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.cpf !== undefined) dbPatch.cpf = patch.cpf;
  if (patch.role !== undefined) dbPatch.role = patch.role;
  if (patch.company !== undefined) dbPatch.company = patch.company;
  if (patch.photo !== undefined) dbPatch.photo_url = patch.photo;
  if (patch.faceDescriptors !== undefined) dbPatch.face_descriptors = patch.faceDescriptors;
  if (patch.facePhotos !== undefined) dbPatch.face_photo_urls = patch.facePhotos;
  if (patch.shiftIds !== undefined) dbPatch.shift_ids = patch.shiftIds;
  if (patch.active !== undefined) dbPatch.active = patch.active;

  const { error } = await supabase.from("providers").update(dbPatch).eq("id", id);
  if (error) console.error("updateProviderDB error:", error);
}

export async function deleteProviderDB(id: string): Promise<void> {
  const { error } = await supabase.from("providers").delete().eq("id", id);
  if (error) console.error("deleteProviderDB error:", error);
}

// ===== SHIFTS =====

function mapShiftFromDB(row: any): Shift {
  return {
    id: row.id,
    name: row.name,
    startTime: row.start_time,
    endTime: row.end_time,
    days: row.days || [1, 2, 3, 4, 5],
    color: row.color || "#22D3EE",
  };
}

export async function fetchShifts(): Promise<Shift[]> {
  const { data, error } = await supabase.from("shifts").select("*").order("created_at");
  if (error) {
    console.error("fetchShifts error:", error);
    return [];
  }
  return (data || []).map(mapShiftFromDB);
}

export async function insertShift(s: Shift): Promise<void> {
  const { error } = await supabase.from("shifts").insert({
    id: s.id,
    name: s.name,
    start_time: s.startTime,
    end_time: s.endTime,
    days: s.days,
    color: s.color,
  });
  if (error) console.error("insertShift error:", error);
}

export async function updateShiftDB(id: string, patch: Partial<Shift>): Promise<void> {
  const dbPatch: any = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.startTime !== undefined) dbPatch.start_time = patch.startTime;
  if (patch.endTime !== undefined) dbPatch.end_time = patch.endTime;
  if (patch.days !== undefined) dbPatch.days = patch.days;
  if (patch.color !== undefined) dbPatch.color = patch.color;

  const { error } = await supabase.from("shifts").update(dbPatch).eq("id", id);
  if (error) console.error("updateShiftDB error:", error);
}

export async function deleteShiftDB(id: string): Promise<void> {
  const { error } = await supabase.from("shifts").delete().eq("id", id);
  if (error) console.error("deleteShiftDB error:", error);
}

// ===== TIME RECORDS =====

function mapRecordFromDB(row: any): TimeRecord {
  const checkInDate = new Date(row.check_in);
  return {
    id: row.id,
    providerId: row.provider_id,
    checkIn: row.check_in,
    checkOut: row.check_out || null,
    status: row.check_out ? "completed" : "active",
    date: checkInDate.toISOString().split("T")[0],
  };
}

export async function fetchTimeRecords(): Promise<TimeRecord[]> {
  const { data, error } = await supabase
    .from("time_records")
    .select("*")
    .order("check_in", { ascending: false });
  if (error) {
    console.error("fetchTimeRecords error:", error);
    return [];
  }
  return (data || []).map(mapRecordFromDB);
}

export async function fetchTodayRecords(): Promise<TimeRecord[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data, error } = await supabase
    .from("time_records")
    .select("*")
    .gte("check_in", today.toISOString())
    .lt("check_in", tomorrow.toISOString())
    .order("check_in", { ascending: false });
  if (error) {
    console.error("fetchTodayRecords error:", error);
    return [];
  }
  return (data || []).map(mapRecordFromDB);
}

export async function insertCheckIn(providerId: string): Promise<TimeRecord> {
  const now = new Date();
  const id = "rec-" + Date.now();
  const { error } = await supabase.from("time_records").insert({
    id,
    provider_id: providerId,
    check_in: now.toISOString(),
  });
  if (error) console.error("insertCheckIn error:", error);
  return {
    id,
    providerId,
    checkIn: now.toISOString(),
    checkOut: null,
    status: "active",
    date: now.toISOString().split("T")[0],
  };
}

export async function insertCheckOut(
  recordId: string,
  checkInTime: string,
): Promise<{ success: boolean; message: string }> {
  const diffMinutes = (Date.now() - new Date(checkInTime).getTime()) / 60000;
  const remaining = Math.ceil(MIN_EXIT_MINUTES - diffMinutes);
  if (diffMinutes < MIN_EXIT_MINUTES) {
    return { success: false, message: `Saída bloqueada. Aguarde mais ${remaining} minuto(s).` };
  }
  const { error } = await supabase
    .from("time_records")
    .update({ check_out: new Date().toISOString() })
    .eq("id", recordId);
  if (error) {
    console.error("insertCheckOut error:", error);
    return { success: false, message: "Erro ao registrar saída." };
  }
  return { success: true, message: "Saída registrada com sucesso!" };
}

export async function fetchActiveRecord(providerId: string): Promise<TimeRecord | null> {
  const { data, error } = await supabase
    .from("time_records")
    .select("*")
    .eq("provider_id", providerId)
    .is("check_out", null)
    .order("check_in", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return mapRecordFromDB(data);
}

// ===== KIOSK SETTINGS =====

export interface KioskImage {
  id: string;
  url: string;
  label: string;
}

export interface KioskSettings {
  images: KioskImage[];
  idleTimeoutSec: number;
  slideIntervalSec: number;
  showClock: boolean;
  message: string;
}

export async function fetchKioskSettings(): Promise<KioskSettings> {
  const defaults: KioskSettings = {
    images: [],
    idleTimeoutSec: 30,
    slideIntervalSec: 8,
    showClock: true,
    message: "Toque na tela para registrar seu ponto",
  };
  const { data, error } = await supabase
    .from("kiosk_settings")
    .select("*")
    .eq("id", "default")
    .maybeSingle();
  if (error || !data) return defaults;
  return {
    images: data.images || [],
    idleTimeoutSec: data.idle_timeout_sec ?? 30,
    slideIntervalSec: data.slide_interval_sec ?? 8,
    showClock: data.show_clock ?? true,
    message: data.message || defaults.message,
  };
}

export async function updateKioskSettingsDB(patch: Partial<KioskSettings>): Promise<void> {
  const dbPatch: any = { updated_at: new Date().toISOString() };
  if (patch.images !== undefined) dbPatch.images = patch.images;
  if (patch.idleTimeoutSec !== undefined) dbPatch.idle_timeout_sec = patch.idleTimeoutSec;
  if (patch.slideIntervalSec !== undefined) dbPatch.slide_interval_sec = patch.slideIntervalSec;
  if (patch.showClock !== undefined) dbPatch.show_clock = patch.showClock;
  if (patch.message !== undefined) dbPatch.message = patch.message;
  const { error } = await supabase.from("kiosk_settings").update(dbPatch).eq("id", "default");
  if (error) console.error("updateKioskSettingsDB error:", error);
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
}

function mapKioskMonitorFromDB(row: any): KioskMonitorData {
  return {
    id: row.id,
    name: row.name || "Quiosque",
    location: row.location || "",
    cameraActive: row.camera_active,
    snapshotUrl: row.snapshot_url || "",
    kioskOnline: row.kiosk_online,
    lastHeartbeat: row.last_heartbeat,
  };
}

/** Fetch all registered kiosks */
export async function fetchAllKiosks(): Promise<KioskMonitorData[]> {
  const { data, error } = await supabase
    .from("kiosk_monitor")
    .select("*")
    .order("name");
  if (error) {
    console.error("fetchAllKiosks error:", error);
    return [];
  }
  return (data || []).map(mapKioskMonitorFromDB);
}

/** Fetch single kiosk by ID */
export async function fetchKioskMonitor(kioskId: string = "default"): Promise<KioskMonitorData> {
  const { data, error } = await supabase
    .from("kiosk_monitor")
    .select("*")
    .eq("id", kioskId)
    .maybeSingle();
  if (error || !data) {
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
  return mapKioskMonitorFromDB(data);
}

/** Register or update kiosk (upsert) */
export async function registerKiosk(kioskId: string, name: string, location: string): Promise<void> {
  const { error } = await supabase.from("kiosk_monitor").upsert({
    id: kioskId,
    name,
    location,
    kiosk_online: true,
    last_heartbeat: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) console.error("registerKiosk error:", error);
}

/** Update kiosk monitor fields by ID */
export async function updateKioskMonitorDB(
  kioskId: string,
  patch: Partial<{
    camera_active: boolean;
    snapshot_url: string;
    kiosk_online: boolean;
    last_heartbeat: string;
    name: string;
    location: string;
  }>,
): Promise<void> {
  const { error } = await supabase
    .from("kiosk_monitor")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", kioskId);
  if (error) console.error("updateKioskMonitorDB error:", error);
}

/** Delete a kiosk */
export async function deleteKioskDB(kioskId: string): Promise<void> {
  const { error } = await supabase.from("kiosk_monitor").delete().eq("id", kioskId);
  if (error) console.error("deleteKioskDB error:", error);
}

// ===== STORAGE =====

export async function uploadSnapshot(blob: Blob, kioskId: string = "default"): Promise<string> {
  // Use a fixed filename per kiosk so we overwrite each time (avoids accumulating files)
  const filename = `${kioskId}/live.jpg`;
  const { error } = await supabase.storage
    .from("kiosk-snapshots")
    .upload(filename, blob, { contentType: "image/jpeg", upsert: true });
  if (error) {
    console.error("uploadSnapshot error:", error);
    return "";
  }
  const { data: urlData } = supabase.storage.from("kiosk-snapshots").getPublicUrl(filename);
  // Append timestamp to bust CDN/browser cache
  return `${urlData.publicUrl}?t=${Date.now()}`;
}

export async function uploadKioskImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `screensaver/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from('kiosk-images')
    .upload(filename, file, { contentType: file.type, upsert: false });
  if (error) {
    console.error('uploadKioskImage error:', error);
    return '';
  }
  const { data: urlData } = supabase.storage.from('kiosk-images').getPublicUrl(filename);
  return urlData.publicUrl;
}

export async function deleteKioskImage(url: string): Promise<void> {
  // Extract path from public URL
  const match = url.match(/kiosk-images\/(.+)$/);
  if (!match) return;
  const path = match[1].split('?')[0];
  const { error } = await supabase.storage.from('kiosk-images').remove([path]);
  if (error) console.error('deleteKioskImage error:', error);
}

export async function uploadFacePhoto(blob: Blob, providerId: string, index: number): Promise<string> {
  const filename = `${providerId}/face-${index}-${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from("face-photos")
    .upload(filename, blob, { contentType: "image/jpeg", upsert: true });
  if (error) {
    console.error("uploadFacePhoto error:", error);
    return "";
  }
  const { data: urlData } = supabase.storage.from("face-photos").getPublicUrl(filename);
  return urlData.publicUrl;
}
