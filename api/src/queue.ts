import { PgBoss } from "pg-boss";
import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { bookings, events, users } from "./db/schema";
import { sendTicketEmail } from "./email";

const SEND_TICKET = "send-ticket";
type SendTicketJob = { bookingId: string };

// pg-boss keeps its jobs in its own "pgboss" schema in the same Neon database
export const boss = new PgBoss({ connectionString: process.env.DATABASE_URL, max: 3 });

boss.on("error", (err) => console.error("[pg-boss]", err));

export async function startQueue() {
  await boss.start(); // first run creates the pgboss schema and tables
  await boss.createQueue(SEND_TICKET, {
    retryLimit: 3, // 1 try + 3 retries
    retryDelay: 30, // seconds before the first retry
    retryBackoff: true, // then about 60s, 120s ...
  });
  await boss.work<SendTicketJob>(SEND_TICKET, { pollingIntervalSeconds: 5 }, async ([job]) => {
    try {
      await sendTicket(job.data.bookingId);
    } catch (err) {
      console.error(`[send-ticket] booking ${job.data.bookingId} failed on attempt ${job.retryCount + 1}`, err);
      throw err; // tells pg-boss the job failed, so it retries
    }
  });
}

// Called by the booking route AFTER the transaction commits
export async function queueTicketEmail(bookingId: string) {
  await boss.send(SEND_TICKET, { bookingId } satisfies SendTicketJob);
}

async function sendTicket(bookingId: string) {
  const [row] = await db
    .select({
      status: bookings.status,
      qrToken: bookings.qrToken,
      email: users.email,
      name: users.name,
      eventTitle: events.title,
      venue: events.venue,
      startsAt: events.startsAt,
    })
    .from(bookings)
    .innerJoin(users, eq(bookings.userId, users.id))
    .innerJoin(events, eq(bookings.eventId, events.id))
    .where(eq(bookings.id, bookingId));

  // Booking gone or cancelled before the job ran: nothing to send, and no point retrying
  if (!row || row.status !== "confirmed") return;

  const emailId = await sendTicketEmail({
    to: row.email,
    name: row.name,
    eventTitle: row.eventTitle,
    venue: row.venue,
    startsAt: row.startsAt,
    qrToken: row.qrToken,
  });
  console.log(`[send-ticket] booking ${bookingId} emailed (resend id ${emailId})`);
}
