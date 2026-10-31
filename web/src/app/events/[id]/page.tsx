"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, type FestEvent } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { SeatsBadge } from "@/components/event-card";
import { useSession } from "@/components/session";
import { Alert, Button, Card, PageState } from "@/components/ui";

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
        <Link
          href="/login"
          className="inline-flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 sm:w-auto"
        >
          Log in to book
        </Link>
      );
    }
    if (session.role !== "student") {
      return <p className="text-sm text-slate-600">Only students can book passes.</p>;
    }
    return (
      <Button onClick={() => void book()} loading={booking} disabled={soldOut} className="w-full sm:w-auto">
        {soldOut ? "Sold out" : "Book a pass"}
      </Button>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">
        &larr; All events
      </Link>

      {error || !event ? (
        <PageState loading={!event} error={error} />
      ) : (
        <Card className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
            {formatDateTime(event.startsAt)}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{event.title}</h1>

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Venue</dt>
              <dd className="mt-0.5 font-medium">{event.venue}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Capacity</dt>
              <dd className="mt-0.5 font-medium">{event.capacity} seats</dd>
            </div>
          </dl>

          <div className="mt-4">
            <SeatsBadge seatsLeft={event.seatsLeft} capacity={event.capacity} />
          </div>

          <div className="mt-6 space-y-3 border-t border-slate-100 pt-6">
            {bookError && <Alert>{bookError}</Alert>}
            {bookingArea()}
          </div>
        </Card>
      )}
    </main>
  );
}
