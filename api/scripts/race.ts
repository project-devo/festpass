/// <reference types="node" />
// Fires 20 bookings at a brand-new 1-seat event at the same moment. Exactly 1 must succeed.
const API = process.env.API_URL ?? "http://localhost:4000";
const STUDENTS = 20;

// Logs in and returns the "token=..." cookie to send on later requests
async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status}`);
  const cookie = res.headers.getSetCookie().find((c) => c.startsWith("token="));
  if (!cookie) throw new Error(`No token cookie for ${email}`);
  return cookie.split(";")[0];
}

async function main() {
  console.log(`API: ${API}`);

  const organiser = await login("organiser@festpass.test", "organiser123");
  const created = await fetch(`${API}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: organiser },
    body: JSON.stringify({
      title: `Race test ${new Date().toISOString().slice(11, 19)}`,
      venue: "Test Hall",
      startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      capacity: 1,
    }),
  });
  if (created.status !== 201) throw new Error(`Create event failed: ${created.status} ${await created.text()}`);
  const event = (await created.json()) as { id: string };
  console.log(`Created 1-seat event ${event.id}`);

  // Log everyone in first, so only the bookings race
  const cookies = await Promise.all(
    Array.from({ length: STUDENTS }, (_, i) => login(`student${i + 1}@festpass.test`, "student123")),
  );

  // All 20 bookings start together
  const results = await Promise.all(
    cookies.map(async (cookie) => {
      const res = await fetch(`${API}/events/${event.id}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: "{}",
      });
      const body = (await res.json()) as { error?: string };
      return res.status === 201 ? "201 Booked" : `${res.status} ${body.error}`;
    }),
  );

  const counts: Record<string, number> = {};
  for (const r of results) counts[r] = (counts[r] ?? 0) + 1;
  console.table(counts);

  const after = (await (await fetch(`${API}/events/${event.id}`)).json()) as { seatsLeft: number };
  console.log(`seats_left now: ${after.seatsLeft}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});