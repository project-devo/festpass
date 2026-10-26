import type { FastifyInstance, FastifyReply } from "fastify";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { users } from "../db/schema";
import { requireAuth } from "../auth/guards";

const isProd = process.env.NODE_ENV === "production";
const WEEK_IN_SECONDS = 7 * 24 * 60 * 60;

const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? ("none" as const) : ("lax" as const),
  path: "/",
};

const loginBody = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const registerBody = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.email(),
  password: z.string().min(8).max(72),
});

type User = typeof users.$inferSelect;

export async function authRoutes(app: FastifyInstance) {
  // Sign a 7-day JWT, send it back as an httpOnly cookie, and return the public user fields
  function logIn(reply: FastifyReply, user: User) {
    const token = app.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: "7d" });
    reply.setCookie("token", token, { ...cookieOptions, maxAge: WEEK_IN_SECONDS });
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }

  app.post("/auth/register", async (request, reply) => {
    const parsed = registerBody.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: "Name (2+ characters), a valid email and a password of 8 to 72 characters are required" });
    }
    const { name, password } = parsed.data;
    const email = parsed.data.email.toLowerCase();

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (existing) {
      return reply.code(409).send({ error: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db.insert(users).values({ name, email, passwordHash, role: "student" }).returning();

    reply.code(201);
    return logIn(reply, user);
  });

  app.post("/auth/login", async (request, reply) => {
    const parsed = loginBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "A valid email and a password are required" });
    }
    const email = parsed.data.email.toLowerCase();

    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      return reply.code(401).send({ error: "Wrong email or password" });
    }

    return logIn(reply, user);
  });

  app.post("/auth/logout", async (_request, reply) => {
    reply.clearCookie("token", cookieOptions);
    return { ok: true };
  });

   app.get("/auth/me", { preHandler: requireAuth }, async (request) => request.user);
}