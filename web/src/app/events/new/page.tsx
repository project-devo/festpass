"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/components/session";
import { Alert, Button, Card, Input, PageState } from "@/components/ui";

type FieldErrors = Partial<Record<"title" | "venue" | "startsAt" | "capacity", string[]>>;

export default function NewEventPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();
  const [title, setTitle] = useState("");
  const [venue, setVenue] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [capacity, setCapacity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError(null);
    setFieldErrors({});
    setSaving(true);
    try {
      const event = await api.createEvent({
        title,
        venue,
        // datetime-local gives "2026-11-14T18:30" in local time; the API wants a full ISO time
        startsAt: new Date(startsAt).toISOString(),
        capacity: Number(capacity),
      });
      router.push(`/events/${event.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
      if (err instanceof ApiError && err.details) setFieldErrors(err.details);
      setSaving(false);
    }
  }

  if (sessionLoading) return <PageState loading />;

  if (session?.role !== "organiser") {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="font-medium text-slate-900">Only organisers can create events</p>
        <p className="mt-1 text-sm text-slate-600">
          {session ? "Your account can't create events." : "Log in with an organiser account to continue."}
        </p>
        <Link href={session ? "/" : "/login"} className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500">
          {session ? "Back to events" : "Log in"}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Create an event</h1>
      <p className="mt-1 text-sm text-slate-600">Students can book it as soon as you save it.</p>

      <Card className="mt-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="space-y-4"
        >
          {error && <Alert>{error}</Alert>}
          <Input
            label="Title"
            name="title"
            required
            minLength={3}
            maxLength={100}
            placeholder="Battle of the Bands"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            error={fieldErrors.title?.[0]}
          />
          <Input
            label="Venue"
            name="venue"
            required
            minLength={2}
            maxLength={100}
            placeholder="Main Auditorium"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            error={fieldErrors.venue?.[0]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Starts at"
              name="startsAt"
              type="datetime-local"
              required
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              error={fieldErrors.startsAt?.[0]}
            />
            <Input
              label="Capacity"
              name="capacity"
              type="number"
              required
              min={1}
              max={5000}
              placeholder="200"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              error={fieldErrors.capacity?.[0]}
            />
          </div>
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => router.push("/")}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Create event
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
