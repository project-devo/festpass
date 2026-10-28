"use client";

import { useEffect, useState } from "react";
import { api, type FestEvent } from "@/lib/api";

export default function Home() {
  const [events, setEvents] = useState<FestEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getEvents()
      .then(setEvents)
      .catch((err) => setError(err instanceof Error ? err.message : "Something went wrong"));
  }, []);

  if (error) return <p className="p-8 text-red-600">{error}</p>;
  if (!events) return <p className="p-8">Loading...</p>;

  return (
    <main className="p-8">
      <h1 className="text-xl font-semibold">{events.length} events from the API</h1>
      <ul className="mt-4 list-disc pl-6">
        {events.map((e) => (
          <li key={e.id}>{e.title}</li>
        ))}
      </ul>
    </main>
  );
}