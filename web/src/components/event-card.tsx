import Link from "next/link";
import type { FestEvent } from "@/lib/api";
import { dayOfMonth, monthShort, weekdayTime } from "@/lib/format";
import { PinIcon } from "@/components/icons";
import { Badge } from "@/components/ui";

function seatState(seatsLeft: number, capacity: number) {
  if (seatsLeft === 0) return "soldOut" as const;
  if (seatsLeft <= Math.max(5, capacity * 0.1)) return "low" as const;
  return "open" as const;
}

// Green when plenty of seats, amber when few are left, grey when sold out
export function SeatsBadge({ seatsLeft, capacity }: { seatsLeft: number; capacity: number }) {
  const state = seatState(seatsLeft, capacity);
  if (state === "soldOut") return <Badge>Sold out</Badge>;
  return <Badge tone={state === "low" ? "amber" : "green"}>{`${seatsLeft} of ${capacity} seats left`}</Badge>;
}

// A bar that fills up as seats are booked
export function SeatsMeter({ seatsLeft, capacity }: { seatsLeft: number; capacity: number }) {
  const state = seatState(seatsLeft, capacity);
  const booked = capacity - seatsLeft;
  const percent = capacity === 0 ? 0 : Math.round((booked / capacity) * 100);
  const bar = state === "soldOut" ? "bg-zinc-400" : state === "low" ? "bg-amber-500" : "bg-indigo-600";

  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className={state === "soldOut" ? "font-medium text-zinc-500" : state === "low" ? "font-medium text-amber-700" : "text-zinc-600"}>
          {state === "soldOut" ? "Sold out" : state === "low" ? `Only ${seatsLeft} left` : `${seatsLeft} seats left`}
        </span>
        <span className="tabular-nums text-zinc-400">
          {booked}/{capacity}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

// Calendar-style date block: "14" over "NOV"
export function DateChip({ iso, large = false }: { iso: string; large?: boolean }) {
  return (
    <div
      className={`flex shrink-0 flex-col items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 ${
        large ? "size-16" : "size-12"
      }`}
    >
      <span className={`font-semibold tracking-wide text-indigo-600 ${large ? "text-xs" : "text-[10px]"}`}>{monthShort(iso)}</span>
      <span className={`font-semibold leading-none tabular-nums text-zinc-950 ${large ? "text-2xl" : "text-lg"}`}>
        {dayOfMonth(iso)}
      </span>
    </div>
  );
}

export function EventCard({ event }: { event: FestEvent }) {
  return (
    <Link
      href={`/events/${event.id}`}
      className={
        "group flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition " +
        "hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md " +
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      }
    >
      <div className="flex gap-4">
        <DateChip iso={event.startsAt} />
        <div className="min-w-0">
          <h2 className="font-semibold leading-snug text-zinc-950 group-hover:text-indigo-700">{event.title}</h2>
          <p className="mt-1 text-sm text-zinc-500">{weekdayTime(event.startsAt)}</p>
        </div>
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-sm text-zinc-600">
        <PinIcon className="size-4 shrink-0 text-zinc-400" />
        <span className="truncate">{event.venue}</span>
      </p>
      <div className="mt-auto pt-5">
        <SeatsMeter seatsLeft={event.seatsLeft} capacity={event.capacity} />
      </div>
    </Link>
  );
}

// Grey placeholder with the same shape as an EventCard, shown while events load
export function EventCardSkeleton() {
  return (
    <div className="h-full animate-pulse rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex gap-4">
        <div className="size-12 rounded-xl bg-zinc-100" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 w-3/4 rounded bg-zinc-100" />
          <div className="h-3 w-1/3 rounded bg-zinc-100" />
        </div>
      </div>
      <div className="mt-5 h-3 w-1/2 rounded bg-zinc-100" />
      <div className="mt-6 h-1.5 rounded-full bg-zinc-100" />
    </div>
  );
}
