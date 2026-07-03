import { supabase } from "./supabase";
import type { TimeRecord } from "@/types";

const QUEUE_KEY = "PONTOFACE_OFFLINE_QUEUE_V1";
const ACTIVE_RECORD_STORE = "PONTOFACE_HOT_ACTIVE_RECORDS";

export type SyncOperation =
    | { type: "check_in"; payload: { id: string; provider_id: string; check_in: string; photo_url?: string; location?: string } }
    | { type: "check_out"; payload: { id: string; check_out: string; photo_url?: string; location?: string } }
    | { type: "update_break_start"; payload: { id: string; break_start: string } }
    | { type: "update_break_end"; payload: { id: string; break_end: string } };


export function getSyncQueue(): SyncOperation[] {
    try {
        const data = localStorage.getItem(QUEUE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

export function saveSyncQueue(queue: SyncOperation[]) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new Event("syncWorkerUpdate"));
}

export function pushToQueue(op: SyncOperation) {
    const q = getSyncQueue();
    q.push(op);
    saveSyncQueue(q);
}

let isSyncing = false;

export async function processSyncQueue() {
    if (isSyncing || !navigator.onLine) return;
    const q = getSyncQueue();
    if (q.length === 0) return;

    isSyncing = true;
    const remaining = [...q];

    for (const op of q) {
        let success = false;
        let shouldDiscard = false;
        try {
            if (op.type === "check_in") {
                const { error, status } = await supabase.from("time_records").insert(op.payload);
                if (!error || error.code === '23505') {
                    success = true;
                    // Envia backup para Hostinger
                    const record: TimeRecord = {
                        id: op.payload.id,
                        providerId: op.payload.provider_id,
                        checkIn: op.payload.check_in,
                        checkOut: null,
                        status: "active",
                        date: op.payload.check_in.split("T")[0],
                        photoUrl: op.payload.photo_url || "",
                        location: op.payload.location || "",
                    };
                    fetch("/backup.php", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(record)
                    }).catch(e => console.error("SyncWorker backup check_in error:", e));
                } else if (status >= 400 && status < 500) {
                    console.error("SyncWorker: Erro fatal 4xx (Registro Inálido/Corrompido). Descartando da fila.", error);
                    shouldDiscard = true;
                }
            } else if (op.type === "check_out") {
                const updatePayload: any = { check_out: op.payload.check_out };
                if (op.payload.photo_url !== undefined) updatePayload.photo_url = op.payload.photo_url;
                if (op.payload.location !== undefined) updatePayload.location = op.payload.location;
                const { error, status } = await supabase.from("time_records").update(updatePayload).eq("id", op.payload.id);
                if (!error) {
                    success = true;
                    // Busca o registro completo para enviar para a Hostinger sem perder dados
                    supabase.from("time_records").select("*").eq("id", op.payload.id).single().then(({ data: fullRecord }) => {
                        if (fullRecord) {
                            const record: TimeRecord = {
                                id: fullRecord.id,
                                providerId: fullRecord.provider_id,
                                checkIn: fullRecord.check_in,
                                checkOut: fullRecord.check_out,
                                status: (fullRecord.check_out && fullRecord.check_in === fullRecord.check_out) ? "irregular" : "completed",
                                date: fullRecord.check_in.split("T")[0],
                                photoUrl: fullRecord.photo_url || "",
                                location: fullRecord.location || "",
                                breakStart: fullRecord.break_start || null,
                                breakEnd: fullRecord.break_end || null,
                            };
                            fetch("/backup.php", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(record)
                            }).catch(e => console.error("SyncWorker backup check_out error:", e));
                        }
                    }).catch(e => console.error("SyncWorker fetch full record error:", e));
                } else if (status >= 400 && status < 500) {
                    console.error("SyncWorker: Erro fatal 4xx (Registro Inálido/Corrompido). Descartando da fila.", error);
                    shouldDiscard = true;
                }
            } else if (op.type === "update_break_start") {
                const { error, status } = await supabase.from("time_records").update({ break_start: op.payload.break_start }).eq("id", op.payload.id);
                if (!error) {
                    success = true;
                } else if (status >= 400 && status < 500) {
                    shouldDiscard = true;
                }
            } else if (op.type === "update_break_end") {
                const { error, status } = await supabase.from("time_records").update({ break_end: op.payload.break_end }).eq("id", op.payload.id);
                if (!error) {
                    success = true;
                } else if (status >= 400 && status < 500) {
                    shouldDiscard = true;
                }
            }
        } catch (err) {
            console.warn("SyncWorker: Erro Crítico (Falha de Rede ou CORS)", err);
        }

        if (success || shouldDiscard) {
            remaining.shift();
            saveSyncQueue(remaining); // Salva a cada sucesso/expurgo para não perder progresso
        } else {
            break; // Erro de Rede Real (Não resolvido). Paramos a fila temporariamente.
        }
    }
    isSyncing = false;
}

