import type { TimeRecord } from "@/types";
import { useProviderStore } from "@/stores/useProviderStore";

interface ReportTableProps {
  records: TimeRecord[];
}

// Classifica o turno pelo horário de checkIn
function getShift(iso: string): "manha" | "tarde" | "noite" {
  const h = new Date(iso).getHours();
  if (h >= 5 && h < 12) return "manha";
  if (h >= 12 && h < 18) return "tarde";
  return "noite";
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(isoDate: string): string {
  // isoDate = "2026-07-03"
  const [y, m, d] = isoDate.split("-");
  const weekday = new Date(`${isoDate}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short" });
  return `${d}/${m} ${weekday}`;
}

interface ShiftSlot {
  entrada: string | null;
  saida: string | null;
}

interface DayRow {
  date: string;          // "2026-07-03"
  providerId: string;
  providerName: string;
  manha: ShiftSlot;
  tarde: ShiftSlot;
  noite: ShiftSlot;
}

export default function ReportTable({ records }: ReportTableProps) {
  const providerStore = useProviderStore();

  // Agrupa por data + provider
  const rowMap = new Map<string, DayRow>();

  [...records]
    .sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())
    .forEach((rec) => {
      const key = `${rec.date}__${rec.providerId}`;
      if (!rowMap.has(key)) {
        const provider = providerStore.getProvider(rec.providerId);
        rowMap.set(key, {
          date: rec.date,
          providerId: rec.providerId,
          providerName: provider?.name || "Desconhecido",
          manha: { entrada: null, saida: null },
          tarde: { entrada: null, saida: null },
          noite: { entrada: null, saida: null },
        });
      }

      const row = rowMap.get(key)!;
      const shift = getShift(rec.checkIn);

      // Só preenche se o slot ainda está vazio (primeiro registro do turno do dia)
      if (!row[shift].entrada) {
        row[shift].entrada = rec.checkIn;
        row[shift].saida = rec.checkOut ?? null;
      }
    });

  // Ordenar por data desc, depois por nome asc
  const rows = Array.from(rowMap.values()).sort((a, b) => {
    const dateDiff = b.date.localeCompare(a.date);
    if (dateDiff !== 0) return dateDiff;
    return a.providerName.localeCompare(b.providerName);
  });

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <p className="text-sm text-slate-500">Nenhum registro encontrado no período selecionado.</p>
      </div>
    );
  }

  const th = (label: string) => (
    <th
      key={label}
      style={{
        padding: "10px 10px",
        textAlign: "center",
        fontSize: 10,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: "var(--color-text-muted)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </th>
  );

  const tdTime = (iso: string | null, color: string) => (
    <td
      style={{
        padding: "8px 8px",
        textAlign: "center",
        fontFamily: "Share Tech Mono, monospace",
        fontSize: 13,
        color: iso ? color : "var(--color-text-muted)",
        fontVariantNumeric: "tabular-nums",
        opacity: iso ? 1 : 0.35,
      }}
    >
      {fmt(iso)}
    </td>
  );

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
        <thead>
          {/* Linha de grupo de turno */}
          <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
            <th rowSpan={2} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-muted)", verticalAlign: "bottom" }}>Data</th>
            <th rowSpan={2} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-muted)", verticalAlign: "bottom" }}>Nome</th>

            {/* Manhã */}
            <th
              colSpan={2}
              style={{ padding: "8px 10px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#fbbf24", borderBottom: "2px solid rgba(251,191,36,0.3)", background: "rgba(251,191,36,0.04)" }}
            >
              ☀️ Manhã <span style={{ fontSize: 9, opacity: 0.7 }}>(5h–12h)</span>
            </th>

            {/* Tarde */}
            <th
              colSpan={2}
              style={{ padding: "8px 10px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#f97316", borderBottom: "2px solid rgba(249,115,22,0.3)", background: "rgba(249,115,22,0.04)" }}
            >
              🌤 Tarde <span style={{ fontSize: 9, opacity: 0.7 }}>(12h–18h)</span>
            </th>

            {/* Noite */}
            <th
              colSpan={2}
              style={{ padding: "8px 10px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "#818cf8", borderBottom: "2px solid rgba(129,140,248,0.3)", background: "rgba(129,140,248,0.04)" }}
            >
              🌙 Noite <span style={{ fontSize: 9, opacity: 0.7 }}>(18h–5h)</span>
            </th>
          </tr>

          {/* Linha de sub-colunas Entrada/Saída */}
          <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
            {/* Manhã */}
            {th("Entrada")}
            {th("Saída")}
            {/* Tarde */}
            {th("Entrada")}
            {th("Saída")}
            {/* Noite */}
            {th("Entrada")}
            {th("Saída")}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, i) => (
            <tr
              key={`${row.date}-${row.providerId}`}
              style={{
                borderBottom: "1px solid var(--color-border)",
                background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
              }}
            >
              {/* Data */}
              <td style={{ padding: "10px 12px", fontFamily: "Share Tech Mono, monospace", fontSize: 13, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                {fmtDate(row.date)}
              </td>

              {/* Nome */}
              <td style={{ padding: "10px 12px", fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>
                {row.providerName}
              </td>

              {/* Manhã Entrada */}
              {tdTime(row.manha.entrada, "#4ade80")}
              {/* Manhã Saída */}
              {tdTime(row.manha.saida, "#f87171")}

              {/* Tarde Entrada */}
              {tdTime(row.tarde.entrada, "#4ade80")}
              {/* Tarde Saída */}
              {tdTime(row.tarde.saida, "#f87171")}

              {/* Noite Entrada */}
              {tdTime(row.noite.entrada, "#4ade80")}
              {/* Noite Saída */}
              {tdTime(row.noite.saida, "#f87171")}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
