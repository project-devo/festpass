import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { users } from "../db/schema";

const isProd = process.env.NODE_ENV === "production";
const WEEK_IN_SECONDS = 7 * 24 * 60 * 60;

const loginBody = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
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

    const token = app.jwt.sign({ sub: user.id, role: user.role }, { expiresIn: "7d" });
    reply.setCookie("token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
      maxAge: WEEK_IN_SECONDS,
    });

    return { id: user.id, name: user.name, email: user.email, role: user.role };
  });

  app.get("/auth/me", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: "Not logged in" });
    }
    return request.user;
  });
}