import { showToast } from "@/components/ui/toaster";

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

function toast(options: ToastOptions) {
  showToast(options);
}

export function useToast() {
  return { toast };
}
