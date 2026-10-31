import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { and, asc, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "../auth/guards";
import { db } from "../db/client";
import { bookings, events } from "../db/schema";
import { signTicket } from "../tickets";

const eventParams = z.object({ id: z.uuid() });

const createEventBody = z.object({
  title: z.string().trim().min(3).max(100),
  venue: z.string().trim().min(2).max(100),
  startsAt: z.iso
    .datetime({ offset: true })
    .transform((s) => new Date(s))
    .refine((d) => d > new Date(), "startsAt must be in the future"),
  capacity: z.number().int().min(1).max(5000),
});

// Thrown inside the transaction: it rolls everything back and says which HTTP answer to send
class BookingError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Postgres code 23505 = unique constraint broken. Drizzle wraps the pg error, so check .cause too.
function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "23505" || e?.cause?.code === "23505";
}

export async function eventRoutes(app: FastifyInstance) {
  app.get("/events", async () => {
    return db.select().from(events).orderBy(asc(events.startsAt));
  });

  app.get("/events/:id", async (request, reply) => {
    const params = eventParams.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Event id must be a valid UUID" });
    }

    const [event] = await db.select().from(events).where(eq(events.id, params.data.id));
    if (!event) {
      return reply.code(404).send({ error: "Event not found" });
    }
    return event;
  });

  app.post("/events", { preHandler: requireRole("organiser") }, async (request, reply) => {
    const parsed = createEventBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid event", details: z.flattenError(parsed.error).fieldErrors });
    }
    const { title, venue, startsAt, capacity } = parsed.data;

    const [event] = await db
      .insert(events)
      .values({ title, venue, startsAt, capacity, seatsLeft: capacity, organiserId: request.user.sub })
      .returning();

    reply.code(201);
    return event;
  });

    app.post("/events/:id/book", { preHandler: requireRole("student") }, async (request, reply) => {
    const params = eventParams.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Event id must be a valid UUID" });
    }
    const eventId = params.data.id;
    const userId = request.user.sub;

    try {
      const booking = await db.transaction(async (tx) => {
        // Step 1: take a seat only if one is left, in a single statement
        const [seat] = await tx
          .update(events)
          .set({ seatsLeft: sql`${events.seatsLeft} - 1` })
          .where(and(eq(events.id, eventId), gt(events.seatsLeft, 0)))
          .returning({ seatsLeft: events.seatsLeft });

        if (!seat) {
          // No row updated: either the event doesn't exist or it has 0 seats
          const [exists] = await tx.select({ id: events.id }).from(events).where(eq(events.id, eventId));
          throw exists ? new BookingError(409, "Sold out") : new BookingError(404, "Event not found");
        }

        // Step 2: insert the booking. We make the id here so the QR token can be signed with it.
        const id = randomUUID();
        await tx.insert(bookings).values({ id, userId, eventId, qrToken: signTicket(id) });
        return { id, seatsLeft: seat.seatsLeft };
      });

      reply.code(201);
      return booking;
    } catch (err) {
      if (err instanceof BookingError) {
        return reply.code(err.status).send({ error: err.message });
      }
      if (isUniqueViolation(err)) {
        // one_active_booking_per_user fired; the transaction rolled back, so the seat was given back
        return reply.code(409).send({ error: "Already booked" });
      }
      throw err; // anything else goes to the 500 error handler
    }
  });
}