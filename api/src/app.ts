import Fastify from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyJwt from "@fastify/jwt";
import { authRoutes } from "./routes/auth";

type Role = "student" | "organiser" | "volunteer";

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

  return app;
}