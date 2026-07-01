import { useState, useEffect } from 'react';
import { Settings2, BookImage, MonitorPlay, ChevronDown, ChevronUp, Check, Save, MapPin, Navigation } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useKioskStore } from '@/stores/useKioskStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { fetchAllKiosks } from '@/lib/api';

// Nossas recém criadas Sub-Abas do Painel Admin
import { LibraryTab } from './KioskLibraryTab';
import { CampaignsTab } from './KioskCampaignTab';
import { NEWS_SOURCES } from '@/hooks/useKioskWidgets';
import { haversineDistance } from '@/lib/geoUtils';

export default function KioskSettings() {
  const kioskStore = useKioskStore();
  const [isOpen, setIsOpen] = useState(false);
  const [localTickerSpeed, setLocalTickerSpeed] = useState(kioskStore.newsTickerSpeed);
  const [localRssLayout, setLocalRssLayout] = useState(kioskStore.rssLayout || '3d');
  const [localRssSources, setLocalRssSources] = useState<string[]>(kioskStore.rssSources || ['g1']);
  const [localRssTargetKiosks, setLocalRssTargetKiosks] = useState<string[]>(kioskStore.rssTargetKiosks || []);
  const [localLiteTargetKiosks, setLocalLiteTargetKiosks] = useState<string[]>(kioskStore.liteTargetKiosks || []);
  const [localMobileLat, setLocalMobileLat] = useState<string>(kioskStore.mobileLat || "");
  const [localMobileLng, setLocalMobileLng] = useState<string>(kioskStore.mobileLng || "");
  const [localMobileRadius, setLocalMobileRadius] = useState<number>(kioskStore.mobileRadius || 100);
  const [availableKiosks, setAvailableKiosks] = useState<{ id: string, name: string }[]>([]);

  // V21: GPS Test State
  const [isTestingGps, setIsTestingGps] = useState(false);
  const [testGpsResult, setTestGpsResult] = useState<{ distance: number, allowed: boolean, message: string } | null>(null);

  useEffect(() => {
    kioskStore.fetchSettings();
    fetchAllKiosks().then(setAvailableKiosks).catch(console.error);
  }, []);

  // Atualizar visualmente caso o DB chegue depois
  useEffect(() => {
    setLocalTickerSpeed(kioskStore.newsTickerSpeed);
    setLocalRssLayout(kioskStore.rssLayout || '3d');
    setLocalRssSources(kioskStore.rssSources || ['g1']);
    setLocalRssTargetKiosks(kioskStore.rssTargetKiosks || []);
    setLocalLiteTargetKiosks(kioskStore.liteTargetKiosks || []);
    setLocalMobileLat(kioskStore.mobileLat || "");
    setLocalMobileLng(kioskStore.mobileLng || "");
    setLocalMobileRadius(kioskStore.mobileRadius || 100);
  }, [kioskStore.newsTickerSpeed, kioskStore.rssLayout, kioskStore.rssSources, kioskStore.rssTargetKiosks, kioskStore.liteTargetKiosks, kioskStore.mobileLat, kioskStore.mobileLng, kioskStore.mobileRadius]);

  const handleTestGps = () => {
    setIsTestingGps(true);
    setTestGpsResult(null);

    if (!navigator.geolocation) {
      setTestGpsResult({ distance: 0, allowed: false, message: "Geolocalização não suportada no seu navegador." });
      setIsTestingGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
         const userLat = position.coords.latitude;
         const userLng = position.coords.longitude;
         const destLat = parseFloat(localMobileLat || "0");
         const destLng = parseFloat(localMobileLng || "0");
         
         const distanceMetres = haversineDistance(userLat, userLng, destLat, destLng);
         const isAllowed = distanceMetres <= localMobileRadius;

         setTestGpsResult({
            distance: Math.round(distanceMetres),
            allowed: isAllowed,
            message: isAllowed ? "Você está dentro da Cerca Virtual!" : "Você está fora da Cerca Virtual!"
         });
         setIsTestingGps(false);
      },
      (error) => {
         setTestGpsResult({ distance: 0, allowed: false, message: "Erro ao ler seu GPS. Permita a localização no navegador." });
         setIsTestingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const toggleSource = (sourceId: string) => {
    const current = localRssSources;
    const updated = current.includes(sourceId)
      ? current.filter(id => id !== sourceId)
      : [...current, sourceId];
    setLocalRssSources(updated.length > 0 ? updated : ['g1']);
  };

  return (
    <div className="hud-card rounded-lg pt-2 pb-0 sm:pt-4 overflow-hidden animate-fade-up">
      <div
        className="flex items-center justify-between border-b border-border px-5 pb-4 cursor-pointer hover:bg-slate-800/20 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Settings2 className="size-5 text-primary" />
          <h3 className="font-heading text-lg font-semibold text-text-primary">
            Digital Signage (Configurador do Quiosque)
          </h3>
        </div>
        <div>
          {isOpen ? <ChevronUp className="size-5 text-slate-400" /> : <ChevronDown className="size-5 text-slate-400" />}
        </div>
      </div>

      {isOpen && (
        <div className="p-5 space-y-6">
          {/* Parâmetros Globais do Reprodutor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-slate-800/50 bg-[#0d1117] p-3">
              <Label className="text-text-secondary text-xs">Atraso de Inatividade (seg)</Label>
              <Input
                type="number"
                value={kioskStore.idleTimeoutSec}
                onChange={(e) => kioskStore.updateSettings({ idleTimeoutSec: Number(e.target.value) })}
                className="mt-1 h-8 border-slate-800 bg-slate-900/50 text-sm"
                title="Tempo de tela parada antes do painel ligar"
              />
            </div>
            <div className="rounded-lg border border-slate-800/50 bg-[#0d1117] p-3 flex flex-col justify-between">
              <Label className="text-text-secondary text-xs">Duração Padrão das Imagens (seg)</Label>
              <Input
                type="number"
                value={kioskStore.slideIntervalSec}
                onChange={(e) => kioskStore.updateSettings({ slideIntervalSec: Number(e.target.value) })}
                className="mt-1 h-8 border-slate-800 bg-slate-900/50 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Bloco de Configuração de RSS */}
            <div className="rounded-lg border border-slate-800/50 bg-[#0d1017] p-4 flex flex-col gap-4">
              <div className="flex justify-between items-center bg-slate-800/20 p-2 rounded border border-slate-800/50">
                <Label className="text-text-primary font-semibold flex items-center gap-2">
                  <MonitorPlay className="size-4 text-cyan-400" />
                  Motor de Notícias (RSS Multimídia)
                </Label>
                <button
                  onClick={() => kioskStore.updateSettings({ enableNewsTicker: !kioskStore.enableNewsTicker })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${kioskStore.enableNewsTicker ? 'bg-cyan-500' : 'bg-slate-700'}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${kioskStore.enableNewsTicker ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-90 transition-opacity" style={{ opacity: kioskStore.enableNewsTicker ? 1 : 0.5 }}>
                {/* Layout Selector */}
                <div className="flex flex-col gap-2">
                  <Label className="text-text-secondary text-xs">Aparência na Tela Cheia</Label>
                  <select
                    value={localRssLayout}
                    onChange={(e) => setLocalRssLayout(e.target.value)}
                    disabled={!kioskStore.enableNewsTicker}
                    className="w-full h-10 text-sm bg-slate-900/80 border border-slate-700/80 rounded px-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  >
                    <option value="3d">📰 Carrossel 3D Animado</option>
                    <option value="grid">🧱 Mosaico (Grid 2x2)</option>
                    <option value="cards">🃏 Cartões Deslizantes</option>
                    <option value="ticker-only">🤫 Apenas Letreiro Inferior</option>
                  </select>
                  <p className="text-[10px] text-slate-500">Define o formato visual das notícias quando não hão campanhas no ar.</p>
                </div>

                {/* Sources Selector */}
                <div className="flex flex-col gap-2">
                  <Label className="text-text-secondary text-xs">Veículos de Notícia Ativos</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {NEWS_SOURCES.map(source => {
                      const isActive = localRssSources.includes(source.id);
                      return (
                        <button
                          key={source.id}
                          onClick={() => toggleSource(source.id)}
                          disabled={!kioskStore.enableNewsTicker}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${isActive
                            ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                            : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:bg-slate-800'
                            }`}
                        >
                          {isActive && <Check className="size-3" />}
                          {source.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/50" style={{ opacity: kioskStore.enableNewsTicker ? 1 : 0.5 }}>
                <Label className="text-text-secondary text-xs">Exibir Notícias Nestes Quiosques (Opcional)</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className={`h-7 text-xs ${localRssTargetKiosks.length === 0 ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900'}`}
                    onClick={() => setLocalRssTargetKiosks([])}
                    disabled={!kioskStore.enableNewsTicker}
                  >
                    Transmitir para Todos
                  </Button>
                  {availableKiosks.map(k => {
                    const isSelected = localRssTargetKiosks.includes(k.id);
                    return (
                      <Button
                        key={k.id}
                        variant="outline"
                        size="sm"
                        disabled={!kioskStore.enableNewsTicker}
                        className={`h-7 text-xs flex items-center gap-1.5 ${isSelected ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900'}`}
                        onClick={() => {
                          setLocalRssTargetKiosks(prev =>
                            prev.includes(k.id) ? prev.filter(id => id !== k.id) : [...prev, k.id]
                          )
                        }}
                      >
                        <MonitorPlay className="size-3" />
                        {k.name}
                      </Button>
                    )
                  })}
                </div>
              </div>

              {/* LITE MODE SECTION */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/50">
                <Label className="text-text-primary text-xs flex items-center gap-2">
                  ⚡ Modo Tablet (Lite / Desempenho)
                </Label>
                <p className="text-[10px] text-slate-500">Tablets selecionados desativam letreiros que travam a máquina e escaneiam a Face de 2 em 2 segundos para não superaquecer.</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {availableKiosks.map(k => {
                    const isLite = localLiteTargetKiosks.includes(k.id);
                    return (
                      <Button
                        key={k.id}
                        variant="outline"
                        size="sm"
                        className={`h-7 text-xs flex items-center gap-1.5 ${isLite ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900'}`}
                        onClick={() => {
                          setLocalLiteTargetKiosks(prev =>
                            prev.includes(k.id) ? prev.filter(id => id !== k.id) : [...prev, k.id]
                          )
                        }}
                      >
                        <MonitorPlay className="size-3" />
                        {k.name}
                      </Button>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-800/50">
                <Button
                  size="sm"
                  disabled={(localRssLayout === kioskStore.rssLayout && JSON.stringify(localRssSources) === JSON.stringify(kioskStore.rssSources) && JSON.stringify(localRssTargetKiosks) === JSON.stringify(kioskStore.rssTargetKiosks) && JSON.stringify(localLiteTargetKiosks) === JSON.stringify(kioskStore.liteTargetKiosks))}
                  onClick={() => {
                    kioskStore.updateSettings({ rssLayout: localRssLayout, rssSources: localRssSources, rssTargetKiosks: localRssTargetKiosks, liteTargetKiosks: localLiteTargetKiosks });
                    toast.success("Opções de Estilo e Canais RSS Salvas no Sistema!");
                  }}
                  className="h-8 text-xs bg-cyan-600 hover:bg-cyan-500 text-white px-5 transition-all w-full sm:w-auto"
                >
                  <Save className="size-3.5 mr-2" /> Confirmar Escolhas
                </Button>
              </div>

              <div className="pt-3 flex flex-col gap-2 border-t border-slate-800/50" style={{ opacity: kioskStore.enableNewsTicker ? 1 : 0.5 }}>
                <div className="flex justify-between items-center mb-1">
                  <Label className="text-text-secondary text-xs">Velocidade do Letreiro Rodapé (Ticker)</Label>
                  <span className="text-xs text-cyan-400 font-mono bg-cyan-500/10 px-2 py-0.5 rounded">{kioskStore.newsTickerSpeed}s</span>
                </div>
                <div className="flex gap-4 items-center">
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={localTickerSpeed}
                    onChange={(e) => setLocalTickerSpeed(Number(e.target.value))}
                    disabled={!kioskStore.enableNewsTicker}
                    className="flex-1 accent-cyan-500 cursor-ew-resize disabled:grayscale disabled:cursor-not-allowed"
                    title="Menor = Mais Rápido | Maior = Mais Lento"
                  />
                  <Button
                    size="sm"
                    disabled={!kioskStore.enableNewsTicker || localTickerSpeed === kioskStore.newsTickerSpeed}
                    onClick={() => kioskStore.updateSettings({ newsTickerSpeed: localTickerSpeed })}
                    className="h-8 text-xs bg-cyan-600 hover:bg-cyan-500 text-white px-4 shrink-0 transition-all"
                  >
                    Salvar Vel.
                  </Button>
                </div>
              </div>
            </div>
            {/* Bloco Geofencing Mobile (V21) */}
            <div className="rounded-lg border border-purple-900/40 bg-[#160d17] p-4 flex flex-col gap-4">
              <div className="flex justify-between items-center bg-purple-900/20 p-2 rounded border border-purple-800/50">
                <Label className="text-purple-300 font-semibold flex items-center gap-2">
                  <span className="text-purple-400">📍</span> Extensão WebApp: PontoFace Mobile (GPS)
                </Label>
              </div>
              <p className="text-xs text-purple-200/60">
                Configure as coordenadas centrais da Sede. O PontoFace Mobile exige que o funcionário cruze esta Cerca Virtual (Geofencing) para destravar a Câmera Selfie.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-purple-200/80 text-xs">Latitude Sede (Ex: -23.55)</Label>
                  <Input
                    type="text"
                    value={localMobileLat}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Auto-Parser: Se o usuário colar "Lat,Lng" ou "Lat  Lng" tudo no 1º campo:
                      if (val.includes(",") || val.match(/\s+/)) {
                         const match = val.replace(/,/g, " ").trim().split(/\s+/);
                         if (match.length >= 2) {
                            setLocalMobileLat(match[0]);
                            setLocalMobileLng(match[1]);
                            toast.info("Auto-recortamos a Latitude e Longitude para você!");
                            return;
                         }
                      }
                      setLocalMobileLat(val);
                    }}
                    placeholder="-23.550520"
                    className="h-9 border-purple-800/50 bg-purple-950/20 text-sm font-mono text-purple-100"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-purple-200/80 text-xs">Longitude Sede (Ex: -46.63)</Label>
                  <Input
                    type="text"
                    value={localMobileLng}
                    onChange={(e) => setLocalMobileLng(e.target.value)}
                    placeholder="-46.633308"
                    className="h-9 border-purple-800/50 bg-purple-950/20 text-sm font-mono text-purple-100"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-purple-200/80 text-xs">Raio de Tolerância (Metros)</Label>
                  <Input
                    type="number"
                    value={localMobileRadius}
                    onChange={(e) => setLocalMobileRadius(Number(e.target.value))}
                    className="h-9 border-purple-800/50 bg-purple-950/20 text-sm font-mono text-purple-100"
                  />
                </div>
              </div>
              
              {testGpsResult && (
                <div className={`mt-2 p-3 rounded-md border text-xs flex flex-col gap-1 items-start ${testGpsResult.allowed ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-300' : 'bg-red-950/40 border-red-900/50 text-red-300'}`}>
                   <div className="flex items-center gap-2 font-semibold">
                      {testGpsResult.allowed ? <Check className="size-4" /> : <MapPin className="size-4" />}
                      {testGpsResult.message}
                   </div>
                   <span className="opacity-80">
                      Sua distância até as coordenadas acima é de: <strong className="font-mono text-white text-sm">{testGpsResult.distance} metros</strong>.
                   </span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-purple-800/40 items-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTestGps}
                  disabled={isTestingGps || !localMobileLat || !localMobileLng}
                  className="h-8 text-xs border-purple-700/50 hover:bg-purple-900/30 text-purple-300 transition-all"
                >
                  {isTestingGps ? (
                     <span className="size-3.5 mr-2 border-2 border-purple-300/30 border-t-purple-300 rounded-full animate-spin"></span>
                  ) : (
                     <Navigation className="size-3.5 mr-2" /> 
                  )}
                  Testar Minha Posição Agora
                </Button>

                <Button
                  size="sm"
                  disabled={(!localMobileLat || !localMobileLng) || (localMobileLat === kioskStore.mobileLat && localMobileLng === kioskStore.mobileLng && localMobileRadius === kioskStore.mobileRadius)}
                  onClick={async () => {
                    const result = await kioskStore.updateSettings({ mobileLat: localMobileLat, mobileLng: localMobileLng, mobileRadius: localMobileRadius });
                    if (result?.success === false) {
                        toast.error(`Falha no Banco de Dados: ${result.error?.message || "Recusado pelo Servidor"}`);
                        return;
                    }
                    toast.success("Geolocalização Base de Ponto Mobile atualizada!");
                  }}
                  className="h-8 text-xs bg-purple-600 hover:bg-purple-500 text-white px-5 transition-all w-full sm:w-auto"
                >
                  <Save className="size-3.5 mr-2" /> Salvar Coordenadas GPS
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-text-secondary text-xs">Header Title do Terminal</Label>
              <Input
                value={kioskStore.message}
                onChange={(e) => kioskStore.updateSettings({ message: e.target.value })}
                className="mt-1 h-8 border-slate-800 bg-slate-900/50 text-sm focus-visible:ring-cyan-500"
                placeholder="Toque na tela para abrir o relógio de ponto..."
              />
            </div>
          </div>

          {/* Gerenciador em Abas (Nova Fase 3) */}
          <div className="pt-4 border-t border-slate-800/80">
            <Tabs defaultValue="campaigns" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-900 border border-slate-800 rounded-lg p-1 h-12">
                <TabsTrigger value="library" className="data-[state=active]:bg-slate-800 data-[state=active]:text-cyan-400 font-medium">
                  <BookImage className="size-4 mr-2" /> Biblioteca de Mídia ({kioskStore.library.length})
                </TabsTrigger>
                <TabsTrigger value="campaigns" className="data-[state=active]:bg-slate-800 data-[state=active]:text-cyan-400 font-medium">
                  <MonitorPlay className="size-4 mr-2" /> Campanhas no Ar ({kioskStore.campaigns.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="library" className="focus-visible:ring-0 outline-none">
                <LibraryTab />
              </TabsContent>

              <TabsContent value="campaigns" className="focus-visible:ring-0 outline-none">
                <CampaignsTab />
              </TabsContent>
            </Tabs>
          </div>

        </div>
      )}
    </div>
  );
}
