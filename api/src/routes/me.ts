import type { FastifyInstance } from "fastify";
import { asc, eq } from "drizzle-orm";
import { requireAuth } from "../auth/guards";
import { db } from "../db/client";
import { bookings, events } from "../db/schema";

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
}