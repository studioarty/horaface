import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// ── Forçar limpeza de cache (uma vez por versão) ──────────────────────────
const APP_VERSION = '2026.07.04.v2';
if (typeof window !== 'undefined') {
  const lastVersion = localStorage.getItem('horaface_version');
  if (lastVersion !== APP_VERSION && 'serviceWorker' in navigator) {
    localStorage.setItem('horaface_version', APP_VERSION);
    // Desregistrar todos os SWs e limpar caches
    navigator.serviceWorker.getRegistrations().then(async (regs) => {
      for (const reg of regs) await reg.unregister();
      const keys = await caches.keys();
      for (const key of keys) await caches.delete(key);
      if (lastVersion) window.location.reload(); // Só recarrega se tinha versão anterior
    });
  }
}

// Immediate PWA Auto-Update Strategy
if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  const checkUpdate = () => {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.update().catch((err) => {
          console.error("Erro ao atualizar Service Worker no início:", err);
        });
      })
      .catch((err) => {
        console.error("Service Worker ready error:", err);
      });
  };

  // Check on load
  checkUpdate();

  // Check whenever page becomes visible (app resumed from background)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      checkUpdate();
    }
  });
}

const rootEl = document.getElementById("root");
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} else {
  console.error("Root element not found");
}
