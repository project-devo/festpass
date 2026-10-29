import Link from "next/link";

// Shown for any URL that has no page, e.g. /nope
export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-sm font-medium text-indigo-600">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-sm text-slate-600">The page you were looking for doesn&apos;t exist.</p>
      <Link href="/" className="mt-6 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500">
        Back to events
      </Link>
    </main>
  );
}
