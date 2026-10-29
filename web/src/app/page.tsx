"use client";

import { useEffect, useState } from "react";
import { api, type FestEvent } from "@/lib/api";
import { EventCard } from "@/components/event-card";
import { Card, PageState } from "@/components/ui";

export default function EventsPage() {
  const [events, setEvents] = useState<FestEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getEvents()
      .then(setEvents)
      .catch((err) => setError(err instanceof Error ? err.message : "Something went wrong"));
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
        <p className="mt-1 text-sm text-slate-600">Pick an event to see the details and book a pass.</p>
      </div>

      {error || !events ? (
        <PageState loading={!events} error={error} />
      ) : events.length === 0 ? (
        <Card className="text-center text-sm text-slate-600">No events yet. Check back soon.</Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <li key={event.id}>
              <EventCard event={event} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
