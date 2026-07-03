import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { Home, List, LogOut, MessageSquare } from 'lucide-react';
import { useProviderAuthStore } from '@/stores/useProviderAuthStore';

function ProviderLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-base)]">
        <div className="size-10 rounded-full border-4 border-emerald-900 border-t-emerald-400 animate-spin" />
    </div>
  );
}

export default function ProviderLayout() {
  const { user, loading, initialized, logout } = useProviderAuthStore();
  const location = useLocation();

  if (!initialized || loading) return <ProviderLoader />;
  if (!user) return <Navigate to="/parceiro/login" replace />;

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex flex-col min-h-[100dvh]" style={{ background: 'var(--color-bg-base)' }}>
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-emerald-900/30 px-4 py-3 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
             <span className="text-emerald-400 font-bold text-sm">
                {user.name.charAt(0).toUpperCase()}
             </span>
          </div>
          <div className="flex flex-col">
            <span className="text-white font-medium text-sm leading-none">{user.name.split(' ')[0]}</span>
            <span className="text-emerald-400/70 text-[10px] uppercase font-bold mt-1 tracking-wider">Parceiro</span>
          </div>
        </div>
        <button onClick={logout} className="p-2 text-slate-400 hover:text-rose-400 transition-colors">
          <LogOut className="size-5" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-20 scroll-smooth">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 h-16 bg-slate-950/90 backdrop-blur-xl border-t border-emerald-900/30 flex justify-around items-center px-2 z-50 pb-safe">
        <Link
          to="/parceiro"
          className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
            isActive('/parceiro') ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Home className={`size-5 ${isActive('/parceiro') ? 'drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]' : ''}`} />
          <span className="text-[10px] font-medium">Início</span>
        </Link>
        <Link
          to="/parceiro/extrato"
          className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
            isActive('/parceiro/extrato') ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <List className={`size-5 ${isActive('/parceiro/extrato') ? 'drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]' : ''}`} />
          <span className="text-[10px] font-medium">Extrato</span>
        </Link>
        <Link
          to="/parceiro/chat"
          className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
            isActive('/parceiro/chat') ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <MessageSquare className={`size-5 ${isActive('/parceiro/chat') ? 'drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]' : ''}`} />
          <span className="text-[10px] font-medium">Chat</span>
        </Link>
      </nav>
    </div>
  );
}
