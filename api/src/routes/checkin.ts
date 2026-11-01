import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "../auth/guards";
import { db } from "../db/client";
import { bookings, checkins, events, users } from "../db/schema";
import { verifyTicket } from "../tickets";

const checkinBody = z.object({ token: z.string().min(1).max(200) });

// Show times in Indian time, since Render's server clock runs in UTC
const timeIST = (d: Date) =>
  d.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" });

export async function checkinRoutes(app: FastifyInstance) {
  app.post("/checkin", { preHandler: requireRole("volunteer") }, async (request, reply) => {
    // 1. Is it a token we signed?
    const parsed = checkinBody.safeParse(request.body);
    const bookingId = parsed.success ? verifyTicket(parsed.data.token.trim()) : null;
    if (!bookingId) {
      return reply.code(400).send({ error: "Invalid ticket" });
    }

    // 2. Find the booking, with the student's name and the event
    const [booking] = await db
      .select({ status: bookings.status, studentName: users.name, eventTitle: events.title })
      .from(bookings)
      .innerJoin(users, eq(bookings.userId, users.id))
      .innerJoin(events, eq(bookings.eventId, events.id))
      .where(eq(bookings.id, bookingId));

    if (!booking) {
      return reply.code(404).send({ error: "Ticket not found" });
    }
    const { studentName, eventTitle } = booking;
    if (booking.status === "cancelled") {
      return reply.code(409).send({ error: "This ticket was cancelled", studentName, eventTitle });
    }

    // 3. Insert the check-in. UNIQUE booking_id means only the first scan gets a row back.
    const [row] = await db
      .insert(checkins)
      .values({ bookingId, scannedBy: request.user.sub })
      .onConflictDoNothing({ target: checkins.bookingId })
      .returning({ scannedAt: checkins.scannedAt });

    if (!row) {
      const [first] = await db
        .select({ scannedAt: checkins.scannedAt })
        .from(checkins)
        .where(eq(checkins.bookingId, bookingId));
      return reply.code(409).send({
        error: `Already checked in at ${timeIST(first.scannedAt)}`,
        studentName,
        eventTitle,
      });
    }

    return { studentName, eventTitle, checkedInAt: row.scannedAt };
  });
}