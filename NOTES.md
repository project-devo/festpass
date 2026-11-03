# FestPass notes

## Setup decisions
- pnpm workspaces: web/ and api/ share one install and one lockfile.
- TypeScript pinned to 5.9 (TypeScript 7 is too new for typescript-eslint and other tools).
- ESLint and Prettier are configured at the root. web/ gets Next.js's own ESLint config in Goal 4.
- API tsconfig uses NodeNext with no "type": "module", so imports need no .js endings.

## Design decisions
(add as you go)

## Load test numbers
(add in Goal 12)

## Design Decisions

- Neon in AWS Singapore, direct (unpooled) connection: one long-running API server, and pg-boss needs a direct connection.
- UUID primary keys, so ids in URLs and QR tokens can't be guessed.
- seats_left >= 0 and seats_left <= capacity as CHECK constraints: a last line of defence if app code ever goes wrong.
- One active booking per user per event, as a partial unique index (WHERE status = 'confirmed'), so a student can rebook after cancelling.
- checkins.booking_id is UNIQUE, so the database itself refuses a second scan.
- Seed runs in one transaction and empties tables first, so it is safe to re-run. Demo emails use the reserved .test domain.
- bcryptjs instead of bcrypt: pure JS, no native build on Windows.

- Auth: JWT (7 days) in an httpOnly cookie, so page JavaScript can't read it. SameSite=None + Secure in production because web (Vercel) and API (Render) are different sites; Lax locally.
- Register always creates a student; roles never come from the request body. organiserId on new events comes from the token.
- Same "Wrong email or password" message for unknown email and wrong password, so login can't be used to find accounts.
- requireAuth / requireRole preHandlers: 401 when not logged in, 403 when the role isn't allowed.
- Every request body and URL id is checked with Zod; bad input gets a 400 before touching the database.
- CORS allows only WEB_ORIGIN, with credentials. Unknown errors return a plain 500 and are logged, never sent to the client.
- Booking (Goal 6): POST /events/:id/book runs one transaction. Step 1 is
  `UPDATE events SET seats_left = seats_left - 1 WHERE id = $1 AND seats_left > 0 RETURNING seats_left`.
  No row back = 409 Sold out (or 404 if the event doesn't exist). Step 2 inserts the booking;
  if one_active_booking_per_user fires (Postgres 23505) the transaction rolls back, the seat is
  given back, and the answer is 409 Already booked.
- Why an atomic UPDATE and not "read seats, then write": with read-then-write, two requests can
  both read seats_left = 1 before either writes, and both book (oversell). The single UPDATE locks
  the event row; the second request waits, re-checks seats_left > 0 on the new value, and gets no row.
- Why not a Redis lock: it adds a second system that can fail or expire mid-booking, while Postgres
  already gives row locks inside the transaction. One fewer moving part.
- The booking id is made in the API (randomUUID) so the qr_token (id + HMAC with QR_SECRET) can be
  signed before the insert. signTicket lives in api/src/tickets.ts, shared with the seed.
- Race check (api/scripts/race.ts, `pnpm --filter api race`): 20 students book a fresh 1-seat event
  at once. Local result 2026-10-31: 1 x 201 Booked, 19 x 409 Sold out, seats_left 0.



  ## QR tickets and cancelling (Goal 7)

- Ticket token = booking id + "." + HMAC-SHA256(booking id, QR_SECRET), base64url. Only the server knows QR_SECRET, so a forged or edited token fails the check at the gate (Goal 9). A plain booking id would be guessable from any leaked ticket and couldn't be checked offline.
- The QR image is drawn in the browser with `qrcode` (toDataURL), so the API sends only the ~80-character token, not an image. Goal 8's email will draw the same token on the server.
- Cancel = one transaction: UPDATE bookings SET status='cancelled' WHERE id, owner, status='confirmed' AND no check-in exists, then seats_left + 1. If the first UPDATE matches nothing, nothing else runs, so a seat can't be given back twice. CHECK seats_left <= capacity is the backstop.
- Someone else's booking id returns 404, not 403, so ids can't be probed. A checked-in ticket can't be cancelled (409).
- Cancelling frees the student to book the same event again, because the unique index only covers status='confirmed'.


- Ticket email (Goal 8): after the booking transaction commits, the route queues a
  `send-ticket` job in pg-boss with only the booking id, then returns 201 straight away.
  A worker in the same API process loads the booking, draws the QR (qrcode.toBuffer) and
  sends it with Resend as an inline + attached PNG.
- Why a queue: booking must stay fast and must not fail because email is slow or down.
  Resend takes a few hundred ms and can error; inside the request that would delay or
  break booking. Queueing is one insert; if even that fails, it is logged and the booking
  still stands (the QR is on My tickets anyway).
- Queued after commit, not inside the transaction, so a rolled-back booking (Sold out,
  Already booked) never gets an email.
- Retries: retryLimit 3 with retryDelay 30s and exponential backoff. A Resend error is
  thrown so pg-boss retries it; every failed attempt is logged with the booking id.
  The worker re-reads the booking, so a ticket cancelled before sending is skipped.
- Why pg-boss and not BullMQ: pg-boss keeps jobs in Postgres (its own pgboss schema in
  Neon), so there is no Redis to run for the queue, and jobs survive restarts.
- Demo email mode: without a verified domain, Resend's free tier only delivers to the
  account owner's address, and seeded users use @festpass.test. TICKET_EMAIL_TO sends
  every ticket to that one inbox; unset it once a domain is verified.
- pg-boss 12 is ESM-only; the API is CommonJS and loads it through Node's require(esm)
  (Node 22.12+, Render runs Node 24).


## Attendance page (Goal 10)

- GET /events/:id/attendance (organiser only, and only for their own events, else 403):
  one query, confirmed bookings JOIN users LEFT JOIN checkins. The LEFT JOIN keeps
  people who haven't been scanned (checkedInAt null), so one query gives booked,
  checked-in and the name list. Cancelled bookings are not counted as booked.
- The page polls every 5 s with setInterval, skips while the tab is hidden, and keeps
  the last numbers on screen if one request fails. Polling over WebSockets: one cheap
  query per open page is enough for a gate dashboard and adds nothing to Render's
  free tier. Stretch 3 replaces it with Socket.IO pushes.
- Live test 2026-11-01: Battle of the Bands went 5/10 -> 6/10 on the laptop within one
  refresh of Volunteer 1 scanning Student 5 on an Android phone.

 ## Rate limiting (Goal 11)

- POST /events/:id/book has two sliding-window limits in Upstash Redis
  (@upstash/ratelimit): 5 a minute per student (JWT sub) and 30 a minute per IP.
  Over the limit -> 429 "Too many requests" with a Retry-After header (seconds).
- It runs as a preHandler after requireRole("student"), so a blocked request never
  opens a database transaction. Both checks run in parallel: one round trip to
  Upstash in Singapore, same region as Render and Neon.
- Sliding window, not fixed: a fixed per-minute window lets someone send 5 at 0:59
  and 5 more at 1:01.
- Fails open: if Redis errors, the booking goes through and the error is logged.
  The atomic seat update (Goal 6) is what prevents overselling; the limiter only
  stops spam, so it is the safe part to skip during an outage.
- RATE_LIMIT_PER_IP=off turns the per-IP limit off (per-student stays on). The
  Goal 12 k6 test sends 500 bookings from one laptop, i.e. one IP, which the
  30/min limit would otherwise block.
- trustProxy: true in Fastify. Requests go browser -> Vercel rewrite -> Render's
  proxy -> API, so without it request.ip is a proxy address and every student
  would share one IP limit. With it, Fastify uses the first X-Forwarded-For address.
- Live test 2026-11-02: Student 10 clicked Book 6 times in a minute on the Vercel
  site; clicks 1-5 got 409 Already booked, the 6th got 429 "Try again in 34
  seconds", seats_left unchanged. Local test: 201, 409 x4, 429 Retry-After 36.
- Deploy gotcha: quotes around UPSTASH_REDIS_REST_URL on Render crashed the API
  at startup (UrlError). Node's --env-file strips quotes locally; Render keeps them. 


## Load test (Goal 12)

- k6 v2.3.0, api/loadtest/book.js: 500 virtual users, 1 booking each, all starting
  together (per-vu-iterations, 1 iteration) on a fresh 100-seat event created in setup().
  201 = booked, 409 "Sold out" = expected, anything else = error. Thresholds fail the run
  unless booked == 100, oversells == 0 and errors == 0.
- After each run, teardown() reads the event and the organiser attendance list back
  from the API; then the same was checked in Neon SQL (confirmed bookings = 100,
  seats_left = 0 for all three "Load test" events).
- 500 load-test students (student1..500@loadtest.festpass.test) created by
  api/loadtest/seed-users.ts, which logs each in through the live API and saves the JWTs
  to api/loadtest/tokens.json (gitignored). Their ticket emails are skipped in queue.ts:
  Resend free sends 100 emails a day and one run books 100 seats. The booking and the
  queued job are still real.
- Ran from my laptop (India) to the Render free tier (Singapore), Neon Singapore,
  RATE_LIMIT_PER_IP=off for the runs (back on after). 2026-11-03:

| Run | Requests | Booked | Sold out | Errors | Oversells | Median | p95 | Max |
|---|---|---|---|---|---|---|---|---|
| 1 (14:27 UTC) | 500 | 100 | 400 | 0 | 0 | 12.3 s | 14.4 s | 14.7 s |
| 2 (14:29 UTC) | 500 | 100 | 400 | 0 | 0 | 9.4 s | 11.7 s | 11.9 s |
| 3 (14:29 UTC) | 500 | 100 | 400 | 0 | 0 | 8.4 s | 10.3 s | 10.6 s |

- Latency is high because the free instance has a fraction of a CPU and the pg pool
  has 10 connections, so 500 bookings queue. Correctness is what the test proves:
  0 oversells in 1,500 requests. Results JSON in api/loadtest/results/.
- Bug found and fixed by the test: Render -> Neon connects failed under load with
  ENETUNREACH (IPv6) then ETIMEDOUT (IPv4). Node's happy-eyeballs gives each address
  250 ms; Render has no IPv6 and the busy CPU missed the IPv4 window. Fix in
  server.ts: dns.setDefaultResultOrder("ipv4first") + net.setDefaultAutoSelectFamily(false).
- One login in the seed got a Render/Cloudflare 520 and succeeded on retry.