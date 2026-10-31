"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError, type Booking } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useSession } from "@/components/session";
import { TicketQr } from "@/components/ticket-qr";
import { Card, PageState } from "@/components/ui";

function StatusBadge({ status }: { status: Booking["status"] }) {
  const style = status === "confirmed" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>
      {status === "confirmed" ? "Confirmed" : "Cancelled"}
    </span>
  );
}

export default function TicketsPage() {
  const { session, loading: sessionLoading } = useSession();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<{ id: string; message: string } | null>(null);

  useEffect(() => {
    if (!session) return;
    api
      .getMyBookings()
      .then(setBookings)
      .catch((err) => setError(err instanceof Error ? err.message : "Something went wrong"));
  }, [session]);

  async function cancel(booking: Booking) {
    if (!window.confirm(`Cancel your pass for ${booking.event.title}? Your seat goes back to other students.`)) return;

    setCancellingId(booking.id);
    setCancelError(null);
    try {
      await api.cancelBooking(booking.id);
      // Mark it cancelled on screen too, so the QR disappears without a reload
      setBookings((list) => list?.map((b) => (b.id === booking.id ? { ...b, status: "cancelled" } : b)) ?? null);
    } catch (err) {
      setCancelError({
        id: booking.id,
        message: err instanceof ApiError ? err.message : "Something went wrong",
      });
    } finally {
      setCancellingId(null);
    }
  }

  if (sessionLoading) return <PageState loading />;

  if (!session) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="font-medium text-slate-900">Log in to see your tickets</p>
        <Link href="/login" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500">
          Log in
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">My tickets</h1>
      <p className="mt-1 text-sm text-slate-600">Show the QR code at the gate to check in.</p>

      <div className="mt-6">
        {error || !bookings ? (
          <PageState loading={!bookings} error={error} />
        ) : bookings.length === 0 ? (
          <Card className="text-center">
            <p className="font-medium text-slate-900">No tickets yet</p>
            <p className="mt-1 text-sm text-slate-600">Book a pass and it will show up here.</p>
            <Link href="/" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500">
              Browse events
            </Link>
          </Card>
        ) : (
          <ul className="space-y-4">
            {bookings.map((booking) => {
              const confirmed = booking.status === "confirmed";
              return (
                <li key={booking.id}>
                  <Card className={confirmed ? "" : "opacity-60"}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
                          {formatDateTime(booking.event.startsAt)}
                        </p>
                        <h2 className="mt-1 text-base font-semibold text-slate-900">{booking.event.title}</h2>
                        <p className="mt-0.5 text-sm text-slate-600">{booking.event.venue}</p>
                      </div>
                      <StatusBadge status={booking.status} />
                    </div>

                    {confirmed && (
                      <div className="mt-4 flex justify-center border-t border-slate-100 pt-4">
                        <TicketQr token={booking.qrToken} />
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                      <p className="font-mono text-xs text-slate-500">
                        Ticket #{booking.id.slice(0, 8).toUpperCase()}
                      </p>
                      {confirmed && (
                        <button
                          type="button"
                          onClick={() => cancel(booking)}
                          disabled={cancellingId === booking.id}
                          className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {cancellingId === booking.id ? "Cancelling..." : "Cancel booking"}
                        </button>
                      )}
                    </div>

                    {cancelError?.id === booking.id && (
                      <p className="mt-2 text-sm text-red-600">{cancelError.message}</p>
                    )}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
