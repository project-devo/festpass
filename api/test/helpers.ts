import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { buildApp } from "../src/app";
import type { Role } from "../src/auth/guards";
import { db } from "../src/db/client";
import { events, users } from "../src/db/schema";

// One app per test file. inject() calls the routes in memory: no port, no network.
export const app = buildApp({ logger: false });

export type TestUser = { id: string; cookie: string };

// Insert a user straight into the database and sign their login cookie.
// (Real login with a password is tested once in routes.test.ts.)
export async function makeUser(role: Role, name = `Test ${role}`): Promise<TestUser> {
  await app.ready();
  const [user] = await db
    .insert(users)
    .values({ name, email: `${randomUUID()}@test.festpass`, passwordHash: "not-used", role })
    .returning({ id: users.id });
  const token = app.jwt.sign({ sub: user.id, role });
  return { id: user.id, cookie: `token=${token}` };
}

export async function makeEvent(organiserId: string, seats: number) {
  const [event] = await db
    .insert(events)
    .values({
      title: "Test Event",
      venue: "Main Hall",
      startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      capacity: seats,
      seatsLeft: seats,
      organiserId,
    })
    .returning();
  return event;
}

export function book(user: TestUser, eventId: string) {
  return app.inject({ method: "POST", url: `/events/${eventId}/book`, headers: { cookie: user.cookie } });
}

export async function seatsLeft(eventId: string) {
  const [row] = await db.select({ seatsLeft: events.seatsLeft }).from(events).where(eq(events.id, eventId));
  return row.seatsLeft;
}
