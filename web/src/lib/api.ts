import { trackRequest } from "./server-status";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type Role = "student" | "organiser" | "volunteer";

export type User = { id: string; name: string; email: string; role: Role };

// What GET /auth/me returns: the user id (sub) and role from the cookie
export type Session = { sub: string; role: Role };

export type FestEvent = {
  id: string;
  title: string;
  venue: string;
  startsAt: string;
  capacity: number;
  seatsLeft: number;
  organiserId: string;
};

export type NewEvent = { title: string; venue: string; startsAt: string; capacity: number };

export type Booking = {
  id: string;
  status: "confirmed" | "cancelled";
  qrToken: string;
  createdAt: string;
  event: Pick<FestEvent, "id" | "title" | "venue" | "startsAt">;
};

export type CheckinResult = { studentName: string; eventTitle: string; checkedInAt: string };


export type Attendee = { bookingId: string; name: string; email: string; checkedInAt: string | null };

export type Attendance = {
  event: Pick<FestEvent, "id" | "title" | "venue" | "startsAt">;
  booked: number;
  checkedIn: number;
  attendees: Attendee[];
};

export class ApiError extends Error {
  status: number;
  details?: Record<string, string[]>;
  // The full error body, e.g. { error, studentName, eventTitle } from POST /checkin
  body?: Record<string, unknown>;

  constructor(status: number, message: string, details?: Record<string, string[]>, body?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.details = details;
    this.body = body;
  }
}


const RETRY_STATUSES = new Set([429, 502, 503, 504]);
const MAX_WAIT_MS = 90_000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));


// Render's edge answers 429 to requests that come through Vercel while the API
// sleeps, and they never wake it. A request straight from the visitor's browser
// does wake it, so ping /health directly once. no-cors: we ignore the response.
const WAKE_URL = process.env.NEXT_PUBLIC_WAKE_URL;
let wakeSent = false;
function wakeApi() {
  if (!WAKE_URL || wakeSent) return;
  wakeSent = true;
  fetch(WAKE_URL, { mode: "no-cors" }).catch(() => {});
}


// Render's free tier sleeps after 15 idle minutes. While it boots, the proxy in
// front of it can answer 429/502/503/504 or drop the connection. GETs are safe
// to repeat, so retry them with growing waits for up to a minute.
async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  const started = Date.now();
  let delay = 1000;
  while (true) {
    const timeLeft = Date.now() - started + delay < MAX_WAIT_MS;
    const canRetry = init.method === "GET" && timeLeft;
    try {
      const res = await fetch(url, init);
      if (!canRetry || !RETRY_STATUSES.has(res.status)) return res;
    } catch (err) {
      if (!canRetry) throw err;
    }
    wakeApi();
    await sleep(delay);
    delay = Math.min(delay * 2, 8000);
  }
}

async function request<T>(path: string, options: { method?: "GET" | "POST"; body?: unknown } = {}): Promise<T> {
  const method = options.method ?? "GET";

  let res: Response;
  try {
  res = await trackRequest(fetchWithRetry(`${API_URL}${path}`, { 
      method,
      credentials: "include",
      headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
      body: method === "POST" ? JSON.stringify(options.body ?? {}) : undefined,
    }));
  } catch {
    throw new ApiError(0, "Can't reach the server. Check that the API is running.");
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`, data?.details, data ?? undefined);
  }
  return data as T;
}

// null when nobody is logged in, instead of throwing
async function getSession(): Promise<Session | null> {
  try {
    return await request<Session>("/auth/me");
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

export const api = {
  getSession,
  login: (email: string, password: string) =>
    request<User>("/auth/login", { method: "POST", body: { email, password } }),
  register: (name: string, email: string, password: string) =>
    request<User>("/auth/register", { method: "POST", body: { name, email, password } }),
  logout: () => request<{ ok: true }>("/auth/logout", { method: "POST" }),
  getEvents: () => request<FestEvent[]>("/events"),
  bookEvent: (id: string) => request<{ id: string }>(`/events/${id}/book`, { method: "POST" }),
  getEvent: (id: string) => request<FestEvent>(`/events/${id}`),
  createEvent: (input: NewEvent) => request<FestEvent>("/events", { method: "POST", body: input }),
  getMyBookings: () => request<Booking[]>("/me/bookings"),
    cancelBooking: (id: string) =>
    request<{ id: string; status: "cancelled"; seatsLeft: number }>(`/me/bookings/${id}/cancel`, { method: "POST" }),
      checkIn: (token: string) => request<CheckinResult>("/checkin", { method: "POST", body: { token } }),
   getAttendance: (id: string) => request<Attendance>(`/events/${id}/attendance`),
};

