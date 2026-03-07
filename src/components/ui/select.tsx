import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Check } from "lucide-react";

interface SelectContextType {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextType>({
  value: "",
  onValueChange: () => {},
  open: false,
  setOpen: () => {},
});

function Select({
  value,
  onValueChange,
  children,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}) {
  const [internalValue, setInternalValue] = React.useState(value || "");
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (value !== undefined) setInternalValue(value);
  }, [value]);

  const handleChange = React.useCallback(
    (val: string) => {
      setInternalValue(val);
      onValueChange?.(val);
      setOpen(false);
    },
    [onValueChange],
  );

  return (
    <SelectContext.Provider
      value={{ value: internalValue, onValueChange: handleChange, open, setOpen }}
    >
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
}

function SelectTrigger({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen } = React.useContext(SelectContext);

  return (
    <button
      type="button"
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-border bg-elevated px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      onClick={() => setOpen(!open)}
      {...props}
    >
      {children}
      <ChevronDown className={cn("h-4 w-4 opacity-50 shrink-0 transition-transform", open && "rotate-180")} />
    </button>
  );
}

function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = React.useContext(SelectContext);
  const [label, setLabel] = React.useState("");

  React.useEffect(() => {
    if (!value) {
      setLabel("");
      return;
    }
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-select-value="${value}"]`);
      if (el) setLabel(el.textContent || value);
      else setLabel(value);
    }, 0);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <span className={value ? "text-text-primary truncate" : "text-text-muted truncate"}>
      {value ? label || value : placeholder}
    </span>
  );
}

function SelectContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { open, setOpen } = React.useContext(SelectContext);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 mt-1 max-h-60 w-full min-w-[8rem] overflow-auto rounded-md border border-border bg-surface p-1 shadow-lg animate-fade-up",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function SelectItem({
  className,
  children,
  value: itemValue,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const { value, onValueChange } = React.useContext(SelectContext);
  const isSelected = value === itemValue;

  return (
    <div
      data-select-value={itemValue}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm text-text-primary outline-none hover:bg-elevated transition-colors",
        isSelected && "bg-elevated",
        className,
      )}
      onClick={() => onValueChange(itemValue)}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {isSelected && <Check className="h-4 w-4 text-primary" />}
      </span>
      {children}
    </div>
  );
}

export {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
};
