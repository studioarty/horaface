import { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  CameraOff,
  Loader2,
  Wifi,
  WifiOff,
  RefreshCw,
  Trash2,
  MapPin,
  Monitor,
  Edit2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Video,
} from "lucide-react";
import {
  fetchAllKiosks,
  updateKioskMonitorDB,
  deleteKioskDB,
  type KioskMonitorData,
} from "@/lib/api";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

/** Live snapshot image that polls rapidly with smooth cross-fade */
function LiveSnapshotImage({ url, name }: { url: string; name: string }) {
  const [currentSrc, setCurrentSrc] = useState("");
  const [nextSrc, setNextSrc] = useState("");
  const [showNext, setShowNext] = useState(false);
  const tickRef = useRef(0);

  // Poll a new cache-busted version every 1.5s
  useEffect(() => {
    if (!url) return;
    const base = url.split("?")[0];

    // Initial load
    setCurrentSrc(`${base}?t=${Date.now()}`);

    const iv = setInterval(() => {
      tickRef.current++;
      const newUrl = `${base}?t=${Date.now()}`;
      // Preload the image, then swap
      const img = new Image();
      img.onload = () => {
        setNextSrc(newUrl);
        setShowNext(true);
        // After transition completes, swap to current
        setTimeout(() => {
          setCurrentSrc(newUrl);
          setShowNext(false);
        }, 300);
      };
      img.onerror = () => {
        // If load fails, just keep current
      };
      img.src = newUrl;
    }, 1500);

    return () => clearInterval(iv);
  }, [url]);

  if (!url) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-2">
        <CameraOff className="size-8 text-slate-600" />
        <p className="font-mono text-xs text-slate-500">Sem imagem</p>
      </div>
    );
  }

  return (
    <div className="relative size-full">
      {currentSrc && (
        <img
          src={currentSrc}
          alt={`Câmera ${name}`}
          className="absolute inset-0 size-full object-cover"
        />
      )}
      {showNext && nextSrc && (
        <img
          src={nextSrc}
          alt={`Câmera ${name}`}
          className="absolute inset-0 size-full object-cover transition-opacity duration-300"
          style={{ opacity: 1 }}
        />
      )}
    </div>
  );
}

