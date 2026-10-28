import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
  loading?: boolean;
};

export function Button({ variant = "primary", loading = false, disabled, className = "", children, ...props }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition " +
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 " +
    "disabled:cursor-not-allowed disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-indigo-600 text-white hover:bg-indigo-500"
      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50";

  return (
    <button disabled={disabled || loading} className={`${base} ${styles} ${className}`} {...props}>
      {loading ? "Please wait..." : children}
    </button>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string };

export function Input({ label, error, id, className = "", ...props }: InputProps) {
  const inputId = id ?? props.name;
  return (
    <div className="space-y-1.5">
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={
          "block w-full rounded-lg border bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition " +
          "placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 " +
          `${error ? "border-red-400" : "border-slate-300"} ${className}`
        }
        {...props}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>{children}</div>;
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
      {children}
    </div>
  );
}

// Spinner while loading, friendly message on error, nothing otherwise
export function PageState({ loading, error }: { loading?: boolean; error?: string | null }) {
  if (error) {
    return (
      <div role="alert" className="mx-auto max-w-md py-16 text-center">
        <p className="font-medium text-slate-900">Something went wrong</p>
        <p className="mt-1 text-sm text-slate-600">{error}</p>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="flex justify-center py-16" aria-live="polite">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }
  return null;
}
