import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import { useSidebar } from "@/hooks/useSidebar";
import { useEffect, useState } from "react";

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false,
  );

  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return isDesktop;
}

export default function AppLayout() {
  const { collapsed, toggle } = useSidebar();
  const isDesktop = useIsDesktop();

  const mainMargin = isDesktop ? (collapsed ? 72 : 240) : 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg-base)" }}>
      <Sidebar />

      {/* Mobile top bar */}
      <header
        className="sticky top-0 z-20 flex items-center gap-3 border-b border-border px-4 py-3 lg:hidden"
        style={{ background: "var(--color-bg-surface)", backdropFilter: "blur(8px)" }}
      >
        <button
          onClick={toggle}
          className="flex items-center justify-center rounded-lg border border-border bg-elevated text-text-secondary hover:text-primary transition-colors"
          style={{ width: 40, height: 40 }}
          aria-label="Abrir menu"
        >
          <Menu className="size-5" />
        </button>
        <h1 style={{ fontFamily: "Rajdhani, system-ui, sans-serif", fontSize: 18, fontWeight: 700, color: "var(--color-primary)" }}>
          PontoFace
        </h1>
      </header>

      <main
        style={{
          marginLeft: mainMargin,
          transition: "margin-left 300ms ease-in-out",
          minWidth: 0,
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
