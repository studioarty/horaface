import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface ToastData {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

let toastListeners: Array<(toast: ToastData) => void> = [];

export function showToast(options: Omit<ToastData, "id">) {
  const toast: ToastData = {
    ...options,
    id: "toast-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
  };
  toastListeners.forEach((fn) => fn(toast));
}

function Toaster() {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  React.useEffect(() => {
    const handler = (toast: ToastData) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 4000);
    };
    toastListeners.push(handler);
    return () => {
      toastListeners = toastListeners.filter((fn) => fn !== handler);
    };
  }, []);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-[200] flex flex-col gap-2" style={{ maxWidth: 340 }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "relative flex items-start gap-3 rounded-lg border p-4 shadow-lg animate-fade-up",
            toast.variant === "destructive"
              ? "border-error/30 bg-error/10 text-error"
              : "border-border bg-surface text-text-primary",
          )}
        >
          <div className="flex-1 min-w-0">
            {toast.title && (
              <p className="text-sm font-semibold">{toast.title}</p>
            )}
            {toast.description && (
              <p className={cn(
                "mt-0.5 text-xs",
                toast.variant === "destructive" ? "text-error/80" : "text-text-secondary",
              )}>
                {toast.description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            className="shrink-0 opacity-70 hover:opacity-100 text-text-muted"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export { Toaster };
