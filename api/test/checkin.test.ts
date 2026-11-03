import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { app, book, makeEvent, makeUser, type TestUser } from "./helpers";

// A student books, then reads the ticket's QR token from GET /me/bookings like the tickets page does
async function bookedTicket() {
  const organiser = await makeUser("organiser");
  const student = await makeUser("student", "Asha");
  const event = await makeEvent(organiser.id, 10);
  const booking = (await book(student, event.id)).json();

  const res = await app.inject({ method: "GET", url: "/me/bookings", headers: { cookie: student.cookie } });
  expect(res.statusCode).toBe(200);
  const [ticket] = res.json();
  expect(ticket.id).toBe(booking.id);
  return ticket as { id: string; qrToken: string };
}

function scan(volunteer: TestUser, token: string) {
  return app.inject({ method: "POST", url: "/checkin", headers: { cookie: volunteer.cookie }, payload: { token } });
}

describe("check-in", () => {
  it("works once, the second scan returns 409", async () => {
    const ticket = await bookedTicket();
    const volunteer = await makeUser("volunteer");

    const first = await scan(volunteer, ticket.qrToken);
    expect(first.statusCode).toBe(200);
    expect(first.json().studentName).toBe("Asha");

    const second = await scan(volunteer, ticket.qrToken);
    expect(second.statusCode).toBe(409);
    expect(second.json().error).toMatch(/^Already checked in/);
  });

  it("a forged QR token returns 400", async () => {
    const ticket = await bookedTicket();
    const volunteer = await makeUser("volunteer");

    // Real booking id, but signed with a secret that isn't the server's
    const fakeSignature = createHmac("sha256", "not-the-real-secret").update(ticket.id).digest("base64url");
    const res = await scan(volunteer, `${ticket.id}.${fakeSignature}`);

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("Invalid ticket");
  });
});
