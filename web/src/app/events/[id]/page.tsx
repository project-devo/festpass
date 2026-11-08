"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api, ApiError, type FestEvent } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { DateChip, SeatsBadge, SeatsMeter } from "@/components/event-card";
import { ArrowLeftIcon, CalendarIcon, ChartIcon, PinIcon, UsersIcon } from "@/components/icons";
import { useSession } from "@/components/session";
import { Alert, Button, Card, PageState, buttonClass } from "@/components/ui";

export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();
  const [event, setEvent] = useState<FestEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookError, setBookError] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    api
      .getEvent(id)
      .then(setEvent)
      .catch((err) => setError(err instanceof Error ? err.message : "Something went wrong"));
  }, [id]);

  async function book() {
    setBookError(null);
    setBooking(true);
    try {
      await api.bookEvent(id);
      router.push("/tickets");
    } catch (err) {
      setBookError(err instanceof ApiError ? err.message : "Something went wrong");
      setBooking(false);
      if (err instanceof ApiError && err.status === 409) {
        api.getEvent(id).then(setEvent).catch(() => {});
      }
    }
  }

  const soldOut = event?.seatsLeft === 0;

  // What the bottom of the card shows depends on who is looking
  function bookingArea() {
    if (sessionLoading) return null;
    if (!session) {
      return (
        <Link href="/login" className={buttonClass("primary", "w-full sm:w-auto")}>
          Log in to book
        </Link>
      );
    }
    // The organiser who owns this event gets a link to the live attendance page
    if (session.role === "organiser" && session.sub === event?.organiserId) {
      return (
        <Link href={`/events/${id}/attendance`} className={buttonClass("primary", "w-full sm:w-auto")}>
          <ChartIcon /> View attendance
        </Link>
      );
    }
    if (session.role !== "student") {
      return <p className="text-sm text-zinc-500">Only students can book passes.</p>;
    }
    return (
      <Button onClick={() => void book()} loading={booking} disabled={soldOut} className="w-full sm:w-auto">
        {soldOut ? "Sold out" : "Book a pass"}
      </Button>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/events" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-950">
        <ArrowLeftIcon /> All events
      </Link>

      {error || !event ? (
        <PageState loading={!event} error={error} />
      ) : (
        <Card bare className="mt-4 overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex items-start gap-5">
              <DateChip iso={event.startsAt} large />
              <div className="min-w-0 pt-1">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">{event.title}</h1>
                <div className="mt-2">
                  <SeatsBadge seatsLeft={event.seatsLeft} capacity={event.capacity} />
                </div>
              </div>
            </div>

            <dl className="mt-8 grid gap-4 sm:grid-cols-3">
              <Detail icon={<CalendarIcon />} label="When" value={formatDateTime(event.startsAt)} />
              <Detail icon={<PinIcon />} label="Venue" value={event.venue} />
              <Detail icon={<UsersIcon />} label="Capacity" value={`${event.capacity} seats`} />
            </dl>

            <div className="mt-8">
              <SeatsMeter seatsLeft={event.seatsLeft} capacity={event.capacity} />
            </div>
          </div>

          <div className="space-y-3 border-t border-zinc-200 bg-zinc-50 px-6 py-5 sm:px-8">
            {bookError && <Alert>{bookError}</Alert>}
            {bookingArea()}
          </div>
        </Card>
      )}
    </main>
  );
}

function Detail({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-zinc-400">{icon}</span>
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</dt>
        <dd className="mt-0.5 text-sm font-medium text-zinc-950">{value}</dd>
      </div>
    </div>
  );
}
