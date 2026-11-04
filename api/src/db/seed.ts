import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db, pool } from "./client";
import { bookings, checkins, events, users } from "./schema";

import { signTicket } from "../tickets";

// Goal 15: a clean fake fest for the live demo ("Resonance 2026").
// Demo logins (shown on the login page): organiser@festpass.test / organiser123,
// volunteer1@festpass.test / volunteer123, student1@festpass.test / student123.

// A date `days` from now at the given India time (IST = UTC + 5:30), so events are always in the future
function daysFromNowIST(days: number, hour: number, minute = 0): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour, minute, 0, 0);
  date.setUTCMinutes(date.getUTCMinutes() - 330); // IST -> UTC
  return date;
}

const STUDENT_NAMES = [
  "Aditi Sharma", "Rohan Verma", "Sneha Reddy", "Arjun Nair", "Priya Malhotra",
  "Karan Gupta", "Ishita Bose", "Vikram Rao", "Meera Pillai", "Aman Khan",
  "Tanvi Joshi", "Siddharth Jain", "Neha Agarwal", "Rahul Menon", "Pooja Desai",
  "Yash Chauhan", "Divya Krishnan", "Nikhil Bansal", "Shreya Ghosh", "Aryan Saxena",
];

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

    // 2. Users: same demo emails as before (CI and k6 log in as organiser@festpass.test), real-looking names
    const [organiser] = await tx
      .insert(users)
      .values({ name: "Riya Kapoor", email: "organiser@festpass.test", passwordHash: organiserHash, role: "organiser" })
      .returning();

    const volunteers = await tx
      .insert(users)
      .values(["Kabir Singh", "Ananya Iyer"].map((name, i) => ({
        name,
        email: `volunteer${i + 1}@festpass.test`,
        passwordHash: volunteerHash,
        role: "volunteer" as const,
      })))
      .returning();

    const students = await tx
      .insert(users)
      .values(STUDENT_NAMES.map((name, i) => ({
        name,
        email: `student${i + 1}@festpass.test`,
        passwordHash: studentHash,
        role: "student" as const,
      })))
      .returning();

    // 3. Events (seats_left starts full and is corrected in step 5)
    const fest = [
      { title: "Battle of the Bands", venue: "Open Air Theatre", startsAt: daysFromNowIST(7, 18), capacity: 100 },
      { title: "24-Hour Hackathon", venue: "Main Auditorium, Block A", startsAt: daysFromNowIST(7, 10), capacity: 60 },
      { title: "Robo Wars", venue: "Sports Complex Arena", startsAt: daysFromNowIST(8, 11), capacity: 30 },
      { title: "Stand-up Comedy Night", venue: "Seminar Hall 2", startsAt: daysFromNowIST(8, 19, 30), capacity: 40 },
      { title: "Campus Treasure Hunt", venue: "Library Lawns", startsAt: daysFromNowIST(9, 15), capacity: 50 },
      { title: "Silent DJ Night", venue: "Central Lawn", startsAt: daysFromNowIST(9, 21), capacity: 5 },
      { title: "Nukkad Natak (Street Play)", venue: "Amphitheatre", startsAt: daysFromNowIST(10, 17), capacity: 80 },
    ];
    const createdEvents = await tx
      .insert(events)
      .values(fest.map((e) => ({ ...e, seatsLeft: e.capacity, organiserId: organiser.id })))
      .returning();
    const byTitle = (title: string) => createdEvents.find((e) => e.title === title)!;

    // 4. Bookings
    //    - students 1-12 hold Battle of the Bands passes (student 1 = the demo login, so it has one ticket to show)
    //    - students 2-6 fill the 5-seat Silent DJ Night, so the demo shows a sold-out event
    //    - a few more on other events so the numbers look lived-in, and one cancelled booking
    const confirmed = (from: number, to: number, title: string) =>
      students.slice(from - 1, to).map((s) => ({ userId: s.id, eventId: byTitle(title).id, status: "confirmed" as const }));
    const plan = [
      ...confirmed(1, 12, "Battle of the Bands"),
      ...confirmed(2, 6, "Silent DJ Night"),
      ...confirmed(7, 15, "24-Hour Hackathon"),
      ...confirmed(10, 14, "Robo Wars"),
      ...confirmed(13, 20, "Stand-up Comedy Night"),
      { userId: students[19].id, eventId: byTitle("Campus Treasure Hunt").id, status: "cancelled" as const },
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

    // 6. Check-ins: students 2-4 at Battle of the Bands, scanned by Kabir (volunteer 1).
    //    Student 1 is left un-scanned so a visitor can scan the demo ticket themselves.
    await tx.insert(checkins).values(
      createdBookings.slice(1, 4).map((b) => ({ bookingId: b.id, scannedBy: volunteers[0].id })),
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
