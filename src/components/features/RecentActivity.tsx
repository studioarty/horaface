import { LogIn, LogOut, Clock } from "lucide-react";
import type { TimeRecord } from "@/types";
import { useProviderStore } from "@/stores/useProviderStore";

interface RecentActivityProps {
  records: TimeRecord[];
}

export default function RecentActivity({ records }: RecentActivityProps) {
  const store = useProviderStore();

  const sorted = [...records]
    .sort((a, b) => {
      const timeA = a.checkOut || a.checkIn;
      const timeB = b.checkOut || b.checkIn;
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    })
    .slice(0, 10);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="hud-card rounded-lg p-5 animate-fade-up">
      <div className="mb-4 flex items-center gap-2">
        <Clock style={{ width: 20, height: 20, color: "var(--color-primary)" }} />
        <h3 style={{ fontFamily: "Rajdhani, system-ui, sans-serif", fontSize: 18, fontWeight: 600, color: "var(--color-text-primary)" }}>
          Atividade Recente
        </h3>
      </div>

      {sorted.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "32px 0", textAlign: "center" }}>
          <div
            style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--color-bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Clock style={{ width: 20, height: 20, color: "var(--color-text-muted)" }} />
          </div>
          <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>Nenhum registro hoje</p>
          <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            Registros aparecerão aqui automaticamente
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sorted.map((record) => {
            const provider = store.getProvider(record.providerId);
            const isCheckOut = record.checkOut !== null;

            return (
              <div
                key={record.id + (isCheckOut ? "-out" : "-in")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  borderRadius: 8,
                  background: "rgba(21,31,53,0.5)",
                  padding: "8px 12px",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: isCheckOut ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
                  }}
                >
                  {isCheckOut ? (
                    <LogOut style={{ width: 14, height: 14, color: "var(--color-error)" }} />
                  ) : (
                    <LogIn style={{ width: 14, height: 14, color: "var(--color-success)" }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {provider?.name || "Desconhecido"}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                    {isCheckOut ? "Saída" : "Entrada"}
                  </p>
                </div>
                <span style={{ fontFamily: "Share Tech Mono, monospace", fontSize: 12, color: "var(--color-text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                  {formatTime(isCheckOut ? record.checkOut! : record.checkIn)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
