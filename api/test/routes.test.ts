import { describe, expect, it } from "vitest";
import { app, book, makeEvent, makeUser } from "./helpers";

// One quick check for every route the 8 main tests don't already hit
describe("other routes", () => {
  it("GET /health is ok", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.json()).toEqual({ status: "ok" });
  });

  it("register, me, logout, login", async () => {
    const body = { name: "Riya", email: "riya@test.festpass", password: "password123" };

    const reg = await app.inject({ method: "POST", url: "/auth/register", payload: body });
    expect(reg.statusCode).toBe(201);
    expect(reg.json().role).toBe("student");
    const cookie = reg.cookies.find((c) => c.name === "token");
    expect(cookie?.httpOnly).toBe(true);

    const again = await app.inject({ method: "POST", url: "/auth/register", payload: body });
    expect(again.statusCode).toBe(409);

    const me = await app.inject({ method: "GET", url: "/auth/me", headers: { cookie: `token=${cookie?.value}` } });
    expect(me.json().role).toBe("student");

    const out = await app.inject({ method: "POST", url: "/auth/logout" });
    expect(out.cookies.find((c) => c.name === "token")?.value).toBe("");

    const wrong = await app.inject({ method: "POST", url: "/auth/login", payload: { ...body, password: "nope" } });
    expect(wrong.statusCode).toBe(401);
    const login = await app.inject({ method: "POST", url: "/auth/login", payload: body });
    expect(login.statusCode).toBe(200);
  });

  it("GET /auth/me without a cookie is 401", async () => {
    const res = await app.inject({ method: "GET", url: "/auth/me" });
    expect(res.statusCode).toBe(401);
  });

  it("organisers create events, students can't", async () => {
    const organiser = await makeUser("organiser");
    const student = await makeUser("student");
    const payload = {
      title: "Dance Off",
      venue: "Open Air Theatre",
      startsAt: new Date(Date.now() + 86_400_000).toISOString(),
      capacity: 50,
    };

    const created = await app.inject({ method: "POST", url: "/events", headers: { cookie: organiser.cookie }, payload });
    expect(created.statusCode).toBe(201);
    expect(created.json().seatsLeft).toBe(50);

    const denied = await app.inject({ method: "POST", url: "/events", headers: { cookie: student.cookie }, payload });
    expect(denied.statusCode).toBe(403);
  });

  it("lists events and gets one by id", async () => {
    const organiser = await makeUser("organiser");
    const event = await makeEvent(organiser.id, 5);

    const list = await app.inject({ method: "GET", url: "/events" });
    expect(list.json()).toHaveLength(1);

    const one = await app.inject({ method: "GET", url: `/events/${event.id}` });
    expect(one.json().title).toBe("Test Event");

    const missing = await app.inject({ method: "GET", url: "/events/00000000-0000-4000-8000-000000000000" });
    expect(missing.statusCode).toBe(404);
    const bad = await app.inject({ method: "GET", url: "/events/not-a-uuid" });
    expect(bad.statusCode).toBe(400);
  });

  it("attendance: the event's organiser sees it, another organiser gets 403", async () => {
    const owner = await makeUser("organiser");
    const other = await makeUser("organiser");
    const student = await makeUser("student");
    const event = await makeEvent(owner.id, 5);
    await book(student, event.id);

    const url = `/events/${event.id}/attendance`;
    const mine = await app.inject({ method: "GET", url, headers: { cookie: owner.cookie } });
    expect(mine.statusCode).toBe(200);
    expect(mine.json()).toMatchObject({ booked: 1, checkedIn: 0 });

    const notMine = await app.inject({ method: "GET", url, headers: { cookie: other.cookie } });
    expect(notMine.statusCode).toBe(403);
  });
});
