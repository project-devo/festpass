import type { FastifyReply, FastifyRequest } from "fastify";
import { userRole } from "../db/schema";

export type Role = (typeof userRole.enumValues)[number];

// 401 unless the request carries a valid token cookie
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "Not logged in" });
  }
}

// 401 if not logged in, 403 if logged in with a role that isn't allowed
export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: "Not logged in" });
    }
    if (!roles.includes(request.user.role)) {
      return reply.code(403).send({ error: "You don't have permission to do this" });
    }
  };
}