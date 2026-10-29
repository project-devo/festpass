import Link from "next/link";
import type { FestEvent } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

// Green when plenty of seats, amber when few are left, grey when sold out
export function SeatsBadge({ seatsLeft, capacity }: { seatsLeft: number; capacity: number }) {
  const soldOut = seatsLeft === 0;
  const low = !soldOut && seatsLeft <= Math.max(5, capacity * 0.1);
  const style = soldOut
    ? "bg-slate-100 text-slate-600"
    : low
      ? "bg-amber-50 text-amber-700"
      : "bg-emerald-50 text-emerald-700";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>
      {soldOut ? "Sold out" : `${seatsLeft} of ${capacity} seats left`}
    </span>
  );
}

export function EventCard({ event }: { event: FestEvent }) {
  return (
    <Link
      href={`/events/${event.id}`}
      className={
        "group block h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition " +
        "hover:border-indigo-300 hover:shadow-md " +
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      }
    >
      <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">{formatDateTime(event.startsAt)}</p>
      <h2 className="mt-2 text-base font-semibold text-slate-900 group-hover:text-indigo-700">{event.title}</h2>
      <p className="mt-1 text-sm text-slate-600">{event.venue}</p>
      <div className="mt-4">
        <SeatsBadge seatsLeft={event.seatsLeft} capacity={event.capacity} />
      </div>
    </Link>
  );
}
