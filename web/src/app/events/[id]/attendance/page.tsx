"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type Attendance } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useSession } from "@/components/session";
import { ArrowLeftIcon, ChartIcon } from "@/components/icons";
import { Card, Notice, PageState } from "@/components/ui";

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
    // load() only sets state after its await, so this is not the synchronous setState the rule fears
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const timer = setInterval(() => {
      if (!document.hidden) void load();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [isOrganiser, load]);

  if (sessionLoading) return <PageState loading />;
  if (!isOrganiser) {
    return (
      <Notice
        icon={<ChartIcon className="size-5" />}
        title="Only organisers can see attendance"
        text="Log in with the organiser account to view this page."
      />
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
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

  const notYet = booked - checkedIn;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href={`/events/${event.id}`} className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-950">
        <ArrowLeftIcon /> Back to event
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">{formatDateTime(event.startsAt)}</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">{event.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">{event.venue}</p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
            stale ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          <span className={`size-1.5 rounded-full ${stale ? "bg-amber-500" : "animate-pulse bg-emerald-500"}`} />
          {stale ? "Reconnecting" : "Live"}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Booked" value={booked} />
        <Stat label="Checked in" value={checkedIn} accent />
        <Stat label="Not yet" value={notYet} />
      </div>

      <Card className="mt-3">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium text-zinc-950">Check-in progress</p>
          <p className="text-sm font-semibold tabular-nums text-zinc-950">{percent}%</p>
        </div>
        <div
          className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-zinc-100"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={booked}
          aria-valuenow={checkedIn}
          aria-label="Checked in out of booked"
        >
          <div className="h-full rounded-full bg-indigo-600 transition-all duration-500" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-3 text-xs text-zinc-500" aria-live="polite">
          {stale
            ? "Can't reach the server, showing the last numbers. Retrying..."
            : `Updates every 5 seconds${updatedAt ? `, last at ${timeOnly.format(updatedAt)}` : ""}`}
        </p>
      </Card>

      <section className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
        <h2 className="border-b border-zinc-200 px-6 py-4 text-sm font-semibold text-zinc-950">Attendees ({booked})</h2>
        {sorted.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-zinc-500">No bookings for this event yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {sorted.map((a) => (
              <li key={a.bookingId} className="flex items-center gap-3 px-6 py-3">
                <span
                  aria-hidden
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    a.checkedInAt ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  {initials(a.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-950">{a.name}</p>
                  <p className="truncate text-xs text-zinc-500">{a.email}</p>
                </div>
                {a.checkedInAt ? (
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    In at {timeOnly.format(new Date(a.checkedInAt))}
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500">Not yet</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-5">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums sm:text-3xl ${accent ? "text-indigo-600" : "text-zinc-950"}`}>{value}</p>
    </div>
  );
}

// "Aditi Sharma" -> "AS"
function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}
