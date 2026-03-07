import type { TimeRecord } from "@/types";
import { useProviderStore } from "@/stores/useProviderStore";
import { useShiftStore } from "@/stores/useShiftStore";

interface ReportTableProps {
  records: TimeRecord[];
}

export default function ReportTable({ records }: ReportTableProps) {
  const providerStore = useProviderStore();
  const shiftStore = useShiftStore();

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

  const calcHours = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return "—";
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  const statusLabel: Record<string, string> = {
    active: "Em andamento",
    completed: "Concluído",
    irregular: "Irregular",
  };

  const statusColor: Record<string, string> = {
    active: "color: var(--color-primary); background: rgba(34,211,238,0.1)",
    completed: "color: var(--color-success); background: rgba(16,185,129,0.1)",
    irregular: "color: var(--color-warning); background: rgba(245,158,11,0.1)",
  };

  if (records.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "48px 0", textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
          Nenhum registro encontrado no período selecionado.
        </p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
            {["Data", "Prestador", "Turno", "Entrada", "Saída", "Duração", "Status"].map((h) => (
              <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 500, textTransform: "uppercase", color: "var(--color-text-muted)" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((record) => {
            const provider = providerStore.getProvider(record.providerId);
            const shiftIds = provider?.shiftIds && provider.shiftIds.length > 0 ? provider.shiftIds : provider?.shiftId ? [provider.shiftId] : [];
            const providerShifts = shiftIds.map((id) => shiftStore.getShift(id)).filter(Boolean);

            return (
              <tr key={record.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                <td style={{ padding: "10px 12px", fontFamily: "Share Tech Mono, monospace", fontSize: 14, color: "var(--color-text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                  {formatDate(record.checkIn)}
                </td>
                <td style={{ padding: "10px 12px", fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" }}>
                  {provider?.name || "Desconhecido"}
                </td>
                <td style={{ padding: "10px 12px", fontSize: 14, color: "var(--color-text-secondary)" }}>
                  {providerShifts.length > 0 ? providerShifts.map((s) => s!.name).join(" + ") : "—"}
                </td>
                <td style={{ padding: "10px 12px", fontFamily: "Share Tech Mono, monospace", fontSize: 14, color: "var(--color-success)", fontVariantNumeric: "tabular-nums" }}>
                  {formatTime(record.checkIn)}
                </td>
                <td style={{ padding: "10px 12px", fontFamily: "Share Tech Mono, monospace", fontSize: 14, color: "var(--color-error)", fontVariantNumeric: "tabular-nums" }}>
                  {record.checkOut ? formatTime(record.checkOut) : "—"}
                </td>
                <td style={{ padding: "10px 12px", fontFamily: "Share Tech Mono, monospace", fontSize: 14, color: "var(--color-text-primary)", fontVariantNumeric: "tabular-nums" }}>
                  {calcHours(record.checkIn, record.checkOut)}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span
                    style={{
                      display: "inline-block",
                      borderRadius: 999,
                      padding: "2px 8px",
                      fontSize: 10,
                      fontWeight: 500,
                      ...(record.status === "completed"
                        ? { color: "var(--color-success)", background: "rgba(16,185,129,0.1)" }
                        : record.status === "active"
                          ? { color: "var(--color-primary)", background: "rgba(34,211,238,0.1)" }
                          : { color: "var(--color-warning)", background: "rgba(245,158,11,0.1)" }),
                    }}
                  >
                    {statusLabel[record.status]}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
