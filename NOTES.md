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