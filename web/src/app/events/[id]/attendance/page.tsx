"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type Attendance } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useSession } from "@/components/session";
import { Card, PageState } from "@/components/ui";

const REFRESH_MS = 5000;

// e.g. "7:42:10 pm", shown next to each check-in and for "Updated at"
const timeOnly = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit" });

export default function AttendancePage() {
  const { id } = useParams<{ id: string }>();
  const { session, loading: sessionLoading } = useSession();
  const [data, setData] = useState<Attendance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const isOrganiser = session?.role === "organiser";

  const load = useCallback(async () => {
    try {
      const fresh = await api.getAttendance(id);
      setData(fresh);
      setError(null);
      setStale(false);
      setUpdatedAt(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      // A 403/404 won't fix itself, so show it as a page error.
      // A network blip keeps the last numbers on screen and just marks them as old.
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        setError(message);
      } else {
        setStale(true);
      }
    }
  }, [id]);

  // Load once, then every 5 seconds. Skip while the tab is hidden to save requests.
  useEffect(() => {
    if (!isOrganiser) return;
    void load();
    const timer = setInterval(() => {
      if (!document.hidden) void load();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [isOrganiser, load]);

  if (sessionLoading) return <PageState loading />;
  if (!isOrganiser) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="font-medium text-slate-900">Only organisers can see attendance</p>
        <p className="mt-1 text-sm text-slate-600">Log in with the organiser account to view this page.</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <PageState loading={!data} error={error} />
      </main>
    );
  }

  const { event, booked, checkedIn, attendees } = data;
  const percent = booked === 0 ? 0 : Math.round((checkedIn / booked) * 100);

  // Most recent check-ins first, then people not here yet in name order
  const sorted = [...attendees].sort((a, b) => {
    if (a.checkedInAt && b.checkedInAt) return b.checkedInAt.localeCompare(a.checkedInAt);
    if (a.checkedInAt) return -1;
    if (b.checkedInAt) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href={`/events/${event.id}`} className="text-sm text-slate-600 hover:text-slate-900">
        &larr; Back to event
      </Link>

      <Card className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">{formatDateTime(event.startsAt)}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{event.title}</h1>
        <p className="mt-1 text-sm text-slate-600">{event.venue}</p>

        <div className="mt-6">
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-semibold tabular-nums text-slate-900">
              {checkedIn}
              <span className="text-lg font-normal text-slate-500"> / {booked} checked in</span>
            </p>
            <p className="text-sm font-medium tabular-nums text-slate-600">{percent}%</p>
          </div>

          <div
            className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={booked}
            aria-valuenow={checkedIn}
            aria-label="Checked in out of booked"
          >
            <div className="h-full rounded-full bg-indigo-600 transition-all duration-500" style={{ width: `${percent}%` }} />
          </div>

          <p className="mt-2 text-xs text-slate-500" aria-live="polite">
            {stale
              ? "Can't reach the server, showing the last numbers. Retrying..."
              : `Updates every 5 seconds${updatedAt ? `, last at ${timeOnly.format(updatedAt)}` : ""}`}
          </p>
        </div>
      </Card>

      <section className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-6 py-4 text-sm font-semibold text-slate-900">
          Attendees ({booked})
        </h2>
        {sorted.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-slate-600">No bookings for this event yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {sorted.map((a) => (
              <li key={a.bookingId} className="flex items-center justify-between gap-4 px-6 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{a.name}</p>
                  <p className="truncate text-xs text-slate-500">{a.email}</p>
                </div>
                {a.checkedInAt ? (
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    In at {timeOnly.format(new Date(a.checkedInAt))}
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                    Not yet
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
