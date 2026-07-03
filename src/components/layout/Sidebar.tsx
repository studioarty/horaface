import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ScanFace,
  Users,
  Clock,
  BarChart3,
  BookOpen,
  ShieldCheck,
  ChevronsLeft,
  ChevronsRight,
  X,
  LogOut,
  Monitor,
  Moon,
  Sun,
  Calendar,
  MessageSquare,
} from "lucide-react";
import { NAV_ITEMS } from "@/constants/config";
import { useSidebar } from "@/hooks/useSidebar";
import { useAuthStore } from "@/stores/useAuthStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { useToast } from "@/hooks/use-toast";

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  ScanFace,
  Users,
  Clock,
  BarChart3,
  BookOpen,
  Monitor,
  Calendar,
  MessageSquare,
};

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { collapsed, mobileOpen, toggle, closeMobile } = useSidebar();
  const auth = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/login");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro ao sair", description: err.message });
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          zIndex: 50,
          height: "100vh",
          width: collapsed ? 72 : 240,
          background: "var(--color-bg-surface)",
          borderRight: "1px solid var(--color-border)",
          transition: "all 300ms ease-in-out",
          transform: mobileOpen
            ? "translateX(0)"
            : typeof window !== "undefined" && window.innerWidth < 1024
              ? "translateX(-100%)"
              : "translateX(0)",
          display: "flex",
          flexDirection: "column",
          overflowX: "hidden",
        }}
        className="lg:translate-x-0"
      >
        {/* Header */}
        <div
          className="flex items-center border-b border-border px-3 py-4"
          style={{ justifyContent: collapsed ? "center" : "space-between" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex shrink-0 items-center justify-center rounded-lg shadow-glow"
              style={{ width: 36, height: 36, background: "var(--color-primary-dim)" }}
            >
              <ShieldCheck style={{ width: 20, height: 20, color: "var(--color-primary)" }} />
            </div>
            {!collapsed && (
              <div style={{ overflow: "hidden" }}>
                <h1
                  style={{
                    fontFamily: "Rajdhani, system-ui, sans-serif",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "var(--color-primary)",
                    lineHeight: 1.2,
                  }}
                >
                  HoraFace
                </h1>
                <p
                  style={{
                    fontFamily: "Share Tech Mono, monospace",
                    fontSize: 10,
                    textTransform: "uppercase",
                    color: "var(--color-text-muted)",
                  }}
                >
                  Painel Admin
                </p>
              </div>
            )}
          </div>

          <button
            onClick={closeMobile}
            className="flex items-center justify-center rounded-lg text-text-muted hover:bg-elevated hover:text-text-primary lg:hidden"
            style={{ width: 32, height: 32 }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>

          {!collapsed && (
            <button
              onClick={toggle}
              className="hidden lg:flex items-center justify-center rounded-md text-text-muted hover:bg-elevated hover:text-text-primary"
              style={{ width: 28, height: 28 }}
              title="Recolher sidebar"
            >
              <ChevronsLeft style={{ width: 16, height: 16 }} />
            </button>
          )}
        </div>

        {collapsed && (
          <div className="hidden lg:flex items-center justify-center px-3 py-2">
            <button
              onClick={toggle}
              className="flex items-center justify-center rounded-lg text-text-muted hover:bg-elevated hover:text-primary transition-colors"
              style={{ width: 32, height: 32 }}
              title="Expandir sidebar"
            >
              <ChevronsRight style={{ width: 16, height: 16 }} />
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav
          style={{
            flex: 1,
            padding: collapsed ? "12px 8px" : "12px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {NAV_ITEMS.filter((item) => {
            if (auth.user?.role !== 'super_admin' && (item.path === '/admin-quiosques' || item.path === '/equipe' || item.path === '/configuracoes' || item.path === '/docs')) return false;
            if (auth.user?.role === 'viewer' && (item.path === '/prestadores' || item.path === '/turnos' || item.path === '/feriados' || item.path === '/aferidor-de-horas')) return false;
            return true;
          }).map((item) => {
            const Icon = iconMap[item.icon];
            const isActive =
              item.path === "/" ? location.pathname === "/" : location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeMobile}
                title={collapsed ? item.label : undefined}
                className="flex items-center rounded-lg transition-all duration-200"
                style={{
                  justifyContent: collapsed ? "center" : "flex-start",
                  gap: collapsed ? 0 : 12,
                  padding: collapsed ? "10px 0" : "10px 12px",
                  fontSize: 14,
                  fontWeight: 500,
                  color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)",
                  background: isActive ? "var(--color-primary-dim)" : "transparent",
                  boxShadow: isActive ? "var(--glow-primary)" : "none",
                  textDecoration: "none",
                }}
              >
                {Icon && <Icon style={{ width: 18, height: 18, flexShrink: 0 }} />}
                {!collapsed && <span>{item.label}</span>}
                {isActive && !collapsed && (
                  <div
                    style={{
                      marginLeft: "auto",
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--color-primary)",
                      boxShadow: "var(--glow-primary)",
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-border" style={{ padding: collapsed ? "12px 8px" : "12px 16px" }}>
          {/* Admin info */}
          {!collapsed && auth.user && (
            <div className="mb-2 px-1">
              <p
                className="truncate text-xs font-medium"
                style={{ color: "var(--color-text-primary)" }}
              >
                {auth.user.username}
              </p>
              <p
                className="truncate text-[10px] uppercase"
                style={{ color: "var(--color-text-muted)" }}
              >
                {auth.user.role === 'root' ? 'Super Admin' : 'Admin'}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            title={collapsed ? "Sair" : undefined}
            className="flex w-full items-center rounded-lg text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-all"
            style={{
              justifyContent: collapsed ? "center" : "flex-start",
              gap: collapsed ? 0 : 10,
              padding: collapsed ? "10px 0" : "8px 12px",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            <LogOut style={{ width: 16, height: 16, flexShrink: 0 }} />
            {!collapsed && <span>Sair</span>}
          </button>

          {/* Date & Theme */}
          <div className="mt-2 flex items-center" style={{ justifyContent: collapsed ? "center" : "space-between", flexDirection: collapsed ? "column" : "row" }}>
            <p
              style={{
                fontFamily: "Share Tech Mono, monospace",
                fontSize: collapsed ? 10 : 12,
                color: "var(--color-text-muted)",
                textAlign: collapsed ? "center" : "left",
              }}
            >
              {collapsed
                ? new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                : new Date().toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                })}
            </p>
            <button
              title="Alternar Tema Escuro/Claro"
              onClick={toggleTheme}
              className="text-slate-400 hover:text-cyan-500 transition-colors"
              style={{ marginTop: collapsed ? 8 : 0 }}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
