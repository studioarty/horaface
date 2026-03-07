import { useState, useEffect, useMemo } from "react";
import {
  Bell,
  AlertTriangle,
  Clock,
  LogOut,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useProviderStore } from "@/stores/useProviderStore";
import { useTimeStore } from "@/stores/useTimeStore";
import { useShiftStore } from "@/stores/useShiftStore";
import { MIN_EXIT_MINUTES } from "@/constants/config";
import type { Shift } from "@/types";

interface Notification {
  id: string;
  type: "late" | "shift-ending" | "exit-ready" | "overtime";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  providerName: string;
  timestamp: number;
}

const typeConfig = {
  late: { icon: AlertTriangle, color: "var(--color-error)", bg: "rgba(239,68,68,0.1)", pulse: "var(--color-error)" },
  "shift-ending": { icon: Clock, color: "var(--color-warning)", bg: "rgba(245,158,11,0.1)", pulse: "var(--color-warning)" },
  "exit-ready": { icon: LogOut, color: "var(--color-success)", bg: "rgba(16,185,129,0.1)", pulse: "var(--color-success)" },
  overtime: { icon: AlertTriangle, color: "var(--color-warning)", bg: "rgba(245,158,11,0.1)", pulse: "var(--color-warning)" },
};

function parseShiftTime(timeStr: string, baseDate: Date): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);
  return d;
}

