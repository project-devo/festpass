"use client";

import { Button, Notice } from "@/components/ui";

// Last safety net: if a page crashes while rendering, show this instead of a blank screen
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  console.error(error);
  return (
    <main>
      <Notice
        title="Something went wrong"
        text="An unexpected error happened on this page."
        action={<Button onClick={reset}>Try again</Button>}
      />
    </main>
  );
}
