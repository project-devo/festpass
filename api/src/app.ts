import type { Role } from "./auth/guards";
import Fastify from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import { authRoutes } from "./routes/auth";
import { eventRoutes } from "./routes/events";
import { meRoutes } from "./routes/me";




declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; role: Role };
    user: { sub: string; role: Role };
  }
}

export function buildApp() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is missing in api/.env");

  const app = Fastify({ logger: true });

  app.register(fastifyCookie);
  app.register(fastifyJwt, { secret, cookie: { cookieName: "token", signed: false } });

  app.get("/health", async () => ({ status: "ok" }));
  app.register(authRoutes);
  app.register(eventRoutes);
  app.register(meRoutes);

  return app;
}




