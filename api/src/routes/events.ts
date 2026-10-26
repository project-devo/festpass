import type { FastifyInstance } from "fastify";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "../auth/guards";
import { db } from "../db/client";
import { events } from "../db/schema";

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
}