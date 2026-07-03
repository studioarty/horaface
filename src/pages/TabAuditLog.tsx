import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Loader2, ShieldAlert, User, CheckCircle, DatabaseBackup } from "lucide-react";
import { getAuthHeaders } from "@/lib/api";

type ActionLog = {
    id: string;
    adminId: string;
    adminName: string;
    action: string;
    targetInfo: string | null;
    createdAt: string;
};

export default function TabAuditLog() {
    const [logs, setLogs] = useState<ActionLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchLogs() {
            try {
                const res = await fetch("http://localhost:3005/api/auth/audit", {
                    headers: getAuthHeaders(),
                });
                if (!res.ok) throw new Error("Falha ao buscar auditoria");
                const data = await res.json();
                setLogs(data);
            } catch (err) {
                console.error("Erro ao puxar audit:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchLogs();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center p-10">
                <Loader2 className="size-8 animate-spin text-cyan-500/50" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-sm font-semibold text-slate-200">Rastreio de Atividades de Segurança</h2>
                    <p className="text-xs text-slate-400 mt-1">Monitoramento oculto de modificações no painel. Visível apenas para ROOT.</p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs text-red-400">
                    <ShieldAlert className="size-3" /> Monitoramento Ativo
                </div>
            </div>

            <div className="rounded-md border border-slate-800 bg-slate-900/50">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-800 bg-slate-900/80 text-slate-400">
                            <tr>
                                <th className="px-4 py-3 font-medium">Data / Hora</th>
                                <th className="px-4 py-3 font-medium">Responsável</th>
                                <th className="px-4 py-3 font-medium">Ação (Verbo)</th>
                                <th className="px-4 py-3 font-medium">Alvo (Objeto Modificado)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                                        Nenhuma atividade destrutiva detectada recentemente.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-3 font-mono text-slate-300 whitespace-nowrap">
                                            {format(new Date(log.createdAt), "dd/MM/yyyy • HH:mm:ss")}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 font-medium text-cyan-400">
                                                <User className="size-3 text-cyan-500/50" />
                                                {log.adminName}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${log.action.toLowerCase().includes('deletou') || log.action.toLowerCase().includes('excluiu')
                                                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                }`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-slate-400">
                                            {log.targetInfo || "-"}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
