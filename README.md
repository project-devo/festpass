# FestPass

[![CI](https://github.com/project-devo/festpass/actions/workflows/ci.yml/badge.svg)](https://github.com/project-devo/festpass/actions/workflows/ci.yml)

College fest ticketing with QR check-in. Students book seats, get a signed QR ticket by email, and volunteers scan them at the gate. The core guarantee: **the last seat is never sold twice**, even when hundreds of students book at the same moment.

**Live demo:** https://festpass-pi.vercel.app
_Demo deployment with seeded data (a fake fest and test users, no real money). The API runs on Render's free tier, so the first request after idle can take about a minute to wake up._

## Demo logins

| Role | Email | Password |
|---|---|---|
| Organiser | organiser@festpass.test | organiser123 |
| Volunteer | volunteer1@festpass.test | volunteer123 |
| Student | student1@festpass.test | student123 |

Organisers create events and see live attendance, students book and cancel, volunteers scan tickets.

## Features

- Booking that can't oversell (one atomic Postgres update per booking)
- Signed QR tickets (booking id + HMAC), cancel gives the seat back
- Ticket emails with the QR code, sent by a background job (pg-boss) with retries
- Volunteer scanner page (phone camera); a second scan of the same ticket is refused
- Attendance page for organisers, refreshing every 5 seconds
- Rate limiting on booking with Upstash Redis (5 per minute per student, 30 per IP), 429 with Retry-After
- CI on every push (GitHub Actions): lint, type-check, 14 Vitest tests against a Postgres service container, and a k6 smoke test (50 students, 10 seats, 0 oversells) against the API started inside the job

## How booking stays safe

Each booking runs one transaction that starts with
`UPDATE events SET seats_left = seats_left - 1 WHERE id = $1 AND seats_left > 0 RETURNING seats_left`.
Postgres locks the event row, so a second request waits and re-checks `seats_left > 0` on the new value; if no row comes back, the answer is 409 Sold out. A "read seats, then write" version oversells under load because two requests can both read 1 seat left. A `CHECK (seats_left >= 0)` constraint and a unique index on active bookings are the last line of defence.

## Load test (k6)

500 virtual users each sent one booking at the same moment to a fresh 100-seat event on the live API. Run from my laptop (India) to Render free tier and Neon (Singapore), 2026-11-03.

| Run | Requests | Booked | Sold out | Errors | Oversells | p95 |
|---|---|---|---|---|---|---|
| 1 | 500 | 100 | 400 | 0 | 0 | 14.4 s |
| 2 | 500 | 100 | 400 | 0 | 0 | 11.7 s |
| 3 | 500 | 100 | 400 | 0 | 0 | 10.3 s |

**0 oversells and 0 errors across 1,500 concurrent requests.** Latency is high because the free instance has a fraction of a CPU and a 10-connection database pool, so 500 simultaneous bookings queue; the test proves correctness, not speed. The test also found a real bug (Render to Neon connections timing out under load), fixed in `api/src/server.ts`. Script: `api/loadtest/book.js`, results: `api/loadtest/results/`, details in `NOTES.md`.

## Stack

Next.js + TypeScript (Vercel) · Node.js + Fastify (Render) · PostgreSQL on Neon with Drizzle ORM · pg-boss job queue · Upstash Redis · Resend email · qrcode and html5-qrcode · k6

## Run locally

Needs Node 22.12+ and pnpm.

1. `pnpm install`
2. Copy `.env.example` to `api/.env` and fill in the Neon, Upstash and Resend values plus any two random strings for `JWT_SECRET` and `QR_SECRET`
3. `pnpm --filter api db:migrate`
4. `pnpm --filter api db:seed`
5. `pnpm --filter api dev` (API on port 4000)
6. Create `web/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:4000`, then `pnpm --filter web dev` (web on port 3000)

Design decisions and every measured number are in [NOTES.md](NOTES.md).
