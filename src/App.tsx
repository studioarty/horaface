import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import AppLayout from "@/components/layout/AppLayout";
import { useAuthStore } from "@/stores/useAuthStore";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const TimeClock = lazy(() => import("@/pages/TimeClock"));
const Providers = lazy(() => import("@/pages/Providers"));
const Shifts = lazy(() => import("@/pages/Shifts"));
const Reports = lazy(() => import("@/pages/Reports"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Docs = lazy(() => import("@/pages/Docs"));
const Kiosk = lazy(() => import("@/pages/Kiosk"));
const Login = lazy(() => import("@/pages/Login"));

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
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/quiosque" element={<Kiosk />} />
          <Route path="/login" element={<Login />} />

          {/* Protected admin routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/ponto" element={<TimeClock />} />
            <Route path="/prestadores" element={<Providers />} />
            <Route path="/turnos" element={<Shifts />} />
            <Route path="/relatorios" element={<Reports />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
      <Toaster />
    </BrowserRouter>
  );
}
