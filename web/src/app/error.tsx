"use client";

import { Button } from "@/components/ui";

// Last safety net: if a page crashes while rendering, show this instead of a blank screen
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  console.error(error);
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-600">An unexpected error happened on this page.</p>
      <Button onClick={reset} className="mt-6">
        Try again
      </Button>
    </main>
  );
}
