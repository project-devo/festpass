"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError, type Booking } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { PinIcon, TicketIcon } from "@/components/icons";
import { Perforation } from "@/components/perforation";
import { useSession } from "@/components/session";
import { TicketQr } from "@/components/ticket-qr";
import { Badge, Notice, PageHeader, PageState, buttonClass } from "@/components/ui";

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
      <Notice
        icon={<TicketIcon className="size-5" />}
        title="Log in to see your tickets"
        action={
          <Link href="/login" className={buttonClass("primary")}>
            Log in
          </Link>
        }
      />
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <PageHeader title="My tickets" subtitle="Show the QR code at the gate to check in." />

      {error || !bookings ? (
        <PageState loading={!bookings} error={error} />
      ) : bookings.length === 0 ? (
        <Notice
          icon={<TicketIcon className="size-5" />}
          title="No tickets yet"
          text="Book a pass and it will show up here."
          action={
            <Link href="/events" className={buttonClass("primary")}>
              Browse events
            </Link>
          }
        />
      ) : (
        <ul className="space-y-6">
          {bookings.map((booking) => {
            const confirmed = booking.status === "confirmed";
            return (
              <li
                key={booking.id}
                className={`rounded-3xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)] ${confirmed ? "" : "opacity-60"}`}
              >
                <div className="flex items-start justify-between gap-3 p-6">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                      {formatDateTime(booking.event.startsAt)}
                    </p>
                    <h2 className="mt-1.5 text-lg font-semibold text-zinc-950">{booking.event.title}</h2>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
                      <PinIcon className="size-4 shrink-0 text-zinc-400" /> {booking.event.venue}
                    </p>
                  </div>
                  <Badge tone={confirmed ? "green" : "neutral"}>{confirmed ? "Confirmed" : "Cancelled"}</Badge>
                </div>

                <Perforation notchClass="bg-zinc-50" />

                {confirmed && (
                  <div className="flex justify-center px-6 pt-6">
                    <TicketQr token={booking.qrToken} />
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                  <p className="font-mono text-xs text-zinc-400">#{booking.id.slice(0, 8).toUpperCase()}</p>
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

                {cancelError?.id === booking.id && <p className="px-6 pb-4 text-sm text-red-600">{cancelError.message}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
