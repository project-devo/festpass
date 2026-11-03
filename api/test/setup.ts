import { afterAll, beforeEach, vi } from "vitest";
import { sql } from "drizzle-orm";
import { db, pool } from "../src/db/client";
import { resetRateLimits } from "./fake-ratelimit";

// Every test wipes all tables. Refuse to run unless the env says this is a test database.
if (process.env.ALLOW_DB_RESET !== "yes") {
  throw new Error("Tests wipe the database. Put ALLOW_DB_RESET=yes in api/.env.test (test database only).");
}

// No pg-boss and no emails: the booking route calls this empty mock instead
vi.mock("../src/queue", () => ({ queueTicketEmail: vi.fn(async () => {}) }));

// No Upstash: ratelimit.ts gets the in-memory fake
vi.mock("@upstash/redis", () => ({ Redis: { fromEnv: () => ({}) } }));
vi.mock("@upstash/ratelimit", () => import("./fake-ratelimit"));

// Each test starts with empty tables and empty rate-limit counters
beforeEach(async () => {
  await db.execute(sql`TRUNCATE checkins, bookings, events, users CASCADE`);
  resetRateLimits();
});

afterAll(async () => {
  await pool.end();
});