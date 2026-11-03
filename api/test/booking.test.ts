import { describe, expect, it } from "vitest";
import { count, eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { bookings } from "../src/db/schema";
import { queueTicketEmail } from "../src/queue";
import { app, book, makeEvent, makeUser, seatsLeft } from "./helpers";

describe("booking", () => {
  it("succeeds and seats drop by one", async () => {
    const organiser = await makeUser("organiser");
    const student = await makeUser("student");
    const event = await makeEvent(organiser.id, 10);

    const res = await book(student, event.id);

    expect(res.statusCode).toBe(201);
    expect(res.json().seatsLeft).toBe(8);
    expect(await seatsLeft(event.id)).toBe(9);
    expect(queueTicketEmail).toHaveBeenCalledWith(res.json().id); // ticket email was queued
  });

  it("a full event returns 409", async () => {
    const organiser = await makeUser("organiser");
    const first = await makeUser("student");
    const second = await makeUser("student");
    const event = await makeEvent(organiser.id, 1);

    expect((await book(first, event.id)).statusCode).toBe(201);
    const res = await book(second, event.id);

    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe("Sold out");
    expect(await seatsLeft(event.id)).toBe(0);
  });

  it("booking the same event twice returns 409 and the seat count is unchanged", async () => {
    const organiser = await makeUser("organiser");
    const student = await makeUser("student");
    const event = await makeEvent(organiser.id, 10);

    expect((await book(student, event.id)).statusCode).toBe(201);
    const res = await book(student, event.id);

    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe("Already booked");
    expect(await seatsLeft(event.id)).toBe(9); // the second try's seat was given back by the rollback
  });

  it("20 parallel bookings on a 5-seat event give exactly 5 successes", async () => {
    const organiser = await makeUser("organiser");
    const event = await makeEvent(organiser.id, 5);
    const students = await Promise.all(Array.from({ length: 20 }, (_, i) => makeUser("student", `Student ${i}`)));

    // All 20 requests start at once and race for the 5 seats
    const results = await Promise.all(students.map((s) => book(s, event.id)));
    const codes = results.map((r) => r.statusCode);

    expect(codes.filter((c) => c === 201)).toHaveLength(5);
    expect(codes.filter((c) => c === 409)).toHaveLength(15);
    expect(await seatsLeft(event.id)).toBe(0);
    const [rows] = await db.select({ n: count() }).from(bookings).where(eq(bookings.eventId, event.id));
    expect(rows.n).toBe(5); // no oversell
  });

  it("cancelling gives the seat back", async () => {
    const organiser = await makeUser("organiser");
    const student = await makeUser("student");
    const event = await makeEvent(organiser.id, 10);
    const booking = (await book(student, event.id)).json();

    const res = await app.inject({
      method: "POST",
      url: `/me/bookings/${booking.id}/cancel`,
      headers: { cookie: student.cookie },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ status: "cancelled", seatsLeft: 10 });
    expect(await seatsLeft(event.id)).toBe(10);
  });

  it("the 6th booking in a minute returns 429", async () => {
    const organiser = await makeUser("organiser");
    const student = await makeUser("student");
    const event = await makeEvent(organiser.id, 10);

    // Tries 1 to 5 pass the limiter (1 books, 2 to 5 get "Already booked")
    for (let i = 0; i < 5; i++) {
      expect((await book(student, event.id)).statusCode).not.toBe(429);
    }
    const res = await book(student, event.id);

    expect(res.statusCode).toBe(429);
    expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
  });
});
