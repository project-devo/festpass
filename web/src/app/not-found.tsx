import Link from "next/link";
import { buttonClass } from "@/components/ui";

// Shown for any URL that has no page, e.g. /nope
export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="font-mono text-sm font-medium text-indigo-600">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm text-zinc-500">The page you were looking for doesn&apos;t exist.</p>
      <Link href="/events" className={buttonClass("primary", "mt-8")}>
        Back to events
      </Link>
    </main>
  );
}
