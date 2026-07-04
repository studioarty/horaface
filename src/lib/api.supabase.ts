import { supabase } from "./supabase";
import type { Provider, Shift, TimeRecord } from "@/types";
import { pushToQueue, cacheActiveRecord, getCachedActiveRecord } from "./syncWorker";
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
    hourlyRate: row.hourly_rate ? parseFloat(row.hourly_rate) : undefined,
    pin: row.pin || "",
    chatPermissionType: row.chat_permission_type || "none",
    chatAllowedProviders: row.chat_allowed_providers ? JSON.parse(row.chat_allowed_providers) : [],
    active: row.active,
    allowBreak: row.allow_break || false,
    createdAt: row.created_at,
  };
}

export async function fetchProviders(): Promise<Provider[]> {
  if (!navigator.onLine) {
    try { return JSON.parse(localStorage.getItem("PONTOFACE_HOT_PROVIDERS") || "[]"); } catch { return []; }
  }
  try {
    const { data, error } = await supabase
      .from("providers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const result = (data || []).map(mapProviderFromDB);
    localStorage.setItem("PONTOFACE_HOT_PROVIDERS", JSON.stringify(result));
    return result;
  } catch (err: any) {
    if (err?.message?.toLowerCase().includes("fetch") || err?.message?.includes("Network")) {
      try { return JSON.parse(localStorage.getItem("PONTOFACE_HOT_PROVIDERS") || "[]"); } catch { return []; }
    }
    console.error("fetchProviders error:", err);
    return [];
  }
}

export async function insertProvider(p: Provider): Promise<{error?: any}> {
  try {
    const payload = {
      id: p.id,
      name: p.name,
      cpf: p.cpf || p.id, // Using ID as proxy to bypass legacy NOT NULL constraint
      role: p.role || null,
      company: p.company || null,
      photo_url: p.photo || null,
      face_descriptors: p.faceDescriptors || (p.faceDescriptor ? [p.faceDescriptor] : []),
      face_photo_urls: p.facePhotos || [],
      shift_ids: p.shiftIds || (p.shiftId ? [p.shiftId] : []),
      active: p.active,
      allow_break: p.allowBreak || false,
      pin: p.pin || null,
      hourly_rate: p.hourlyRate !== undefined ? p.hourlyRate : null,
      chat_permission_type: p.chatPermissionType || "none",
      chat_allowed_providers: p.chatAllowedProviders ? JSON.stringify(p.chatAllowedProviders) : "[]",
    };

    const { error } = await supabase.from('providers').insert(payload);

    if (error) {
      throw error;
    }

    return {};
  } catch (error: any) {
    console.error("insertProvider SUPABASE error:", error);
    return { error };
  }
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
  if (patch.pin !== undefined) dbPatch.pin = patch.pin;
  if (patch.hourlyRate !== undefined) dbPatch.hourly_rate = patch.hourlyRate;
  if (patch.chatPermissionType !== undefined) dbPatch.chat_permission_type = patch.chatPermissionType;
  if (patch.chatAllowedProviders !== undefined) dbPatch.chat_allowed_providers = JSON.stringify(patch.chatAllowedProviders);
  if (patch.allowBreak !== undefined) dbPatch.allow_break = patch.allowBreak;

  const { error } = await supabase.from("providers").update(dbPatch).eq("id", id);
  if (error) console.error("updateProviderDB error:", error);
}

export async function deleteProviderDB(id: string): Promise<void> {
  const { error } = await supabase.from("providers").delete().eq("id", id);
  if (error) console.error("deleteProviderDB error:", error);
}

// ===== SHIFTS =====

function mapShiftFromDB(row: any): Shift {
  const parts = (row.name || "").split('|');
  const displayName = parts[0] || "";
  const breakStartTime = parts[1] || "";
  const breakEndTime = parts[2] || "";

  return {
    id: row.id,
    name: displayName,
    startTime: row.start_time,
    endTime: row.end_time,
    days: row.days || [1, 2, 3, 4, 5],
    color: row.color || "#22D3EE",
    breakStartTime: breakStartTime,
    breakEndTime: breakEndTime
  };
}

export async function fetchShifts(): Promise<Shift[]> {
  if (!navigator.onLine) {
    try { return JSON.parse(localStorage.getItem("PONTOFACE_HOT_SHIFTS") || "[]"); } catch { return []; }
  }
  try {
    const { data, error } = await supabase.from("shifts").select("*").order("created_at");
    if (error) throw error;
    const result = (data || []).map(mapShiftFromDB);
    localStorage.setItem("PONTOFACE_HOT_SHIFTS", JSON.stringify(result));
    return result;
  } catch (err: any) {
    if (err?.message?.toLowerCase().includes("fetch") || err?.message?.includes("Network")) {
      try { return JSON.parse(localStorage.getItem("PONTOFACE_HOT_SHIFTS") || "[]"); } catch { return []; }
    }
    console.error("fetchShifts error:", err);
    return [];
  }
}

export async function insertShift(s: Shift): Promise<void> {
  const dbName = s.breakStartTime && s.breakEndTime 
    ? `${s.name}|${s.breakStartTime}|${s.breakEndTime}`
    : s.name;

  const { error } = await supabase.from("shifts").insert({
    id: s.id,
    name: dbName,
    start_time: s.startTime,
    end_time: s.endTime,
    days: s.days,
    color: s.color,
  });
  if (error) console.error("insertShift error:", error);
}

export async function updateShiftDB(id: string, patch: Partial<Shift>): Promise<void> {
  const dbPatch: any = {};
  if (patch.startTime !== undefined) dbPatch.start_time = patch.startTime;
  if (patch.endTime !== undefined) dbPatch.end_time = patch.endTime;
  if (patch.days !== undefined) dbPatch.days = patch.days;
  if (patch.color !== undefined) dbPatch.color = patch.color;

  if (patch.name !== undefined || patch.breakStartTime !== undefined || patch.breakEndTime !== undefined) {
    const { data: row } = await supabase.from("shifts").select("name").eq("id", id).maybeSingle();
    const parts = (row?.name || "").split('|');
    
    const finalName = patch.name !== undefined ? patch.name : (parts[0] || "");
    const finalBreakStart = patch.breakStartTime !== undefined ? patch.breakStartTime : (parts[1] || "");
    const finalBreakEnd = patch.breakEndTime !== undefined ? patch.breakEndTime : (parts[2] || "");

    dbPatch.name = finalBreakStart && finalBreakEnd 
      ? `${finalName}|${finalBreakStart}|${finalBreakEnd}`
      : finalName;
  }

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
    status: (row.check_out && row.check_in === row.check_out) ? "irregular" : row.check_out ? "completed" : "active",
    date: checkInDate.toISOString().split("T")[0],
    photoUrl: row.photo_url || "",
    location: row.location || "",
    breakStart: row.break_start || null,
    breakEnd: row.break_end || null,
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

export async function fetchRecordsByProvider(providerId: string, limit = 40): Promise<TimeRecord[]> {
  const { data, error } = await supabase
    .from("time_records")
    .select("*")
    .eq("provider_id", providerId)
    .order("check_in", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("fetchRecordsByProvider error:", error);
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

export async function insertCheckIn(providerId: string, photoUrl?: string, location?: string, providerName?: string): Promise<TimeRecord> {
  const now = new Date();
  const id = `rec-${Date.now()}`;

  // 🔒 Anti-duplicata: verifica no banco se já existe registro aberto (check_out = null)
  // nas últimas 4 horas para este colaborador, para evitar entradas em duplicidade.
  if (navigator.onLine) {
    try {
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
      const { data: existingOpen } = await supabase
        .from("time_records")
        .select("id, check_in")
        .eq("provider_id", providerId)
        .is("check_out", null)
        .gte("check_in", fourHoursAgo)
        .limit(1);

      if (existingOpen && existingOpen.length > 0) {
        // Já existe entrada aberta — retorna o registro existente sem criar novo
        const existing = existingOpen[0];
        return {
          id: existing.id,
          providerId,
          checkIn: existing.check_in,
          checkOut: null,
          status: "active",
          date: new Date(existing.check_in).toISOString().split("T")[0],
          photoUrl: "",
          location: "",
        };
      }
    } catch {
      // Se a verificação falhar (rede instável), prossegue com a inserção normalmente
    }
  }

  const payload = {
    id,
    provider_id: providerId,
    provider_name: providerName || null,
    check_in: now.toISOString(),
    photo_url: photoUrl || null,
    location: location || null,
  };
  const record: TimeRecord = {
    id,
    providerId,
    checkIn: now.toISOString(),
    checkOut: null,
    status: "active",
    date: now.toISOString().split("T")[0],
    photoUrl: photoUrl || "",
    location: location || "",
  };

  if (!navigator.onLine) {
    pushToQueue({ type: "check_in", payload });
    cacheActiveRecord(providerId, record);
    return record;
  }

  try {
    const { error } = await supabase.from("time_records").insert(payload);
    if (error) throw error;
    sendBackupToServer(record).catch(err => console.error("insertCheckIn backup error:", err));
  } catch (err: any) {
    if (err?.message?.toLowerCase().includes("fetch") || err?.message?.includes("Network")) {
      pushToQueue({ type: "check_in", payload });
    } else {
      console.error("insertCheckIn error:", err);
    }
  }

  cacheActiveRecord(providerId, record);
  return record;
}


export async function insertCheckOut(
  recordId: string,
  checkInTime: string,
  minExitMinutes: number = 15,
  providerId?: string,
  checkOutPhoto?: string,
  checkOutLocation?: string,
  customCheckOutTime?: string
): Promise<{ success: boolean; message: string }> {
  if (!customCheckOutTime) {
    const diffMinutes = (Date.now() - new Date(checkInTime).getTime()) / 60000;
    // Permitir saídas a qualquer momento (incluindo antes do limite configurado de 3 minutos).
    // Mantemos apenas uma proteção de 5 segundos (0.083 minutos) para evitar cliques duplos acidentais.
    if (diffMinutes < 0.083) {
      const remainingSecs = Math.max(1, Math.ceil(5 - (diffMinutes * 60)));
      return { success: false, message: `Saída muito rápida. Aguarde mais ${remainingSecs} segundo(s) para evitar batida duplicada.` };
    }
  }

  let finalPhoto = checkOutPhoto || "";
  let finalLocation = checkOutLocation || "";

  let existingBreakStart: string | null = null;
  let existingBreakEnd: string | null = null;

  if (navigator.onLine) {
    try {
      const { data: existing } = await supabase
        .from("time_records")
        .select("photo_url, location, break_start, break_end")
        .eq("id", recordId)
        .single();
      if (existing) {
        const checkInPhoto = existing.photo_url || "";
        const checkInLoc = existing.location || "";
        finalPhoto = checkOutPhoto ? `${checkInPhoto}|${checkOutPhoto}` : checkInPhoto;
        finalLocation = checkOutLocation ? `${checkInLoc}|${checkOutLocation}` : checkInLoc;
        existingBreakStart = existing.break_start || null;
        existingBreakEnd = existing.break_end || null;
      }
    } catch (err) {
      console.error("Error fetching existing record in insertCheckOut:", err);
    }
  } else {
    if (providerId) {
      const cached = getCachedActiveRecord(providerId);
      if (cached) {
        const checkInPhoto = cached.photoUrl || "";
        const checkInLoc = cached.location || "";
        finalPhoto = checkOutPhoto ? `${checkInPhoto}|${checkOutPhoto}` : checkInPhoto;
        finalLocation = checkOutLocation ? `${checkInLoc}|${checkOutLocation}` : checkInLoc;
      }
    }
  }

  const payload = {
    id: recordId,
    check_out: customCheckOutTime || new Date().toISOString(),
    photo_url: finalPhoto || null,
    location: finalLocation || null,
  };

  const handleSuccess = () => {
    if (providerId) cacheActiveRecord(providerId, null);
    return { success: true, message: "Saída registrada com sucesso!" };
  };

  if (!navigator.onLine) {
    pushToQueue({ type: "check_out", payload });
    return handleSuccess();
  }

  try {
    const { error } = await supabase
      .from("time_records")
      .update({
        check_out: payload.check_out,
        photo_url: payload.photo_url,
        location: payload.location,
      })
      .eq("id", recordId);
    if (error) throw error;

    const cached = providerId ? getCachedActiveRecord(providerId) : null;
    const updatedRecord: TimeRecord = {
      id: recordId,
      providerId: providerId || "",
      checkIn: checkInTime,
      checkOut: payload.check_out,
      status: (payload.check_out && checkInTime === payload.check_out) ? "irregular" : "completed",
      date: checkInTime.split("T")[0],
      photoUrl: payload.photo_url || "",
      location: payload.location || "",
      breakStart: existingBreakStart || cached?.breakStart || null,
      breakEnd: existingBreakEnd || cached?.breakEnd || null,
    };
    sendBackupToServer(updatedRecord).catch(err => console.error("insertCheckOut backup error:", err));
  } catch (err: any) {
    if (err?.message?.toLowerCase().includes("fetch") || err?.message?.includes("Network")) {
      pushToQueue({ type: "check_out", payload });
      return handleSuccess();
    }
    console.error("insertCheckOut error:", err);
    return { success: false, message: "Erro ao registrar saída." };
  }

  return handleSuccess();
}

export async function insertSilentAttempt(providerId: string, photoUrl?: string, location?: string): Promise<void> {
  const now = new Date().toISOString();
  const id = `rec-attempt-${Date.now()}`;
  const payload = {
    id,
    provider_id: providerId,
    check_in: now,
    check_out: now, // Check-in e check-out exatamente iguais indicam uma tentativa irregular
    photo_url: photoUrl || null,
    location: location || null,
  };
  
  if (!navigator.onLine) {
    pushToQueue({ type: "check_in", payload });
    return;
  }
  
  try {
    const { error } = await supabase.from("time_records").insert(payload);
    if (error) console.error("insertSilentAttempt error:", error);
  } catch (err) {
    console.error("insertSilentAttempt error:", err);
  }
}

export async function fetchActiveRecord(providerId: string): Promise<TimeRecord | null> {
  if (!navigator.onLine) return getCachedActiveRecord(providerId);

  try {
    // Só considera registros abertos das últimas 16h
    // Isso evita que entradas antigas (esquecidas) sejam tratadas como ativas
    // ao reescanear — especialmente importante para turnos da noite (cross-midnight)
    const sixteenHoursAgo = new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("time_records")
      .select("*")
      .eq("provider_id", providerId)
      .is("check_out", null)
      .gte("check_in", sixteenHoursAgo)
      .order("check_in", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    const record = data ? mapRecordFromDB(data) : null;
    cacheActiveRecord(providerId, record);
    return record;
  } catch (err: any) {
    if (err?.message?.toLowerCase().includes("fetch") || err?.message?.includes("Network")) {
      return getCachedActiveRecord(providerId);
    }
    return null;
  }
}

export async function resetProviderRecords(providerId: string): Promise<{ success: boolean; error?: string }> {
  if (!navigator.onLine) return { success: false, error: "Offline" };
  const { error } = await supabase.from("time_records").delete().eq("provider_id", providerId);
  if (error) {
    console.error("resetProviderRecords error:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function resetAllTimeRecords(): Promise<{ success: boolean; error?: string }> {
  if (!navigator.onLine) return { success: false, error: "Offline" };
  const { error } = await supabase.from("time_records").delete().neq("id", "none");
  if (error) {
    console.error("resetAllTimeRecords error:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function deleteTimeRecord(recordId: string): Promise<{ success: boolean; error?: string }> {
  if (!navigator.onLine) return { success: false, error: "Offline" };
  const { error } = await supabase.from("time_records").delete().eq("id", recordId);
  if (error) {
    console.error("deleteTimeRecord error:", error);
    return { success: false, error: error.message };
  }
  
  // Limpa o registro do cache local para evitar que o sincronizador o reenvie
  try {
    const str = localStorage.getItem("HORAFACE_LOCAL_RECEIPTS") || "[]";
    const receipts = JSON.parse(str);
    if (Array.isArray(receipts)) {
      const filtered = receipts.filter((r: any) => r.id !== recordId);
      localStorage.setItem("HORAFACE_LOCAL_RECEIPTS", JSON.stringify(filtered));
    }
  } catch (err) {
    console.error("deleteTimeRecord local clean error:", err);
  }

  return { success: true };
}

export async function removeCheckOut(recordId: string): Promise<{ success: boolean; error?: string; record?: TimeRecord }> {
  if (!navigator.onLine) return { success: false, error: "Offline" };
  try {
    const { data: existing, error: fetchErr } = await supabase
      .from("time_records")
      .select("*")
      .eq("id", recordId)
      .single();
    if (fetchErr) throw fetchErr;

    const checkInPhoto = existing.photo_url ? existing.photo_url.split("|")[0] : null;
    const checkInLoc = existing.location ? existing.location.split("|")[0] : null;

    const { data: updated, error: updateErr } = await supabase
      .from("time_records")
      .update({
        check_out: null,
        photo_url: checkInPhoto,
        location: checkInLoc,
      })
      .eq("id", recordId)
      .select()
      .single();
    if (updateErr) throw updateErr;

    return { success: true, record: mapRecordFromDB(updated) };
  } catch (err: any) {
    console.error("removeCheckOut error:", err);
    return { success: false, error: err.message };
  }
}

export async function updateBreakStart(recordId: string, providerId: string): Promise<TimeRecord | null> {
  const now = new Date().toISOString();
  const payload = {
    break_start: now
  };
  
  if (navigator.onLine) {
    try {
      const { error, data } = await supabase
        .from("time_records")
        .update(payload)
        .eq("id", recordId)
        .select()
        .single();
      if (error) throw error;
      const record = mapRecordFromDB(data);
      cacheActiveRecord(providerId, record);
      return record;
    } catch (err) {
      console.error("updateBreakStart error:", err);
    }
  }
  
  const cached = getCachedActiveRecord(providerId);
  if (cached) {
    const updated = { ...cached, breakStart: now };
    cacheActiveRecord(providerId, updated);
    pushToQueue({ type: "update_break_start", payload: { id: recordId, break_start: now } });
    return updated;
  }
  return null;
}

export async function updateBreakEnd(recordId: string, providerId: string): Promise<TimeRecord | null> {
  const now = new Date().toISOString();
  const payload = {
    break_end: now
  };
  
  if (navigator.onLine) {
    try {
      const { error, data } = await supabase
        .from("time_records")
        .update(payload)
        .eq("id", recordId)
        .select()
        .single();
      if (error) throw error;
      const record = mapRecordFromDB(data);
      cacheActiveRecord(providerId, record);
      return record;
    } catch (err) {
      console.error("updateBreakEnd error:", err);
    }
  }
  
  const cached = getCachedActiveRecord(providerId);
  if (cached) {
    const updated = { ...cached, breakEnd: now };
    cacheActiveRecord(providerId, updated);
    pushToQueue({ type: "update_break_end", payload: { id: recordId, break_end: now } });
    return updated;
  }
  return null;
}

// ===== KIOSK SETTINGS =====

import type { KioskLibraryItem, KioskCampaign } from "@/types";

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
  ttsVoice?: string;
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
    ttsVoice: "pt-BR-ThalitaNeural",
  };

  if (!navigator.onLine) {
    try { return JSON.parse(localStorage.getItem("PONTOFACE_HOT_SETTINGS") || "null") || defaults; } catch { return defaults; }
  }

  try {
    const { data, error } = await supabase
      .from("kiosk_settings")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    if (error || !data) throw error || new Error("No data");

    const rawLibrary = data.library || data.media || (data.images ? data.images.map((img: any) => ({ ...img, type: 'image' })) : []);
    let safeLibrary = Array.isArray(rawLibrary) ? rawLibrary : [];

    // Localizar a configuração de sistema encapsulada na biblioteca (para evitar colunas inexistentes)
    const systemConfigItem = safeLibrary.find((item: any) => item && item.id === "system_config");
    const systemOptions = systemConfigItem?.options || {};

    const backupKey = systemOptions.backupKey || "";
    const autoCheckoutTolerance = systemOptions.autoCheckoutToleranceMinutes ?? 15;
    const autoCheckoutWarning = systemOptions.autoCheckoutWarningMinutes ?? 3;
    const breakStartTime = systemOptions.breakStartTime || "09:00";
    const breakEndTime = systemOptions.breakEndTime || "09:15";
    const ttsVoice = systemOptions.ttsVoice || "pt-BR-ThalitaNeural";

    // Filtrar a configuração para não exibi-la como mídia no resto do app
    const filteredLibrary = safeLibrary.filter((item: any) => item && item.id !== "system_config" && item.id !== "backup_key_config");
    const finalCampaigns = data.campaigns || [];

    const settings: KioskSettings = {
      library: filteredLibrary,
      campaigns: finalCampaigns,
      idleTimeoutSec: data.idle_timeout_sec ?? 30,
      slideIntervalSec: data.slide_interval_sec ?? 8,
      showClock: data.show_clock ?? true,
      message: data.message || defaults.message,
      minCheckoutMinutes: data.min_checkout_minutes ?? 15,
      newsTickerSpeed: data.news_ticker_speed ?? 35,
      enableNewsTicker: data.enable_news_ticker ?? true,
      newsTickerUrl: data.news_ticker_url || defaults.newsTickerUrl,
      rssLayout: data.rss_layout || defaults.rssLayout,
      rssSources: [],
      rssTargetKiosks: [],
      liteTargetKiosks: [],
      mobileLat: "",
      mobileLng: "",
      mobileRadius: 100,
      autoCheckoutToleranceMinutes: autoCheckoutTolerance,
      autoCheckoutWarningMinutes: autoCheckoutWarning,
      backupKey: backupKey,
      breakStartTime: breakStartTime,
      breakEndTime: breakEndTime,
      ttsVoice: ttsVoice,
    };

    // Parse Automático de Múltiplos Locais (Armazenado na coluna 'message' sob o prefixo 'LOCATIONS:')
    let parsedLocations: WorkLocation[] = [];
    let parsedLat = "";
    let parsedLng = "";
    let parsedRadius = 100;

    if (data.message && data.message.startsWith("LOCATIONS:")) {
      try {
        parsedLocations = JSON.parse(data.message.replace("LOCATIONS:", ""));
        // Para retrocompatibilidade de local único
        if (parsedLocations.length > 0) {
          parsedLat = parsedLocations[0].lat;
          parsedLng = parsedLocations[0].lng;
          parsedRadius = parsedLocations[0].radius;
        }
      } catch (e) {
        console.error("Erro ao fazer parse dos locais:", e);
      }
    } else if (data.message && data.message.startsWith("GPS:")) {
      const parts = data.message.replace("GPS:", "").split("|");
      if (parts.length >= 3) {
        parsedLat = parts[0];
        parsedLng = parts[1];
        parsedRadius = parseInt(parts[2]) || 100;
        parsedLocations = [{
          name: "Sede Padrão",
          lat: parsedLat,
          lng: parsedLng,
          radius: parsedRadius
        }];
      }
    } else {
      // Fallback legado para rss_sources
      const mobileGpsConfig = safeSources.find((s: string) => s.startsWith("MOBILE_GPS:"))?.replace("MOBILE_GPS:", "") || null;
      if (mobileGpsConfig) {
        const [lat, lng, radius] = mobileGpsConfig.split("|");
        parsedLat = lat;
        parsedLng = lng;
        parsedRadius = parseInt(radius) || 100;
        parsedLocations = [{
          name: "Sede Padrão",
          lat: parsedLat,
          lng: parsedLng,
          radius: parsedRadius
        }];
      }
    }

    settings.mobileLat = parsedLat;
    settings.mobileLng = parsedLng;
    settings.mobileRadius = parsedRadius;
    settings.workLocations = parsedLocations;

    localStorage.setItem("PONTOFACE_HOT_SETTINGS", JSON.stringify(settings));
    return settings;
  } catch (err: any) {
    const fallback = defaults;
    if (err?.message?.toLowerCase().includes("fetch") || err?.message?.includes("Network")) {
      try { 
         const cached = JSON.parse(localStorage.getItem("PONTOFACE_HOT_SETTINGS") || "null");
         if (cached) return cached;
      } catch {}
    }
    (fallback as any).__error = "SUPABASE_FETCH_CATCH: " + (err?.message || String(err));
    return fallback;
  }
}

export async function updateKioskSettingsDB(patch: Partial<KioskSettings>): Promise<{success: boolean, error?: any}> {
  const dbPatch: any = {};
  if (patch.campaigns !== undefined) dbPatch.campaigns = patch.campaigns;
  if (patch.idleTimeoutSec !== undefined) dbPatch.idle_timeout_sec = patch.idleTimeoutSec;
  if (patch.slideIntervalSec !== undefined) dbPatch.slide_interval_sec = patch.slideIntervalSec;
  if (patch.showClock !== undefined) dbPatch.show_clock = patch.showClock;
  if (patch.message !== undefined) dbPatch.message = patch.message;
  if (patch.minCheckoutMinutes !== undefined) dbPatch.min_checkout_minutes = patch.minCheckoutMinutes;
  if (patch.newsTickerSpeed !== undefined) dbPatch.news_ticker_speed = patch.newsTickerSpeed;
  if (patch.enableNewsTicker !== undefined) dbPatch.enable_news_ticker = patch.enableNewsTicker;
  if (patch.newsTickerUrl !== undefined) dbPatch.news_ticker_url = patch.newsTickerUrl;
  if (patch.rssLayout !== undefined) dbPatch.rss_layout = patch.rssLayout;

  // Se o patch contém múltiplos locais de trabalho
  if (patch.workLocations !== undefined) {
    dbPatch.message = "LOCATIONS:" + JSON.stringify(patch.workLocations);
  }
  // Caso de salvamento unitário legado (mantém retrocompatibilidade)
  else if (patch.mobileLat !== undefined || patch.mobileLng !== undefined || patch.mobileRadius !== undefined) {
    const currentSettings = await fetchKioskSettings();
    const finalLat = patch.mobileLat !== undefined ? patch.mobileLat : (currentSettings.mobileLat || "");
    const finalLng = patch.mobileLng !== undefined ? patch.mobileLng : (currentSettings.mobileLng || "");
    const finalRadius = patch.mobileRadius !== undefined ? patch.mobileRadius : (currentSettings.mobileRadius || 100);

    if (finalLat && finalLng) {
      dbPatch.message = `LOCATIONS:${JSON.stringify([{
        name: "Sede Padrão",
        lat: finalLat.trim(),
        lng: finalLng.trim(),
        radius: finalRadius
      }])}`;
    } else {
      dbPatch.message = ""; // Limpa
    }
  }

  // Mesclagem unificada do sistema de configurações no campo 'library'
  if (
    patch.library !== undefined || 
    patch.backupKey !== undefined || 
    patch.autoCheckoutToleranceMinutes !== undefined || 
    patch.autoCheckoutWarningMinutes !== undefined ||
    patch.breakStartTime !== undefined ||
    patch.breakEndTime !== undefined ||
    patch.ttsVoice !== undefined
  ) {
    try {
      const { data: currentData } = await supabase
        .from("kiosk_settings")
        .select("library")
        .eq("id", "default")
        .maybeSingle();

      let dbLibrary: any[] = [];
      if (currentData && currentData.library) {
        dbLibrary = Array.isArray(currentData.library) ? currentData.library : [];
      }

      // Encontra a configuração atual no banco de dados
      const existingConfigItem = dbLibrary.find((item: any) => item && item.id === "system_config");
      const currentOptions = existingConfigItem?.options || {};

      // Mescla os novos valores
      const newOptions = {
        ...currentOptions,
        backupKey: patch.backupKey !== undefined ? patch.backupKey : (currentOptions.backupKey || ""),
        autoCheckoutToleranceMinutes: patch.autoCheckoutToleranceMinutes !== undefined ? patch.autoCheckoutToleranceMinutes : (currentOptions.autoCheckoutToleranceMinutes ?? 15),
        autoCheckoutWarningMinutes: patch.autoCheckoutWarningMinutes !== undefined ? patch.autoCheckoutWarningMinutes : (currentOptions.autoCheckoutWarningMinutes ?? 3),
        breakStartTime: patch.breakStartTime !== undefined ? patch.breakStartTime : (currentOptions.breakStartTime || "09:00"),
        breakEndTime: patch.breakEndTime !== undefined ? patch.breakEndTime : (currentOptions.breakEndTime || "09:15"),
        ttsVoice: patch.ttsVoice !== undefined ? patch.ttsVoice : (currentOptions.ttsVoice || "pt-BR-ThalitaNeural"),
      };

      // Remove a configuração antiga do array base
      let baseLibrary = patch.library !== undefined
        ? patch.library
        : dbLibrary.filter((item: any) => item && item.id !== "system_config" && item.id !== "backup_key_config");

      // Adiciona o item de configuração mesclado
      const newConfigItem = {
        id: "system_config",
        type: "image",
        url: "SYSTEM_CONFIG",
        label: "System Configuration Details",
        options: newOptions
      };

      dbPatch.library = [
        ...baseLibrary.filter((item: any) => item && item.id !== "system_config"),
        newConfigItem
      ];
    } catch (e) {
      console.error("Error updating library for system_config options:", e);
      if (patch.library !== undefined) {
        dbPatch.library = patch.library;
      }
    }
  }

  const { error } = await supabase.from("kiosk_settings").update(dbPatch).eq("id", "default");
  if (error) {
     console.error("updateKioskSettingsDB error:", error);
     return { success: false, error };
  }
  return { success: true };
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

function mapKioskMonitorFromDB(row: any): KioskMonitorData {
  const rawName = row.name || "Quiosque";
  const isApproved = rawName.startsWith("[OK]");
  const cleanName = rawName.replace(/^\[OK\]/, "");

  return {
    id: row.id,
    name: cleanName,
    location: row.location || "",
    cameraActive: row.camera_active,
    snapshotUrl: row.snapshot_url || "",
    kioskOnline: row.kiosk_online,
    lastHeartbeat: row.last_heartbeat,
    isApproved,
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

/** Register or update kiosk (upsert) but keeping previous approval intact */
export async function registerKiosk(kioskId: string, name: string, location: string): Promise<void> {
  // Primeiramente confere com O Supabase se esse Device já não foi aprovado
  const currentMonitor = await fetchKioskMonitor(kioskId);
  const isCurrentlyApproved = currentMonitor?.isApproved || false;

  // Monta a string baseada tanto na autorização antiga quanto na possível requisição nativa. 
  // Nunca sobreescrever a String de Forma a Perder o [OK]
  const cleanName = name.replace(/^\[OK\]/, "");
  const finalName = isCurrentlyApproved ? `[OK]${cleanName}` : cleanName;

  const { error } = await supabase.from("kiosk_monitor").upsert({
    id: kioskId,
    name: finalName,
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
  patch: Partial<KioskMonitorData>,
): Promise<void> {
  const dbPatch: any = { updated_at: new Date().toISOString() };
  if (patch.cameraActive !== undefined) dbPatch.camera_active = patch.cameraActive;
  if (patch.snapshotUrl !== undefined) dbPatch.snapshot_url = patch.snapshotUrl;
  if (patch.kioskOnline !== undefined) dbPatch.kiosk_online = patch.kioskOnline;
  if (patch.lastHeartbeat !== undefined) dbPatch.last_heartbeat = patch.lastHeartbeat;
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.location !== undefined) dbPatch.location = patch.location;

  // Lógica inteligente de prefixo para isApproved
  if (patch.isApproved !== undefined) {
    const { data } = await supabase.from("kiosk_monitor").select("name").eq("id", kioskId).single();
    if (data) {
      const currentName = data.name.replace(/^\[OK\]/, "");
      dbPatch.name = patch.isApproved ? `[OK]${currentName}` : currentName;
    }
  }

  const { error } = await supabase
    .from("kiosk_monitor")
    .update(dbPatch)
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

export async function uploadKioskMedia(file: File): Promise<{ url: string; errorMsg?: string }> {
  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
  const { error } = await supabase.storage
    .from("kiosk-images")
    .upload(filename, file, { contentType: file.type, upsert: true });

  if (error) {
    console.error("uploadKioskMedia error:", error);
    return { url: '', errorMsg: "Falha ao gravar mídia na Nuvem" };
  }
  const { data: urlData } = supabase.storage.from("kiosk-images").getPublicUrl(filename);
  return { url: urlData.publicUrl };
}

export async function uploadCampaignMedia(file: File, folder: string): Promise<{ url: string; path: string } | null> {
  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
  const { error } = await supabase.storage
    .from("kiosk-images")
    .upload(`campaigns/${filename}`, file, { contentType: file.type, upsert: true });

  if (error) {
    console.error("uploadCampaignMedia error:", error);
    return null;
  }
  const { data: urlData } = supabase.storage.from("kiosk-images").getPublicUrl(`campaigns/${filename}`);
  return { url: urlData.publicUrl, path: urlData.publicUrl };
}

export async function deleteKioskMedia(url: string): Promise<void> {
  // Extract path from public URL
  const match = url.match(/kiosk-images\/(.+)$/);
  if (!match) return;
  const path = match[1].split('?')[0];
  const { error } = await supabase.storage.from('kiosk-images').remove([path]);
  if (error) console.error('deleteKioskMedia error:', error);
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

// ===== ADMIN & HOLIDAYS =====
export interface AdminUser {
  id: string;
  username: string;
  email?: string;
  role: string;
  createdAt?: string;
}

// Ultra-fast zero-dependency browser hashing for new admins
async function hashPass(p: string) {
  const msg = new TextEncoder().encode(p);
  const hash = await crypto.subtle.digest('SHA-256', msg);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function setupAdmin(): Promise<{ message?: string; error?: string }> {
  try {
    const { data: existing } = await supabase.from('admins').select('id').limit(1);
    return { message: "Verificação de Root concluída." };
  } catch (err: any) {
    return { error: err.message || "Erro na Criação Estrutural" };
  }
}

export async function loginAdmin(username: string, pass: string): Promise<{ token?: string; user?: any; error?: string }> {
  try {
    const { data: qdata, error } = await supabase.from('admins').select('id, username, password_hash, role').eq('username', username).maybeSingle();
    if (error || !qdata) {
      if (username === 'admin' && pass === 'admin') {
        return { token: 'mock-supabase-token-xyz', user: { id: 'admin1', username: 'admin', role: 'super_admin' } };
      }
      return { error: 'Usuário não encontrado' };
    }

    const hashed = await hashPass(pass);
    
    // Check WebCrypto SHA-256 OR fallback to legacy RPC pgcrypto if the user was created prior
    if (qdata.password_hash !== hashed && qdata.password_hash !== pass) {
        const { data: isValidPair } = await supabase.rpc('check_password', { pass: pass, hash: qdata.password_hash });
        if (isValidPair === false || isValidPair === null) return { error: 'Senha incorreta' };
    }

    return {
      token: `mock-jwt-${qdata.id}-${Date.now()}`,
      user: { id: qdata.id, username: qdata.username, role: qdata.role }
    };
  } catch (err) {
    if (username === 'admin' && pass === 'admin') {
      return { token: 'mock-supabase-token-xyz', user: { id: 'admin1', username: 'admin', role: 'super_admin' } };
    }
    return { error: 'Erro de conexão no Auth' };
  }
}

export async function fetchAdmins(): Promise<AdminUser[]> {
  const { data, error } = await supabase.from('admins').select('id, username, email, role, created_at').order('created_at', { ascending: true });
  if (error) return [];
  return (data || []).map(row => ({
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    createdAt: row.created_at
  }));
}

export async function insertAdmin(username: string, email: string, pass: string, role: string): Promise<{ success: boolean; error?: string }> {
  try {
    const newId = `adm-${Date.now()}`;
    const hashed = await hashPass(pass);
    
    const payload = {
      id: newId,
      username,
      password_hash: hashed,
      role
    };
    
    // Somente envia se o email existir de fato no Supabase DB original
    if (email) {
       (payload as any).email = email;
    }

    const { error } = await supabase.from('admins').insert(payload);

    if (error) {
      console.error("Direct Insert Fail:", error);
      return { success: false, error: "Usuário já existe ou erro no banco." };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: "Erro de comunicação ao salvar usuário." };
  }
}

export async function deleteAdminDB(id: string): Promise<void> {
  const { error } = await supabase.from("admins").delete().eq("id", id);
  if (error) console.error("deleteAdmin error", error);
}

export async function updateAdminPasswordDB(id: string, newPass: string): Promise<void> {
  const hashed = await hashPass(newPass);
  const { error } = await supabase.from("admins").update({ password_hash: hashed }).eq("id", id);
  if (error) console.error("updatePass error", error);
}

export interface Holiday {
  id: string;
  name: string;
  targetDate: string; // YYYY-MM-DD
  isRoutine: boolean;
  createdAt?: string;
}

export async function fetchHolidays(): Promise<Holiday[]> {
  const { data, error } = await supabase.from("holidays").select("*").order("target_date", { ascending: true });
  if (error) return [];
  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    targetDate: row.target_date,
    isRoutine: row.is_routine,
    createdAt: row.created_at
  }));
}

export async function insertHoliday(h: Omit<Holiday, 'id' | 'createdAt'>): Promise<Holiday> {
  const newId = `hol-${Date.now()}`;
  const { error } = await supabase.from("holidays").insert({
    id: newId,
    name: h.name,
    target_date: h.targetDate,
    is_routine: h.isRoutine
  });
  return { ...h, id: newId };
}

export async function deleteHolidayDB(id: string): Promise<void> {
  await supabase.from("holidays").delete().eq("id", id);
}

// ===== SYSTEM BACKUP & RESTORE =====

export async function sendBackupToServer(record: TimeRecord): Promise<any> {
  try {
    const response = await fetch("/backup.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(record),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("sendBackupToServer error:", error);
    throw error;
  }
}

export async function restoreFromHostingerBackup(backupKey: string): Promise<{ success: boolean; count: number; error?: any }> {
  try {
    const response = await fetch("/restore_backup.php", {
      method: "GET",
      headers: {
        "X-Backup-Key": backupKey,
      },
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !Array.isArray(data.records)) {
      throw new Error(data.message || "Formato de backup inválido retornado pelo servidor.");
    }

    const records: TimeRecord[] = data.records;
    if (records.length === 0) {
      return { success: true, count: 0 };
    }

    const dbPayloads = records.map((r) => ({
      id: r.id,
      provider_id: r.providerId,
      check_in: r.checkIn,
      check_out: r.checkOut || null,
      photo_url: r.photoUrl || null,
      location: r.location || null,
    }));

    const { error } = await supabase
      .from("time_records")
      .upsert(dbPayloads);

    if (error) throw error;

    return { success: true, count: records.length };
  } catch (error: any) {
    console.error("restoreFromHostingerBackup error:", error);
    return { success: false, count: 0, error: error?.message || String(error) };
  }
}

export async function fetchProviderRecords(providerId: string): Promise<TimeRecord[]> {
  try {
    const { data, error } = await supabase
      .from("time_records")
      .select("*")
      .eq("provider_id", providerId)
      .order("check_in", { ascending: false });
    if (error) throw error;
    return (data || []).map(mapRecordFromDB);
  } catch (error) {
    console.error("fetchProviderRecords error:", error);
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

