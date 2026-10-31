import type { FastifyInstance } from "fastify";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../auth/guards";
import { db } from "../db/client";
import { bookings, checkins, events } from "../db/schema";

const bookingParams = z.object({ id: z.uuid() });

export async function meRoutes(app: FastifyInstance) {
  app.get("/me/bookings", { preHandler: requireAuth }, async (request) => {
    return db
      .select({
        id: bookings.id,
        status: bookings.status,
        qrToken: bookings.qrToken,
        createdAt: bookings.createdAt,
        event: { id: events.id, title: events.title, venue: events.venue, startsAt: events.startsAt },
      })
      .from(bookings)
      .innerJoin(events, eq(bookings.eventId, events.id))
      .where(eq(bookings.userId, request.user.sub))
      .orderBy(asc(events.startsAt));
  });

  app.post("/me/bookings/:id/cancel", { preHandler: requireAuth }, async (request, reply) => {
    const params = bookingParams.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Booking id must be a valid UUID" });
    }
    const bookingId = params.data.id;
    const userId = request.user.sub;

    const result = await db.transaction(async (tx) => {
      // Step 1: cancel only if it's mine, still confirmed, and nobody has scanned it yet
      const [cancelled] = await tx
        .update(bookings)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(bookings.id, bookingId),
            eq(bookings.userId, userId),
            eq(bookings.status, "confirmed"),
            sql`not exists (select 1 from ${checkins} where ${checkins.bookingId} = ${bookings.id})`,
          ),
        )
        .returning({ eventId: bookings.eventId });

      if (!cancelled) return null;

      // Step 2: give the seat back, in the same transaction
      const [event] = await tx
        .update(events)
        .set({ seatsLeft: sql`${events.seatsLeft} + 1` })
        .where(eq(events.id, cancelled.eventId))
        .returning({ seatsLeft: events.seatsLeft });

      return { id: bookingId, status: "cancelled" as const, seatsLeft: event.seatsLeft };
    });

    if (result) return result;

    // Nothing changed: find out why, so the message is useful
    const [booking] = await db
      .select({ status: bookings.status, checkedInAt: checkins.scannedAt })
      .from(bookings)
      .leftJoin(checkins, eq(checkins.bookingId, bookings.id))
      .where(and(eq(bookings.id, bookingId), eq(bookings.userId, userId)));

    if (!booking) return reply.code(404).send({ error: "Booking not found" });
    if (booking.checkedInAt) return reply.code(409).send({ error: "Already checked in, can't cancel" });
    return reply.code(409).send({ error: "Already cancelled" });
  });
}