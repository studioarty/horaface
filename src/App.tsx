import { lazy, Suspense, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import SplashScreen from "@/components/layout/SplashScreen";
import { Toaster } from "@/components/ui/toaster";
import AppLayout from "@/components/layout/AppLayout";
import { useAuthStore } from "@/stores/useAuthStore";
import AutoLogoutWrapper from "@/components/features/AutoLogoutWrapper";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const TimeClock = lazy(() => import("@/pages/TimeClock"));
const Providers = lazy(() => import("@/pages/Providers"));
const Shifts = lazy(() => import("@/pages/Shifts"));
const Reports = lazy(() => import("@/pages/Reports"));
const KiosksAdmin = lazy(() => import("@/pages/KiosksAdmin"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Docs = lazy(() => import("@/pages/Docs"));
const Kiosk = lazy(() => import("@/pages/Kiosk"));
const KioskTest = lazy(() => import("@/pages/KioskTest"));
const Login = lazy(() => import("@/pages/Login"));
const Holidays = lazy(() => import("@/pages/Holidays"));
const Settings = lazy(() => import("@/pages/Settings"));
const AdminsList = lazy(() => import("@/pages/AdminsList"));
const MobileKiosk = lazy(() => import("@/pages/MobileKiosk"));

// === Provider App ===
const ProviderLogin = lazy(() => import("@/pages/ProviderApp/ProviderLogin"));
const ProviderLayout = lazy(() => import("@/pages/ProviderApp/ProviderLayout"));
const ProviderDashboard = lazy(() => import("@/pages/ProviderApp/ProviderDashboard"));
const ProviderHistory = lazy(() => import("@/pages/ProviderApp/ProviderHistory"));
const ProviderChat = lazy(() => import("@/pages/ProviderApp/ProviderChat"));
const ChatAdmin = lazy(() => import("@/pages/ChatAdmin"));

function PageLoader() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-bg-base)",
        color: "var(--color-primary)",
        fontFamily: "Rajdhani, system-ui, sans-serif",
        fontSize: "1.125rem",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 40,
            height: 40,
            margin: "0 auto 12px",
            border: "3px solid var(--color-border-active)",
            borderTopColor: "var(--color-primary)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <p
          style={{
            fontFamily: "Share Tech Mono, monospace",
            fontSize: 13,
            color: "var(--color-text-secondary)",
          }}
        >
          Carregando módulo...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, initialized } = useAuthStore();

  if (!initialized || loading) return <PageLoader />;
  if (!user) {
    if (localStorage.getItem('pwaMode') === 'provider') {
      return <Navigate to="/marcar-horas" replace />;
    }
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes - Quiosques */}
          <Route path="/quiosque" element={<Kiosk />} />
          <Route path="/quiosque-teste" element={<KioskTest />} />

          {/* Public routes - Marcação de Horas (colaborador) */}
          <Route path="/marcar-horas" element={<MobileKiosk />} />
          {/* Compatibilidade: links antigos /meu-ponto continuam funcionando automaticamente */}
          <Route path="/meu-ponto" element={<Navigate to="/marcar-horas" replace />} />
          <Route path="/parceiro/marcar-horas" element={<Navigate to="/marcar-horas" replace />} />
          <Route path="/parceiro/meu-ponto" element={<Navigate to="/marcar-horas" replace />} />

          <Route path="/login" element={<Login />} />


          {/* Provider PWA routes */}
          <Route path="/parceiro/login" element={<ProviderLogin />} />
          <Route element={<ProviderLayout />}>
            <Route path="/parceiro" element={<ProviderDashboard />} />
            <Route path="/parceiro/extrato" element={<ProviderHistory />} />
            <Route path="/parceiro/chat" element={<ProviderChat />} />
          </Route>

          {/* Protected admin routes */}
          <Route
            element={
              <ProtectedRoute>
                <AutoLogoutWrapper>
                  <AppLayout />
                </AutoLogoutWrapper>
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/aferidor-de-horas" element={<TimeClock />} />
            <Route path="/prestadores" element={<Providers />} />
            <Route path="/chat" element={<ChatAdmin />} />
            <Route path="/turnos" element={<Shifts />} />
            <Route path="/relatorios" element={<Reports />} />
            <Route path="/feriados" element={<Holidays />} />
            <Route path="/admin-quiosques" element={<KiosksAdmin />} />
            <Route path="/equipe" element={<AdminsList />} />
            <Route path="/configuracoes" element={<Settings />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
      <Toaster />
    </BrowserRouter>
    {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
    </>
  );
}
