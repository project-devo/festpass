"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/components/session";
import { CalendarIcon } from "@/components/icons";
import { Alert, Button, Card, Input, Notice, PageHeader, PageState, buttonClass } from "@/components/ui";

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
      <Notice
        icon={<CalendarIcon className="size-5" />}
        title="Only organisers can create events"
        text={session ? "Your account can't create events." : "Log in with an organiser account to continue."}
        action={
          <Link href={session ? "/events" : "/login"} className={buttonClass("primary")}>
            {session ? "Back to events" : "Log in"}
          </Link>
        }
      />
    );
  }

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-10">
      <PageHeader title="Create an event" subtitle="Students can book it as soon as you save it." />

      <Card>
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
            <Button type="button" variant="secondary" onClick={() => router.push("/events")}>
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