export default function NotificationCenter() {
  const providerStore = useProviderStore();
  const timeStore = useTimeStore();
  const shiftStore = useShiftStore();

  const [now, setNow] = useState(new Date());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const notifications = useMemo(() => {
    const result: Notification[] = [];
    const today = now.getDay();
    const activeProviders = providerStore.getActiveProviders();
    const todayRecords = timeStore.getTodayRecords();

    for (const provider of activeProviders) {
      // Support multiple shifts
      const shiftIds = (provider.shiftIds && provider.shiftIds.length > 0) ? provider.shiftIds : [provider.shiftId];
      const providerShifts = shiftIds.map((id) => shiftStore.getShift(id)).filter((s): s is Shift => !!s && s.days.includes(today));
      if (providerShifts.length === 0) continue;

      // Use earliest shift start for late detection
      const earliestShift = providerShifts.reduce((a, b) => {
        const aTime = parseShiftTime(a.startTime, now);
        const bTime = parseShiftTime(b.startTime, now);
        return aTime < bTime ? a : b;
      });
      // Use latest shift end for overtime
      const latestShift = providerShifts.reduce((a, b) => {
        let aEnd = parseShiftTime(a.endTime, now);
        let bEnd = parseShiftTime(b.endTime, now);
        const aStart = parseShiftTime(a.startTime, now);
        const bStart = parseShiftTime(b.startTime, now);
        if (aEnd < aStart) aEnd.setDate(aEnd.getDate() + 1);
        if (bEnd < bStart) bEnd.setDate(bEnd.getDate() + 1);
        return aEnd > bEnd ? a : b;
      });

      const shiftStart = parseShiftTime(earliestShift.startTime, now);
      const activeRecord = timeStore.getActiveRecord(provider.id);
      const hasAnyRecordToday = todayRecords.some((r) => r.providerId === provider.id);
      const shiftLabel = providerShifts.map((s) => s.name).join(" + ");

      // Late alert
      if (!hasAnyRecordToday && now.getTime() > shiftStart.getTime() + 10 * 60000) {
        const lateMin = Math.round((now.getTime() - shiftStart.getTime()) / 60000);
        result.push({
          id: `late-${provider.id}`,
          type: "late",
          severity: lateMin > 30 ? "high" : "medium",
          title: "Atraso Detectado",
          description: `Atrasado ${lateMin} min — turno "${shiftLabel}" iniciou às ${earliestShift.startTime}`,
          providerName: provider.name,
          timestamp: now.getTime(),
        });
      }

      if (activeRecord) {
        // Shift ending (based on latest shift end)
        let endDate = parseShiftTime(latestShift.endTime, now);
        const latestStart = parseShiftTime(latestShift.startTime, now);
        if (endDate < latestStart) endDate.setDate(endDate.getDate() + 1);
        const minLeft = Math.round((endDate.getTime() - now.getTime()) / 60000);
        if (minLeft > 0 && minLeft <= 30) {
          result.push({
            id: `shift-ending-${provider.id}`,
            type: "shift-ending",
            severity: minLeft <= 10 ? "high" : "medium",
            title: "Turno Encerrando",
            description: `Faltam ${minLeft} min para o fim do turno "${shiftLabel}"`,
            providerName: provider.name,
            timestamp: now.getTime(),
          });
        }

        // Exit ready
        const checkStatus = timeStore.canCheckOut(activeRecord.id);
        if (checkStatus.allowed) {
          const activeMin = Math.round((now.getTime() - new Date(activeRecord.checkIn).getTime()) / 60000);
          result.push({
            id: `exit-ready-${provider.id}`,
            type: "exit-ready",
            severity: "low",
            title: "Saída Liberada",
            description: `Tempo mínimo de ${MIN_EXIT_MINUTES} min atingido (${activeMin} min ativos)`,
            providerName: provider.name,
            timestamp: now.getTime(),
          });
        }

        // Overtime
        if (now.getTime() > endDate.getTime()) {
          const overtimeMin = Math.round((now.getTime() - endDate.getTime()) / 60000);
          result.push({
            id: `overtime-${provider.id}`,
            type: "overtime",
            severity: overtimeMin > 60 ? "high" : "medium",
            title: "Hora Extra",
            description: `${overtimeMin} min além do turno "${shiftLabel}"`,
            providerName: provider.name,
            timestamp: now.getTime(),
          });
        }
      }
    }

    return result
      .filter((n) => !dismissed.has(n.id))
      .sort((a, b) => {
        const ord = { high: 0, medium: 1, low: 2 };
        return ord[a.severity] - ord[b.severity];
      });
  }, [providerStore, timeStore, shiftStore, now, dismissed]);

  const highCount = notifications.filter((n) => n.severity === "high").length;
  const totalCount = notifications.length;

  return (
    <div className="hud-card rounded-lg animate-fade-up" style={{ overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          gap: 12,
          padding: 16,
          textAlign: "left",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "inherit",
        }}
      >
        <div style={{ position: "relative" }}>
          <Bell style={{ width: 20, height: 20, color: "var(--color-primary)" }} />
          {totalCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: -6,
                right: -6,
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "var(--color-error)",
                fontSize: 9,
                fontWeight: 700,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {totalCount}
            </span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontFamily: "Rajdhani, system-ui, sans-serif", fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)" }}>
            Notificações
          </h3>
          <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            {totalCount === 0
              ? "Nenhum alerta no momento"
              : `${totalCount} alerta${totalCount > 1 ? "s" : ""}${highCount > 0 ? ` · ${highCount} urgente${highCount > 1 ? "s" : ""}` : ""}`}
          </p>
        </div>
        {expanded ? (
          <ChevronUp style={{ width: 16, height: 16, color: "var(--color-text-muted)", flexShrink: 0 }} />
        ) : (
          <ChevronDown style={{ width: 16, height: 16, color: "var(--color-text-muted)", flexShrink: 0 }} />
        )}
      </button>

      {expanded && (
        <div style={{ borderTop: "1px solid var(--color-border)", maxHeight: 320, overflowY: "auto" }}>
          {totalCount === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "32px 16px", textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Bell style={{ width: 20, height: 20, color: "var(--color-success)" }} />
              </div>
              <p style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>Tudo em ordem</p>
              <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                Alertas de atraso, turnos e saídas aparecem aqui automaticamente
              </p>
            </div>
          ) : (
            <div>
              {notifications.map((notif) => {
                const config = typeConfig[notif.type];
                const Icon = config.icon;

                return (
                  <div
                    key={notif.id}
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      padding: "12px 16px",
                      borderBottom: "1px solid var(--color-border)",
                      background: notif.severity === "high" ? "rgba(239,68,68,0.04)" : "transparent",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 3,
                        background: config.pulse,
                        opacity: notif.severity === "high" ? 1 : 0.6,
                      }}
                    />
                    <div
                      style={{
                        marginTop: 2,
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: config.bg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon style={{ width: 16, height: 16, color: config.color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: config.color }}>
                          {notif.title}
                        </span>
                        {notif.severity === "high" && (
                          <span
                            style={{
                              borderRadius: 4,
                              background: "rgba(239,68,68,0.2)",
                              padding: "2px 6px",
                              fontSize: 9,
                              fontWeight: 700,
                              textTransform: "uppercase",
                              color: "var(--color-error)",
                            }}
                          >
                            Urgente
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)", marginTop: 2 }}>
                        {notif.providerName}
                      </p>
                      <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2, lineHeight: 1.5 }}>
                        {notif.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDismissed((prev) => new Set(prev).add(notif.id))}
                      style={{
                        marginTop: 2,
                        width: 24,
                        height: 24,
                        borderRadius: 4,
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--color-text-muted)",
                        flexShrink: 0,
                      }}
                    >
                      <X style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
