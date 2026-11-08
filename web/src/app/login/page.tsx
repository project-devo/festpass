"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/components/session";
import { ChartIcon, Logo, ScanIcon, TicketIcon } from "@/components/icons";
import { Alert, Button, Card, Input } from "@/components/ui";

// Goal 15: the seeded demo accounts, so a visitor can try every role with one click
const DEMO_LOGINS = [
  { role: "Student", icon: TicketIcon, hint: "Book a pass, see your QR ticket", email: "student1@festpass.test", password: "student123" },
  { role: "Volunteer", icon: ScanIcon, hint: "Scan tickets at the gate", email: "volunteer1@festpass.test", password: "volunteer123" },
  { role: "Organiser", icon: ChartIcon, hint: "Create events, watch attendance", email: "organiser@festpass.test", password: "organiser123" },
];

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Takes the email and password as arguments so the demo buttons can log in without waiting for state to update
  async function submit(loginEmail: string, loginPassword: string) {
    setError(null);
    setLoading(true);
    try {
      await api.login(loginEmail, loginPassword);
      await refresh();
      router.push("/events");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  function loginAsDemo(demo: (typeof DEMO_LOGINS)[number]) {
    setEmail(demo.email);
    setPassword(demo.password);
    void submit(demo.email, demo.password);
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-14">
      <div className="flex flex-col items-center text-center">
        <Logo className="size-10" />
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Log in to FestPass</h1>
        <p className="mt-1 text-sm text-zinc-500">Book passes and see your tickets.</p>
      </div>

      <Card className="mt-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit(email, password);
          }}
          className="space-y-4"
        >
          {error && <Alert>{error}</Alert>}
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" loading={loading} className="w-full">
            Log in
          </Button>
        </form>
      </Card>

      <div className="mt-8 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-zinc-400">
        <span className="h-px flex-1 bg-zinc-200" />
        or try a demo account
        <span className="h-px flex-1 bg-zinc-200" />
      </div>

      <div className="mt-4 space-y-2">
        {DEMO_LOGINS.map((demo) => (
          <button
            key={demo.role}
            type="button"
            disabled={loading}
            onClick={() => loginAsDemo(demo)}
            className={
              "group flex w-full items-center gap-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left transition " +
              "hover:border-indigo-300 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50 " +
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            }
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white">
              <demo.icon className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-zinc-950">{demo.role}</span>
              <span className="block text-xs text-zinc-500">{demo.hint}</span>
              <span className="mt-0.5 block break-all font-mono text-[11px] text-zinc-400">
                {demo.email} / {demo.password}
              </span>
            </span>
          </button>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-zinc-500">
        New here?{" "}
        <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
          Create an account
        </Link>
      </p>
    </main>
  );
}
