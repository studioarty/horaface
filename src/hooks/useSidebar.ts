import { useState, useCallback, useEffect } from "react";

const SIDEBAR_STORAGE_KEY = "pontoface-sidebar-collapsed";

let globalCollapsed = false;
let globalMobileOpen = false;
const listeners = new Set<() => void>();

// Initialize
try {
  const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
  if (stored !== null) globalCollapsed = stored === "true";
  else if (typeof window !== "undefined") globalCollapsed = window.innerWidth < 1024;
} catch {
  globalCollapsed = false;
}

function notify() {
  listeners.forEach((fn) => fn());
}

export function useSidebar() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const updater = () => setTick((c) => c + 1);
    listeners.add(updater);
    return () => {
      listeners.delete(updater);
    };
  }, []);

  useEffect(() => {
    const handler = () => {
      if (window.innerWidth >= 1024 && globalMobileOpen) {
        globalMobileOpen = false;
        notify();
      }
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const toggle = useCallback(() => {
    if (window.innerWidth < 1024) {
      globalMobileOpen = !globalMobileOpen;
    } else {
      globalCollapsed = !globalCollapsed;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(globalCollapsed));
      } catch {}
    }
    notify();
  }, []);

  const closeMobile = useCallback(() => {
    if (globalMobileOpen) {
      globalMobileOpen = false;
      notify();
    }
  }, []);

  return {
    collapsed: globalCollapsed,
    mobileOpen: globalMobileOpen,
    toggle,
    closeMobile,
  };
}
