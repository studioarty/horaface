import { useEffect, useState } from "react";
import { ScanFace } from "lucide-react";

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [isWarping, setIsWarping] = useState(false);
  const [scanText, setScanText] = useState("INICIALIZANDO SISTEMA...");
  
  useEffect(() => {
    // Step 1: Scanning phases
    const t1 = setTimeout(() => setScanText("VERIFICANDO BIOMETRIA..."), 800);
    const t2 = setTimeout(() => setScanText("ACESSO CONCEDIDO"), 1800);
    
    // Step 2: Trigger Warp transition
    const t3 = setTimeout(() => {
      setIsWarping(true);
    }, 2400);

    // Step 3: Unmount component
    const t4 = setTimeout(() => {
      onComplete();
    }, 3100); // Wait 700ms for warp animation to finish

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#050A18] transition-opacity duration-500 ease-in-out ${isWarping ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      style={{ fontFamily: "'Share Tech Mono', monospace" }}
    >
      {/* Background Cyber-Grid */}
      <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(rgba(34,211,238,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.8)_1px,transparent_1px)] bg-[size:40px_40px]" />

      <div className={`relative flex flex-col items-center transition-transform duration-700 ease-in-out ${isWarping ? "scale-[4] blur-xl" : "scale-100"}`}>
        
        {/* Core Biometric Icon Container */}
        <div className="relative w-40 h-40 flex items-center justify-center hud-border rounded-full bg-[#0C1222] shadow-[0_0_40px_rgba(34,211,238,0.15)] overflow-hidden">
          
          <ScanFace className="w-20 h-20 text-[#22D3EE] drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]" strokeWidth={1.5} />
          
          {/* Scanning Laser (uses existing animate-kiosk-scan) */}
          <div className="absolute left-0 w-full h-[2px] bg-[#22D3EE] shadow-[0_0_15px_#22D3EE] animate-kiosk-scan" style={{ animationDuration: '1.5s' }} />
        </div>

        {/* HUD Concentric Rings */}
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-[60%] w-56 h-56 rounded-full border border-[rgba(34,211,238,0.3)] border-dashed animate-[spin_10s_linear_infinite]" />
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-[60%] w-64 h-64 rounded-full border border-[rgba(34,211,238,0.1)] border-t-[rgba(34,211,238,0.6)] animate-[spin_4s_linear_infinite_reverse]" />
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-[60%] w-72 h-72 rounded-full border border-[rgba(34,211,238,0.05)] border-b-[rgba(34,211,238,0.3)] animate-[spin_7s_linear_infinite]" />

        {/* Text Area */}
        <div className="mt-16 flex flex-col items-center">
          <div className="text-[#22D3EE] text-2xl font-bold tracking-[0.25em] mb-3 text-shadow-glow">
            HORA<span className="text-white">FACE</span>
          </div>
          <div className={`text-sm tracking-widest transition-colors duration-300 font-semibold ${scanText === 'ACESSO CONCEDIDO' ? 'text-[#10B981] drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'text-[#22D3EE] animate-pulse drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]'}`}>
            {scanText}
          </div>
        </div>
      </div>
    </div>
  );
}
