// Goal 12: 500 students try to book one 100-seat event at the same moment.
// Run from the repo root:  k6 run api/loadtest/book.js
import http from "k6/http";
import { SharedArray } from "k6/data";
import { Counter, Gauge, Trend } from "k6/metrics";

const API = __ENV.API_URL || "https://festpass-api.onrender.com";
const SEATS = 100;

// The 500 JWTs from seed-users.ts, loaded once and shared by every virtual user
const tokens = new SharedArray("tokens", () => JSON.parse(open("./tokens.json")));

const booked = new Counter("booked"); // 201
const soldOut = new Counter("sold_out"); // 409 Sold out (expected)
const bookErrors = new Counter("book_errors"); // anything else
const bookDuration = new Trend("book_duration", true); // booking request time only
const confirmed = new Counter("confirmed_bookings"); // read back from the API after the run
const oversells = new Counter("oversells");
const seatsLeftAfter = new Gauge("seats_left_after");

export const options = {
  scenarios: {
    book: {
      executor: "per-vu-iterations", // every VU runs once, all starting together
      vus: tokens.length,
      iterations: 1,
      maxDuration: "2m",
    },
  },
  setupTimeout: "120s", // Render free tier may need ~50 s to wake up
  summaryTrendStats: ["avg", "med", "p(95)", "p(99)", "max"],
  thresholds: {
    booked: [`count==${SEATS}`],
    oversells: ["count==0"],
    book_errors: ["count==0"],
  },
};

const json = { "Content-Type": "application/json" };

// Runs once before the test: wake the API, log in as organiser, create a fresh event
export function setup() {
  const health = http.get(`${API}/health`, { timeout: "90s" });
  if (health.status !== 200) throw new Error(`API not healthy: ${health.status}`);

  const login = http.post(
    `${API}/auth/login`,
    JSON.stringify({ email: "organiser@festpass.test", password: "organiser123" }),
    { headers: json },
  );
  if (login.status !== 200) throw new Error(`Organiser login failed: ${login.status}`);
  const orgToken = login.cookies.token[0].value;

  const created = http.post(
    `${API}/events`,
    JSON.stringify({
      title: `Load test ${new Date().toISOString().slice(0, 19).replace("T", " ")}`,
      venue: "k6 Arena",
      startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      capacity: SEATS,
    }),
    { headers: { ...json, Cookie: `token=${orgToken}` } },
  );
  if (created.status !== 201) throw new Error(`Create event failed: ${created.status} ${created.body}`);

  const eventId = created.json("id");
  console.log(`Created ${SEATS}-seat event ${eventId}`);
  return { eventId, orgToken };
}

// Each of the 500 VUs runs this exactly once: one booking with its own student's token
export default function (data) {
  const res = http.post(`${API}/events/${data.eventId}/book`, "{}", {
    headers: { ...json, Cookie: `token=${tokens[__VU - 1]}` },
    tags: { name: "book" },
    responseCallback: http.expectedStatuses(201, 409),
  });
  bookDuration.add(res.timings.duration);

  const body = String(res.body || "");
  if (res.status === 201) {
    booked.add(1);
  } else if (res.status === 409 && body.includes("Sold out")) {
    soldOut.add(1);
  } else {
    bookErrors.add(1);
    console.warn(`VU ${__VU}: ${res.status} ${body.slice(0, 120)}`);
  }
}

// Runs once after the test: read the event back and count oversells
export function teardown(data) {
  const event = http.get(`${API}/events/${data.eventId}`).json();
  const attendance = http
    .get(`${API}/events/${data.eventId}/attendance`, { headers: { Cookie: `token=${data.orgToken}` } })
    .json();

  confirmed.add(attendance.booked);
  seatsLeftAfter.add(event.seatsLeft);
  oversells.add(Math.max(0, attendance.booked - SEATS) + (event.seatsLeft < 0 ? 1 : 0));
  console.log(`Event ${data.eventId}: ${attendance.booked} confirmed bookings, seats_left ${event.seatsLeft}`);
}

// Prints our own short summary and saves everything to loadtest/results/
export function handleSummary(data) {
  const m = data.metrics;
  const count = (name) => (m[name] ? m[name].values.count : 0);
  const d = m.book_duration ? m.book_duration.values : {};

  const result = {
    ranAt: new Date().toISOString(),
    from: "Priyank's laptop (India) -> Render free tier (Singapore)",
    api: API,
    eventId: data.setup_data ? data.setup_data.eventId : null,
    virtualUsers: tokens.length,
    seats: SEATS,
    totalRequests: count("booked") + count("sold_out") + count("book_errors"),
    booked: count("booked"),
    soldOut: count("sold_out"),
    errors: count("book_errors"),
    confirmedInDb: count("confirmed_bookings"),
    seatsLeftAfter: m.seats_left_after ? m.seats_left_after.values.value : null,
    oversells: count("oversells"),
    latencyMs: {
      avg: Math.round(d.avg),
      median: Math.round(d.med),
      p95: Math.round(d["p(95)"]),
      p99: Math.round(d["p(99)"]),
      max: Math.round(d.max),
    },
  };

  const stamp = result.ranAt.slice(0, 19).replace(/:/g, "-");
    delete data.setup_data; // holds the organiser token; keep it out of the saved file
  return {
    stdout: `\n===== FestPass load test =====\n${JSON.stringify(result, null, 2)}\n`,
    [`api/loadtest/results/run-${stamp}.json`]: JSON.stringify({ result, k6: data }, null, 2),
  };
}
