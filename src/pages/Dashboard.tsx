import { useState, useEffect } from "react";
import { Users, Clock, CheckCircle, AlertTriangle, Monitor, Copy, ExternalLink } from "lucide-react";
import { useProviderStore } from "@/stores/useProviderStore";
import { useTimeStore } from "@/stores/useTimeStore";
import { generateInsights } from "@/constants/mockData";
import { fetchAllKiosks, fetchTodayRecords, type KioskMonitorData } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { TimeRecord } from "@/types";
import StatsCard from "@/components/features/StatsCard";
import AIInsights from "@/components/features/AIInsights";
import RecentActivity from "@/components/features/RecentActivity";
import NotificationCenter from "@/components/features/NotificationCenter";
import KioskSettings from "@/components/features/KioskSettings";
import KioskMonitor from "@/components/features/KioskMonitor";
import WeeklyChart from "@/components/features/WeeklyChart";
import heroImg from "@/assets/hero-hud.jpg";

export default function Dashboard() {
  const providers = useProviderStore((s) => s.providers);
  const timeStore = useTimeStore();
  const [kiosks, setKiosks] = useState<KioskMonitorData[]>([]);
  const [liveRecords, setLiveRecords] = useState<TimeRecord[]>([]);
  const { toast } = useToast();

  // Poll kiosks every 5s
  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchAllKiosks();
        const now = Date.now();
        setKiosks(data.map((k) => ({
          ...k,
          kioskOnline: k.lastHeartbeat ? now - new Date(k.lastHeartbeat).getTime() < 30000 : false,
        })));
      } catch { }
    };
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, []);

  // Poll today's records from DB every 5s so kiosk check-ins appear in real-time
  useEffect(() => {
    const load = async () => {
      try {
        const records = await fetchTodayRecords();
        setLiveRecords(records);
      } catch { }
    };
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, []);

  // Also reload the time store periodically so other components stay in sync
  useEffect(() => {
    const iv = setInterval(() => {
      timeStore.reload();
    }, 10000);
    return () => clearInterval(iv);
  }, []);

  const onlineKiosks = kiosks.filter((k) => k.kioskOnline).length;
  const baseUrl = window.location.origin;

  // Use live records from DB polling
  const todayRecords = liveRecords.length > 0 ? liveRecords : timeStore.getTodayRecords();
  const activeRecords = todayRecords.filter((r) => r.status === "active");
  const completedRecords = todayRecords.filter((r) => r.status === "completed");

  const totalHoursToday = completedRecords.reduce((acc, r) => {
    if (!r.checkOut) return acc;
    return acc + (new Date(r.checkOut).getTime() - new Date(r.checkIn).getTime()) / 3600000;
  }, 0);

  const insights = generateInsights(providers.length, todayRecords.length, activeRecords.length);

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Hero Banner */}
      <div style={{ position: "relative", height: 180, overflow: "hidden" }}>
        <img
          src={heroImg}
          alt="PontoFace HUD"
          style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.4 }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, transparent, var(--color-bg-base) 90%)",
          }}
        />
        <div style={{ position: "absolute", bottom: 24, left: 32, right: 32 }}>
          <h1
            style={{
              fontFamily: "Rajdhani, system-ui, sans-serif",
              fontSize: 28,
              fontWeight: 700,
              color: "var(--color-text-primary)",
            }}
          >
            Painel de Controle
          </h1>
          <p style={{ marginTop: 4, fontSize: 14, color: "var(--color-text-secondary)" }}>
            Monitoramento em tempo real do controle de ponto facial
          </p>
        </div>
        <div className="hidden sm:block" style={{ position: "absolute", bottom: 24, right: 32 }}>
          <div
            className="hud-border"
            style={{
              borderRadius: 8,
              padding: "8px 16px",
              background: "rgba(12,18,34,0.8)",
              backdropFilter: "blur(4px)",
            }}
          >
            <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: 10, color: "var(--color-text-muted)" }}>
              SISTEMA
            </p>
            <p style={{ fontFamily: "Share Tech Mono, monospace", fontSize: 14, fontWeight: 600, color: "var(--color-success)" }}>
              ● ONLINE
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 16px 32px" }} className="sm:p-6 lg:p-8">
        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          <StatsCard
            label="Prestadores"
            value={providers.length}
            icon={<Users style={{ width: 20, height: 20, color: "var(--color-primary)" }} />}
            accent="primary"
            sub={`${providers.filter((p) => p.active).length} ativos`}
          />
          <StatsCard
            label="Ativos Agora"
            value={activeRecords.length}
            icon={<Clock style={{ width: 20, height: 20, color: "var(--color-success)" }} />}
            accent="success"
            sub="em turno"
          />
          <StatsCard
            label="Registros Hoje"
            value={todayRecords.length}
            icon={<CheckCircle style={{ width: 20, height: 20, color: "var(--color-warning)" }} />}
            accent="warning"
            sub={`${completedRecords.length} concluídos`}
          />
          <StatsCard
            label="Horas Hoje"
            value={totalHoursToday.toFixed(1) + "h"}
            icon={<AlertTriangle style={{ width: 20, height: 20, color: "var(--color-error)" }} />}
            accent="error"
            sub="total acumulado"
          />
          <StatsCard
            label="Quiosques"
            value={`${onlineKiosks}/${kiosks.length}`}
            icon={<Monitor style={{ width: 20, height: 20, color: onlineKiosks > 0 ? "var(--color-success)" : "var(--color-error)" }} />}
            accent={onlineKiosks > 0 ? "success" : "error"}
            sub={onlineKiosks > 0 ? `${onlineKiosks} conectado${onlineKiosks > 1 ? "s" : ""}` : "nenhum online"}
          />
        </div>

        {/* Notification Center */}
        <div style={{ marginTop: 24 }}>
          <NotificationCenter />
        </div>

        {/* How to Connect Kiosk */}
        <div className="mt-6 hud-card rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
            <div className="flex items-center gap-2">
              <Monitor style={{ width: 18, height: 18, color: "var(--color-primary)" }} />
              <h3 style={{ fontFamily: "Rajdhani, system-ui, sans-serif", fontSize: 16, fontWeight: 600, color: "var(--color-text-primary)" }}>
                Como Conectar um Quiosque
              </h3>
            </div>
            <a href="/docs" className="flex items-center gap-1 text-xs text-cyan-400 hover:underline">
              <ExternalLink className="size-3" />
              Documentação completa
            </a>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
                <div className="flex size-8 items-center justify-center rounded-lg bg-cyan-500/10 mb-2">
                  <span className="text-sm font-bold text-cyan-400" style={{ fontFamily: "Rajdhani, sans-serif" }}>1</span>
                </div>
                <h4 className="text-sm font-semibold text-slate-200 mb-1">Abra o navegador no PC do quiosque</h4>
                <p className="text-xs text-slate-400">Use Chrome ou Edge atualizado. O PC precisa de webcam e internet.</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
                <div className="flex size-8 items-center justify-center rounded-lg bg-cyan-500/10 mb-2">
                  <span className="text-sm font-bold text-cyan-400" style={{ fontFamily: "Rajdhani, sans-serif" }}>2</span>
                </div>
                <h4 className="text-sm font-semibold text-slate-200 mb-1">Acesse a URL do quiosque</h4>
                <p className="text-xs text-slate-400">Digite a URL abaixo na barra de endereço e pressione Enter.</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
                <div className="flex size-8 items-center justify-center rounded-lg bg-cyan-500/10 mb-2">
                  <span className="text-sm font-bold text-cyan-400" style={{ fontFamily: "Rajdhani, sans-serif" }}>3</span>
                </div>
                <h4 className="text-sm font-semibold text-slate-200 mb-1">Pronto! Conectado automaticamente</h4>
                <p className="text-xs text-slate-400">O quiosque aparece aqui no painel. Permita o uso da câmera quando solicitado.</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">URLs para copiar</p>
              {[
                { label: "Quiosque padrão (simples)", url: `${baseUrl}/quiosque` },
                { label: "Com identificação", url: `${baseUrl}/quiosque?id=entrada-01&name=Entrada Principal&location=Térreo` },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 rounded-lg border border-slate-800/50 bg-[#0d1117] px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-500 mb-0.5">{item.label}</p>
                    <p className="font-mono text-xs text-cyan-400 truncate">{item.url}</p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(item.url).then(() => toast({ title: "URL copiada!" }));
                    }}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-800/30 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors"
                    title="Copiar URL"
                  >
                    <Copy className="size-3.5" />
                  </button>
                </div>
              ))}
              <p className="text-[10px] text-slate-500 mt-1">
                Substitua <span className="font-mono text-cyan-400/60">id</span>, <span className="font-mono text-cyan-400/60">name</span> e <span className="font-mono text-cyan-400/60">location</span> conforme necessário. O quiosque se registra automaticamente ao abrir a URL.
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5 space-y-6">
            <KioskMonitor />
            <AIInsights insights={insights} />
            <KioskSettings />
          </div>
          <div className="lg:col-span-7 space-y-6">
            <RecentActivity records={todayRecords} />
            <WeeklyChart records={timeStore.records} />
          </div>
        </div>
      </div>
    </div>
  );
}
