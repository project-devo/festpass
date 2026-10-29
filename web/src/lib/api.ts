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

export class ApiError extends Error {
  status: number;
  details?: Record<string, string[]>;

  constructor(status: number, message: string, details?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, options: { method?: "GET" | "POST"; body?: unknown } = {}): Promise<T> {
  const method = options.method ?? "GET";

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      credentials: "include",
      headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
      body: method === "POST" ? JSON.stringify(options.body ?? {}) : undefined,
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check that the API is running.");
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`, data?.details);
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
};