export default function KioskMonitor() {
  const [kiosks, setKiosks] = useState<KioskMonitorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  const fetchAll = useCallback(async () => {
    try {
      const data = await fetchAllKiosks();
      const now = Date.now();
      const updated = data.map((k) => ({
        ...k,
        kioskOnline: k.lastHeartbeat ? now - new Date(k.lastHeartbeat).getTime() < 30000 : false,
      }));
      setKiosks(updated);
      setLoading(false);
    } catch (err) {
      console.error("KioskMonitor poll error:", err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    // Poll every 2s for kiosk status and snapshot URLs
    pollRef.current = setInterval(fetchAll, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchAll]);

  const toggleCamera = async (kioskId: string, currentState: boolean) => {
    try {
      await updateKioskMonitorDB(kioskId, { camera_active: !currentState });
      setKiosks((prev) =>
        prev.map((k) => (k.id === kioskId ? { ...k, cameraActive: !currentState } : k)),
      );
      // Auto-expand the panel when turning camera on
      if (!currentState) {
        setExpandedId(kioskId);
      }
      toast({
        title: !currentState
          ? "Câmera ao vivo ativada — o quiosque solicitará permissão se necessário"
          : "Câmera desativada",
      });
    } catch (err) {
      console.error("toggleCamera error:", err);
    }
  };

  const handleDelete = async (kioskId: string, name: string) => {
    if (!confirm(`Remover quiosque "${name}"? O quiosque poderá se re-registrar ao conectar novamente.`)) return;
    try {
      await deleteKioskDB(kioskId);
      setKiosks((prev) => prev.filter((k) => k.id !== kioskId));
      if (expandedId === kioskId) setExpandedId(null);
      toast({ title: `Quiosque "${name}" removido` });
    } catch {
      toast({ variant: "destructive", title: "Erro ao remover quiosque" });
    }
  };

  const startEdit = (k: KioskMonitorData) => {
    setEditingId(k.id);
    setEditName(k.name);
    setEditLocation(k.location);
  };

  const saveEdit = async (kioskId: string) => {
    try {
      await updateKioskMonitorDB(kioskId, { name: editName, location: editLocation });
      setKiosks((prev) =>
        prev.map((k) =>
          k.id === kioskId ? { ...k, name: editName, location: editLocation } : k,
        ),
      );
      setEditingId(null);
      toast({ title: "Quiosque atualizado" });
    } catch {
      toast({ variant: "destructive", title: "Erro ao atualizar" });
    }
  };

  const onlineCount = kiosks.filter((k) => k.kioskOnline).length;

  return (
    <div className="hud-card rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
        <div className="flex items-center gap-2">
          <Monitor style={{ width: 18, height: 18, color: "var(--color-primary)" }} />
          <h3 style={{ fontFamily: "Rajdhani, system-ui, sans-serif", fontSize: 16, fontWeight: 600, color: "var(--color-text-primary)" }}>
            Monitor de Quiosques
          </h3>
          <span className="ml-1 rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-mono text-cyan-400">
            {kiosks.length} {kiosks.length === 1 ? "quiosque" : "quiosques"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            {onlineCount > 0 ? (
              <>
                <Wifi className="size-3.5 text-emerald-400" />
                <span className="font-mono text-[10px] text-emerald-400">{onlineCount} online</span>
              </>
            ) : (
              <>
                <WifiOff className="size-3.5 text-red-400" />
                <span className="font-mono text-[10px] text-red-400">Nenhum online</span>
              </>
            )}
          </div>
          <button
            onClick={fetchAll}
            className="flex size-7 items-center justify-center rounded-md border border-slate-700 bg-slate-800/30 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors"
            title="Atualizar"
          >
            <RefreshCw className="size-3" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="size-6 animate-spin text-cyan-400/50" />
        </div>
      ) : kiosks.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center px-4">
          <Monitor className="size-10 text-slate-600" />
          <p className="text-sm text-slate-400">Nenhum quiosque registrado</p>
          <p className="text-xs text-slate-500 max-w-xs">
            Abra a URL <span className="font-mono text-cyan-400/70">/quiosque?id=NOME</span> em um PC para registrar automaticamente.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/50">
          {kiosks.map((kiosk) => {
            const isExpanded = expandedId === kiosk.id;
            const isEditing = editingId === kiosk.id;
            const isLive = kiosk.cameraActive && kiosk.kioskOnline;

            return (
              <div key={kiosk.id}>
                {/* Kiosk row */}
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-800/20 transition-colors">
                  <div className="relative">
                    <div
                      className={`size-2.5 rounded-full ${
                        kiosk.kioskOnline
                          ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                          : "bg-red-400/60"
                      }`}
                    />
                    {isLive && (
                      <div className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-red-400 animate-pulse" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-7 text-xs border-slate-700 bg-slate-800/50"
                          placeholder="Nome"
                        />
                        <Input
                          value={editLocation}
                          onChange={(e) => setEditLocation(e.target.value)}
                          className="h-7 text-xs border-slate-700 bg-slate-800/50"
                          placeholder="Local"
                        />
                        <button
                          onClick={() => saveEdit(kiosk.id)}
                          className="flex size-7 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                        >
                          <Check className="size-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex size-7 shrink-0 items-center justify-center rounded-md bg-slate-700/30 text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-200 truncate">{kiosk.name}</p>
                          {isLive && (
                            <span className="flex items-center gap-1 rounded-full bg-red-500/15 border border-red-500/20 px-1.5 py-0.5 text-[9px] font-bold text-red-400 uppercase tracking-wider">
                              <span className="size-1 rounded-full bg-red-400 animate-pulse" />
                              AO VIVO
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {kiosk.location && (
                            <span className="flex items-center gap-1 text-[10px] text-slate-500">
                              <MapPin className="size-2.5" />
                              {kiosk.location}
                            </span>
                          )}
                          <span className="font-mono text-[10px] text-slate-600">{kiosk.id}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => toggleCamera(kiosk.id, kiosk.cameraActive)}
                        disabled={!kiosk.kioskOnline}
                        className={`flex size-8 items-center justify-center rounded-lg transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
                          kiosk.cameraActive
                            ? "bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20"
                            : "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20"
                        }`}
                        title={kiosk.cameraActive ? "Desligar câmera ao vivo" : "Ver câmera ao vivo"}
                      >
                        {kiosk.cameraActive ? <CameraOff className="size-3.5" /> : <Video className="size-3.5" />}
                      </button>
                      <button
                        onClick={() => startEdit(kiosk)}
                        className="flex size-8 items-center justify-center rounded-lg border border-slate-700 text-slate-500 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(kiosk.id, kiosk.name)}
                        className="flex size-8 items-center justify-center rounded-lg border border-slate-700 text-slate-500 hover:text-red-400 hover:border-red-500/30 transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : kiosk.id)}
                        className="flex size-8 items-center justify-center rounded-lg border border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-colors"
                        title={isExpanded ? "Recolher" : "Expandir câmera"}
                      >
                        {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded camera feed */}
                {isExpanded && (
                  <div className="px-4 pb-3">
                    <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-slate-800">
                      {isLive && kiosk.snapshotUrl ? (
                        <LiveSnapshotImage url={kiosk.snapshotUrl} name={kiosk.name} />
                      ) : isLive && !kiosk.snapshotUrl ? (
                        <div className="flex size-full flex-col items-center justify-center gap-3">
                          <Loader2 className="size-8 animate-spin text-cyan-400/50" />
                          <p className="font-mono text-xs text-slate-500">
                            Conectando à câmera de {kiosk.name}...
                          </p>
                          <p className="font-mono text-[10px] text-slate-600">
                            O quiosque pedirá permissão da câmera se necessário
                          </p>
                        </div>
                      ) : kiosk.cameraActive && !kiosk.kioskOnline ? (
                        <div className="flex size-full flex-col items-center justify-center gap-3">
                          <WifiOff className="size-8 text-amber-400/50" />
                          <p className="font-mono text-xs text-amber-400">
                            Quiosque offline — câmera ativada mas sem conexão
                          </p>
                        </div>
                      ) : (
                        <div className="flex size-full flex-col items-center justify-center gap-3">
                          <CameraOff className="size-10 text-slate-600" />
                          <p className="font-mono text-xs text-slate-500">Câmera desligada</p>
                          <button
                            onClick={() => toggleCamera(kiosk.id, false)}
                            disabled={!kiosk.kioskOnline}
                            className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Video className="size-3.5" />
                            Ver ao vivo
                          </button>
                        </div>
                      )}

                      {/* Live badge overlay */}
                      <div className="absolute top-2 left-2 z-10">
                        {isLive ? (
                          <div className="flex items-center gap-1.5 rounded-md bg-red-600/90 px-2 py-1 text-[10px] font-bold text-white uppercase tracking-wider backdrop-blur-sm shadow-lg">
                            <span className="size-1.5 rounded-full bg-white animate-pulse" />
                            AO VIVO
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-mono bg-slate-800/80 text-slate-500 backdrop-blur-sm">
                            <span className="size-1.5 rounded-full bg-slate-600" />
                            INATIVO
                          </div>
                        )}
                      </div>
                      <div className="absolute top-2 right-2 z-10">
                        <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-mono text-white/60 backdrop-blur-sm">
                          {kiosk.name}
                        </span>
                      </div>

                      {/* Time overlay for live feed */}
                      {isLive && (
                        <div className="absolute bottom-2 right-2 z-10">
                          <LiveClock />
                        </div>
                      )}
                    </div>
                    {kiosk.lastHeartbeat && (
                      <p className="mt-1.5 text-[10px] font-mono text-slate-600">
                        Último heartbeat: {new Date(kiosk.lastHeartbeat).toLocaleString("pt-BR")}
                      </p>
                    )}
                    {!kiosk.kioskOnline && (
                      <div className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                        <p className="text-[11px] text-amber-400">
                          Este quiosque está offline. Verifique se o PC está ligado e acessando a URL{" "}
                          <span className="font-mono">/quiosque?id={kiosk.id}</span>.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Help info */}
      <div className="px-4 py-3 border-t" style={{ borderColor: "var(--color-border)" }}>
        <div className="rounded-lg border border-cyan-500/10 bg-cyan-500/5 p-3">
          <p className="text-xs font-medium text-cyan-400 mb-1">Adicionar novo quiosque</p>
          <p className="font-mono text-[10px] text-slate-400">
            Acesse <span className="text-cyan-400/80">{window.location.origin}/quiosque?id=SEU_ID&name=NOME&location=LOCAL</span>
          </p>
          <p className="text-[10px] text-slate-500 mt-1">
            O quiosque se registra automaticamente ao conectar pela primeira vez.
          </p>
        </div>
      </div>
    </div>
  );
}

/** Small live clock overlay */
function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);
  return (
    <span className="rounded-md bg-black/70 px-2 py-0.5 font-mono text-[10px] text-white/70 backdrop-blur-sm tabular-nums">
      {time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
    </span>
  );
}
