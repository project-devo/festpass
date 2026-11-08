"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type FestEvent } from "@/lib/api";
import { EventCard, EventCardSkeleton } from "@/components/event-card";
import { CalendarIcon, PlusIcon } from "@/components/icons";
import { useSession } from "@/components/session";
import { Notice, PageHeader, PageState, buttonClass } from "@/components/ui";

export default function EventsPage() {
  const { session } = useSession();
  const [events, setEvents] = useState<FestEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getEvents()
      .then(setEvents)
      .catch((err) => setError(err instanceof Error ? err.message : "Something went wrong"));
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader
        title="Events"
        subtitle={events ? `Resonance 2026 · ${events.length} events` : "Pick an event to see the details and book a pass."}
        action={
          session?.role === "organiser" && (
            <Link href="/events/new" className={buttonClass("primary")}>
              <PlusIcon /> Create event
            </Link>
          )
        }
      />

      {error ? (
        <PageState error={error} />
      ) : events?.length === 0 ? (
        <Notice icon={<CalendarIcon className="size-5" />} title="No events yet" text="Check back soon." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events
            ? events.map((event) => (
                <li key={event.id}>
                  <EventCard event={event} />
                </li>
              ))
            : [0, 1, 2, 3, 4, 5].map((i) => (
                <li key={i}>
                  <EventCardSkeleton />
                </li>
              ))}
        </ul>
      )}
    </main>
  );
}
