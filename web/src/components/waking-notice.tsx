"use client";

import { useSyncExternalStore } from "react";
import { isServerSlow, subscribe } from "@/lib/server-status";

// Goal 15: shown while any API request has taken more than 3 seconds (Render free tier waking up)
export function WakingNotice() {
  // The third argument is the value used on the server render: never slow there
  const slow = useSyncExternalStore(subscribe, isServerSlow, () => false);
  if (!slow) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-lg"
    >
      <p className="flex items-center gap-2 text-sm font-medium text-amber-900">
        <span className="size-3 shrink-0 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
        Waking up the server...
      </p>
      <p className="mt-1 text-xs text-amber-800">
        The free hosting tier sleeps when nobody uses it. The first request can take up to a minute.
      </p>
    </div>
  );
}
