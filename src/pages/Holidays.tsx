import { useState, useEffect } from "react";
import { Plus, Search, Calendar, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Holiday, fetchHolidays, insertHoliday, deleteHolidayDB } from "@/lib/api";

export default function Holidays() {
    const { toast } = useToast();
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // New holiday form
    const [showModal, setShowModal] = useState(false);
    const [name, setName] = useState("");
    const [targetDate, setTargetDate] = useState("");
    const [isRoutine, setIsRoutine] = useState(false);

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        setLoading(true);
        try {
            const data = await fetchHolidays();
            setHolidays(data);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!name || !targetDate) {
            toast({ variant: "destructive", title: "Preencha todos os campos." });
            return;
        }
        try {
            await insertHoliday({ name, targetDate, isRoutine });
            toast({ title: "Feriado cadastrado com sucesso!" });
            setShowModal(false);
            setName(""); setTargetDate(""); setIsRoutine(false);
            load();
        } catch (e: any) {
            toast({ variant: "destructive", title: "Erro ao salvar", description: e.message });
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Tem certeza que deseja excluir o feriado/abono: ${name}?`)) return;
        try {
            await deleteHolidayDB(id);
            toast({ title: "Feriado removido!" });
            load();
        } catch {
            toast({ variant: "destructive", title: "Erro na exclusão." });
        }
    };

    const filtered = holidays.filter(h => h.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 fade-in">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--color-primary)] flex items-center gap-3" style={{ fontFamily: "Rajdhani, sans-serif" }}>
                        <Calendar className="size-8" />
                        Calendários e Feriados
                    </h1>
                    <p className="text-[var(--color-text-secondary)] mt-1">
                        Gerencie dias em que os turnos são suspensos (Impacta nos Relatórios).
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 font-bold text-slate-950 transition-all hover:brightness-110 active:scale-95 shadow-[var(--glow-primary)]"
                >
                    <Plus className="size-5" /> Adicionar Data
                </button>
            </div>

            <div className="hud-card p-4 rounded-xl border border-[var(--color-border)]">
                <div className="flex items-center gap-2 max-w-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-base)] px-3 py-2">
                    <Search className="size-4 text-[var(--color-text-muted)]" />
                    <input
                        type="text"
                        placeholder="Buscar datas especiais..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-transparent text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
                    />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    <p className="text-[var(--color-text-secondary)]">Carregando datas do banco...</p>
                ) : filtered.length === 0 ? (
                    <p className="text-[var(--color-text-secondary)]">Nenhuma data localizada na agenda.</p>
                ) : (
                    filtered.map(h => {
                        const [y, m, d] = h.targetDate.split("-");
                        return (
                            <div key={h.id} className="hud-card flex items-center justify-between p-5 rounded-xl border-l-4 border-l-[var(--color-primary)] border border-y-[var(--color-border)] border-r-[var(--color-border)]">
                                <div>
                                    <h3 className="font-bold text-[var(--color-text-primary)] text-lg">{h.name}</h3>
                                    <p className="text-[var(--color-primary)] font-mono font-bold mt-1 tracking-wider">{`${d}/${m}/${y}`}</p>
                                    <p className="text-[var(--color-text-muted)] text-xs mt-1">
                                        {h.isRoutine ? "Abono Automático de Rotina" : "Feriado Estadual / Nacional"}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDelete(h.id, h.name)}
                                    className="rounded-lg p-2 text-[var(--color-error)] hover:bg-rose-500/10 transition-colors opacity-70 hover:opacity-100"
                                    title="Excluir"
                                >
                                    <Trash2 className="size-5" />
                                </button>
                            </div>
                        )
                    })
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="hud-card w-full max-w-md rounded-2xl p-6 shadow-2xl border border-[var(--color-border)]">
                        <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-6 flex items-center gap-2" style={{ fontFamily: "Rajdhani, sans-serif" }}>
                            <Calendar className="size-5 text-[var(--color-primary)]" />
                            Agendar Feriado / Recesso
                        </h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-1 block">Nome do Feriado</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-base)] py-2 px-3 text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                                    placeholder="Ex: Proclamação da República"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-1 block">Calendário Escalonado (M/D/Y)</label>
                                <input
                                    type="date"
                                    value={targetDate}
                                    onChange={e => setTargetDate(e.target.value)}
                                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-base)] py-2 px-3 text-[var(--color-text-primary)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                                    style={{ colorScheme: "var(--theme)" }}
                                />
                            </div>
                            <label className="flex items-center gap-3 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-base)] cursor-pointer hover:brightness-110 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={isRoutine}
                                    onChange={e => setIsRoutine(e.target.checked)}
                                    className="size-4 rounded border-slate-600 bg-slate-700 text-[var(--color-primary)]"
                                />
                                <div>
                                    <div className="text-sm font-medium text-[var(--color-text-primary)]">Abono Recorrente (Não Subtrair Horas)</div>
                                    <div className="text-xs text-[var(--color-text-muted)]">Cobre banco de horas dos prestadores de folga.</div>
                                </div>
                            </label>
                        </div>
                        <div className="mt-8 flex justify-end gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="rounded-lg px-5 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-base)] transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAdd}
                                className="rounded-lg bg-[var(--color-primary)] px-5 py-2 text-sm font-bold text-slate-950 hover:brightness-110 active:scale-95 transition-all"
                            >
                                Gravar Data
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
