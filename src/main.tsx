import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

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
