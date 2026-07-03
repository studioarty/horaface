import { useState, useEffect } from "react";
import { Users, Clock, CheckCircle, AlertTriangle, Monitor } from "lucide-react";
import { useProviderStore } from "@/stores/useProviderStore";
import { useTimeStore } from "@/stores/useTimeStore";
import { generateInsights } from "@/constants/mockData";
import { fetchAllKiosks, fetchTodayRecords, type KioskMonitorData } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { TimeRecord } from "@/types";
import StatsCard from "@/components/features/StatsCard";
import AIInsights from "@/components/features/AIInsights";
import RecentActivity from "@/components/features/RecentActivity";
import WeeklyChart from "@/components/features/WeeklyChart";
import heroImg from "@/assets/hero-hud.jpg";

export default function Dashboard() {
  const providers = useProviderStore((s) => s.providers);
  const timeStore = useTimeStore();
  const [kiosks, setKiosks] = useState<KioskMonitorData[]>([]);
  const [liveRecords, setLiveRecords] = useState<TimeRecord[]>([]);
  const { toast } = useToast();

  // Poll kiosks every 2s
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
    const iv = setInterval(load, 2000);
    return () => clearInterval(iv);
  }, []);

  // Poll today's records from DB every 2s so kiosk check-ins appear in real-time
  useEffect(() => {
    const load = async () => {
      try {
        const records = await fetchTodayRecords();
        setLiveRecords(records);
      } catch { }
    };
    load();
    const iv = setInterval(load, 2000);
    return () => clearInterval(iv);
  }, []);

  // Also reload the time store every 2s so other components stay in sync
  useEffect(() => {
    const iv = setInterval(() => {
      timeStore.reload();
    }, 2000);
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
          alt="HoraFace HUD"
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
            Monitoramento em tempo real das medições de serviço
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
            label="Sessões Ativas"
            value={activeRecords.length}
            icon={<Clock style={{ width: 20, height: 20, color: "var(--color-success)" }} />}
            accent="success"
            sub="em medição"
          />
          <StatsCard
            label="Registros Hoje"
            value={todayRecords.length}
            icon={<CheckCircle style={{ width: 20, height: 20, color: "var(--color-warning)" }} />}
            accent="warning"
            sub={`${completedRecords.length} encerrados`}
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

        {/* Main Content */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5 space-y-6">
            <AIInsights insights={insights} />
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
