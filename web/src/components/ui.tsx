import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variantStyles: Record<Variant, string> = {
  primary: "bg-zinc-900 text-white shadow-sm hover:bg-zinc-700",
  secondary: "border border-zinc-200 bg-white text-zinc-900 shadow-sm hover:border-zinc-300 hover:bg-zinc-50",
  ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
};

// Shared by Button and by Links that should look like buttons
export function buttonClass(variant: Variant = "primary", className = "") {
  return (
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 " +
    `disabled:cursor-not-allowed disabled:opacity-50 ${variantStyles[variant]} ${className}`
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
};

export function Button({ variant = "primary", loading = false, disabled, className = "", children, ...props }: ButtonProps) {
  return (
    <button disabled={disabled || loading} className={buttonClass(variant, className)} {...props}>
      {loading && <Spinner className="size-4 border-current/30 border-t-current" />}
      {loading ? "Please wait..." : children}
    </button>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string };

export function Input({ label, error, id, className = "", ...props }: InputProps) {
  const inputId = id ?? props.name;
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-zinc-800">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={
          "block w-full rounded-lg border bg-white px-3 py-2.5 text-sm shadow-xs outline-none transition " +
          "placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 " +
          `${error ? "border-red-400" : "border-zinc-200 hover:border-zinc-300"} ${className}`
        }
        {...props}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

// bare = no inner padding, for cards that lay out their own sections
export function Card({ className = "", bare = false, children }: { className?: string; bare?: boolean; children: ReactNode }) {
  return (
    <div
      className={`rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)] ${bare ? "" : "p-6"} ${className}`}
    >
      {children}
    </div>
  );
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
      {children}
    </div>
  );
}

// Small rounded label, e.g. "Sold out" or "Confirmed"
export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "green" | "amber" | "indigo"; children: ReactNode }) {
  const tones = {
    neutral: "bg-zinc-100 text-zinc-600 ring-zinc-500/10",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
    amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-600/15",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Spinner({ className = "size-6 border-zinc-200 border-t-indigo-600" }: { className?: string }) {
  return <span className={`inline-block shrink-0 animate-spin rounded-full border-2 ${className}`} />;
}

// Page title + one line under it, with an optional button on the right
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// Centered message for "log in first", "only organisers", empty lists and so on
export function Notice({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      {icon && (
        <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 shadow-xs">
          {icon}
        </div>
      )}
      <p className="font-semibold text-zinc-950">{title}</p>
      {text && <p className="mt-1 text-sm text-zinc-500">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// Spinner while loading, friendly message on error, nothing otherwise
export function PageState({ loading, error }: { loading?: boolean; error?: string | null }) {
  if (error) {
    return (
      <div role="alert">
        <Notice title="Something went wrong" text={error} />
      </div>
    );
  }
  if (loading) {
    return (
      <div className="flex justify-center py-16" aria-live="polite">
        <Spinner />
        <span className="sr-only">Loading</span>
      </div>
    );
  }
  return null;
}
