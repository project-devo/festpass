import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { FastifyReply, FastifyRequest } from "fastify";

// Reads UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from the env
const redis = Redis.fromEnv();

// Sliding window: counts requests in the last 60 s at any moment, not per clock minute
const perUser = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  prefix: "festpass:book:user",
});

const perIp = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  prefix: "festpass:book:ip",
});

// RATE_LIMIT_PER_IP=off for the Goal 12 load test (500 users from one laptop share one IP)
const ipLimitOn = process.env.RATE_LIMIT_PER_IP !== "off";

// RATE_LIMIT=off turns both limits off. Only the CI smoke test uses it (no Upstash in CI).
const rateLimitOn = process.env.RATE_LIMIT !== "off";

// preHandler for POST /events/:id/book. Runs after requireRole("student"), so request.user is set.
export async function bookingRateLimit(request: FastifyRequest, reply: FastifyReply) {
    if (!rateLimitOn) return;
  try {
    const checks = [perUser.limit(request.user.sub)];
    if (ipLimitOn) checks.push(perIp.limit(request.ip));
    const results = await Promise.all(checks);

    const blocked = results.find((r) => !r.success);
    if (blocked) {
      // reset = time (ms) when the window frees up again
      const retryAfter = Math.max(1, Math.ceil((blocked.reset - Date.now()) / 1000));
      reply.header("Retry-After", String(retryAfter));
      return reply.code(429).send({ error: `Too many requests. Try again in ${retryAfter} seconds.` });
    }
  } catch (err) {
    // Redis down or slow: let the booking through rather than block every student
    request.log.error({ err }, "rate limit check failed, allowing request");
  }
}