export async function syncLocalReceiptsToSupabase() {
    if (!navigator.onLine) return;
    try {
        const str = localStorage.getItem("HORAFACE_LOCAL_RECEIPTS") || "[]";
        const receipts = JSON.parse(str);
        if (!Array.isArray(receipts) || receipts.length === 0) return;

        const unsyncedReceipts = receipts.filter((r: any) => !r.synced);
        if (unsyncedReceipts.length === 0) return;

        console.log(`[SyncWorker] Sincronizando ${unsyncedReceipts.length} recibos locais com o Supabase...`);
        const payloads = unsyncedReceipts.map((receipt: any) => ({
            id: receipt.id,
            provider_id: receipt.providerId,
            check_in: receipt.checkIn,
            check_out: receipt.checkOut || null,
            photo_url: receipt.checkOutPhoto && receipt.checkInPhoto
                ? `${receipt.checkInPhoto}|${receipt.checkOutPhoto}`
                : (receipt.checkOutPhoto || receipt.checkInPhoto || null),
            location: receipt.checkOutLocation && receipt.checkInLocation
                ? `${receipt.checkInLocation}|${receipt.checkOutLocation}`
                : (receipt.checkOutLocation || receipt.checkInLocation || null)
        }));

        const { error } = await supabase
            .from("time_records")
            .upsert(payloads);

        if (error) {
            console.error("[SyncWorker] Erro ao sincronizar recibos:", error);
        } else {
            console.log("[SyncWorker] Recibos locais sincronizados com o Supabase!");
            
            // Marca os recibos sincronizados como synced: true no local storage
            const updatedReceipts = receipts.map((r: any) => {
                if (unsyncedReceipts.some((ur: any) => ur.id === r.id)) {
                    return { ...r, synced: true };
                }
                return r;
            });
            localStorage.setItem("HORAFACE_LOCAL_RECEIPTS", JSON.stringify(updatedReceipts));

            // Envia backup em lote para a Hostinger
            const records = payloads.map((p: any) => ({
                id: p.id,
                providerId: p.provider_id,
                checkIn: p.check_in,
                checkOut: p.check_out,
                status: (p.check_out && p.check_in === p.check_out) ? "irregular" : p.check_out ? "completed" : "active",
                date: p.check_in.split("T")[0],
                photoUrl: p.photo_url || "",
                location: p.location || ""
            }));
            fetch("/backup.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ records })
            }).catch(e => console.error("[SyncWorker] bulk backup error:", e));
        }
    } catch (err) {
        console.error("[SyncWorker] Falha na sincronização de recibos:", err);
    }
}

// Inicializa o Listener de Sincronismo no Navegador Escavador
if (typeof window !== "undefined") {
    // Tenta sincronizar recibos locais ao carregar
    setTimeout(() => {
        if (navigator.onLine) {
            syncLocalReceiptsToSupabase();
        }
    }, 1500);

    // A cada 10 segundos testa se a fila não está vazia e tenta atirar pra nuvem
    setInterval(() => {
        if (getSyncQueue().length > 0) {
            processSyncQueue();
        }
    }, 10000);
    
    window.addEventListener("online", () => {
        processSyncQueue();
        syncLocalReceiptsToSupabase();
    });
}

// ==== GESTÃO DE CACHE QUENTE DE REGISTROS ATIVOS (Lembrança de Sessão Offline) ====

export function cacheActiveRecord(providerId: string, record: TimeRecord | null) {
    try {
        const cache = JSON.parse(localStorage.getItem(ACTIVE_RECORD_STORE) || "{}");
        if (record) {
            cache[providerId] = record;
        } else {
            delete cache[providerId];
        }
        localStorage.setItem(ACTIVE_RECORD_STORE, JSON.stringify(cache));
    } catch { }
}

export function getCachedActiveRecord(providerId: string): TimeRecord | null {
    try {
        const cache = JSON.parse(localStorage.getItem(ACTIVE_RECORD_STORE) || "{}");
        return cache[providerId] || null;
    } catch {
        return null;
    }
}
