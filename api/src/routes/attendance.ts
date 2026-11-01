import type { FastifyInstance } from "fastify";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "../auth/guards";
import { db } from "../db/client";
import { bookings, checkins, events, users } from "../db/schema";

const eventParams = z.object({ id: z.uuid() });

export async function attendanceRoutes(app: FastifyInstance) {
  app.get("/events/:id/attendance", { preHandler: requireRole("organiser") }, async (request, reply) => {
    const params = eventParams.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Event id must be a valid UUID" });
    }
    const eventId = params.data.id;

    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    if (!event) {
      return reply.code(404).send({ error: "Event not found" });
    }
    // Organisers only see attendance for their own events
    if (event.organiserId !== request.user.sub) {
      return reply.code(403).send({ error: "Only this event's organiser can see its attendance" });
    }

    // Every confirmed booking, plus the check-in time if the ticket was scanned.
    // LEFT JOIN keeps unscanned bookings too; their checkedInAt is null.
    const attendees = await db
      .select({ bookingId: bookings.id, name: users.name, email: users.email, checkedInAt: checkins.scannedAt })
      .from(bookings)
      .innerJoin(users, eq(bookings.userId, users.id))
      .leftJoin(checkins, eq(checkins.bookingId, bookings.id))
      .where(and(eq(bookings.eventId, eventId), eq(bookings.status, "confirmed")))
      .orderBy(asc(users.name));

    return {
      event: { id: event.id, title: event.title, venue: event.venue, startsAt: event.startsAt },
      booked: attendees.length,
      checkedIn: attendees.filter((a) => a.checkedInAt !== null).length,
      attendees,
    };
  });
}