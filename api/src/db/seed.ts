import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db, pool } from "./client";
import { bookings, checkins, events, users } from "./schema";

import { signTicket } from "../tickets";

// A date `days` from now at the given hour (UTC), so events are always in the future
function daysFromNow(days: number, hour: number): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour, 0, 0, 0);
  return date;
}

async function main() {
  const [organiserHash, volunteerHash, studentHash] = await Promise.all([
    bcrypt.hash("organiser123", 10),
    bcrypt.hash("volunteer123", 10),
    bcrypt.hash("student123", 10),
  ]);

  await db.transaction(async (tx) => {
    // 1. Empty the tables, children first, so the seed can be run again
    await tx.delete(checkins);
    await tx.delete(bookings);
    await tx.delete(events);
    await tx.delete(users);

    // 2. Users
    const [organiser] = await tx
      .insert(users)
      .values({ name: "Demo Organiser", email: "organiser@festpass.test", passwordHash: organiserHash, role: "organiser" })
      .returning();

    const volunteers = await tx
      .insert(users)
      .values([1, 2].map((n) => ({
        name: `Volunteer ${n}`,
        email: `volunteer${n}@festpass.test`,
        passwordHash: volunteerHash,
        role: "volunteer" as const,
      })))
      .returning();

    const students = await tx
      .insert(users)
      .values(Array.from({ length: 20 }, (_, i) => ({
        name: `Student ${i + 1}`,
        email: `student${i + 1}@festpass.test`,
        passwordHash: studentHash,
        role: "student" as const,
      })))
      .returning();

    // 3. Events (seats_left starts full and is corrected in step 5)
    const fest = [
      { title: "Battle of the Bands", venue: "Open Air Theatre", startsAt: daysFromNow(7, 13), capacity: 100 },
      { title: "24-Hour Hackathon", venue: "Main Auditorium", startsAt: daysFromNow(7, 4), capacity: 60 },
      { title: "Stand-up Comedy Night", venue: "Seminar Hall", startsAt: daysFromNow(8, 14), capacity: 40 },
      { title: "Robo Wars", venue: "Sports Complex", startsAt: daysFromNow(8, 6), capacity: 30 },
      { title: "Silent DJ Night", venue: "Central Lawn", startsAt: daysFromNow(9, 15), capacity: 5 },
    ];
    const createdEvents = await tx
      .insert(events)
      .values(fest.map((e) => ({ ...e, seatsLeft: e.capacity, organiserId: organiser.id })))
      .returning();

    // 4. Bookings: students 1-10 book event 1, students 1-5 fill the 5-seat DJ night,
    //    and student 20 has one cancelled booking
    const plan = [
      ...students.slice(0, 10).map((s) => ({ userId: s.id, eventId: createdEvents[0].id, status: "confirmed" as const })),
      ...students.slice(0, 5).map((s) => ({ userId: s.id, eventId: createdEvents[4].id, status: "confirmed" as const })),
      { userId: students[19].id, eventId: createdEvents[2].id, status: "cancelled" as const },
    ];
    const createdBookings = await tx
      .insert(bookings)
      .values(plan.map((b) => {
        const id = randomUUID();
        return { ...b, id, qrToken: signTicket(id) };
      }))
      .returning();

    // 5. seats_left = capacity minus confirmed bookings, worked out by Postgres
    await tx.execute(sql`
      UPDATE events SET seats_left = capacity - (
        SELECT count(*) FROM bookings
        WHERE bookings.event_id = events.id AND bookings.status = 'confirmed'
      )
    `);

    // 6. Check-ins: the first 3 bookings for Battle of the Bands, scanned by Volunteer 1
    await tx.insert(checkins).values(
      createdBookings.slice(0, 3).map((b) => ({ bookingId: b.id, scannedBy: volunteers[0].id })),
    );

    console.log(
      `Seeded ${1 + volunteers.length + students.length} users, ${createdEvents.length} events, ` +
        `${createdBookings.length} bookings, 3 check-ins`,
    );
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());






  