import type { Role } from "./auth/guards";
import Fastify, { type FastifyError } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import { authRoutes } from "./routes/auth";
import { eventRoutes } from "./routes/events";
import { meRoutes } from "./routes/me";
import fastifyCors from "@fastify/cors";





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

    app.register(fastifyCors, {
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  });

    app.setErrorHandler<FastifyError>((error, request, reply) => {
    if (error.statusCode && error.statusCode < 500) {
      return reply.code(error.statusCode).send({ error: error.message });
    }
    request.log.error(error);
    return reply.code(500).send({ error: "Something went wrong on our side" });
  });

  app.setNotFoundHandler((request, reply) => {
    return reply.code(404).send({ error: `No route for ${request.method} ${request.url}` });
  });

  app.register(fastifyCookie);
  app.register(fastifyJwt, { secret, cookie: { cookieName: "token", signed: false } });

  app.get("/health", async () => ({ status: "ok" }));
  app.register(authRoutes);
  app.register(eventRoutes);
  app.register(meRoutes);

  return app;
}




