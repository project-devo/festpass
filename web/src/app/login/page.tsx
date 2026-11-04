"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/components/session";
import { Alert, Button, Card, Input } from "@/components/ui";

// Goal 15: the seeded demo accounts, so a visitor can try every role with one click
const DEMO_LOGINS = [
  { role: "Student", hint: "Book a pass, see your QR ticket", email: "student1@festpass.test", password: "student123" },
  { role: "Volunteer", hint: "Scan tickets at the gate", email: "volunteer1@festpass.test", password: "volunteer123" },
  { role: "Organiser", hint: "Create events, watch attendance", email: "organiser@festpass.test", password: "organiser123" },
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
      router.push("/");
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
    <main className="mx-auto w-full max-w-sm px-4 py-16">
      <h1 className="text-center text-2xl font-semibold tracking-tight">Log in to FestPass</h1>
      <p className="mt-1 text-center text-sm text-slate-600">Book passes and see your tickets.</p>

      <Card className="mt-6">
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

      <Card className="mt-4">
        <h2 className="text-sm font-semibold text-slate-900">Try a demo account</h2>
        <p className="mt-1 text-xs text-slate-600">One click logs you in. Each role sees a different part of the app.</p>
        <div className="mt-4 space-y-2">
          {DEMO_LOGINS.map((demo) => (
            <button
              key={demo.role}
              type="button"
              disabled={loading}
              onClick={() => loginAsDemo(demo)}
              className={
                "block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-left transition " +
                "hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
              }
            >
              <span className="block text-sm font-medium text-slate-900">{demo.role}</span>
              <span className="block text-xs text-slate-600">{demo.hint}</span>
              <span className="mt-1 block break-all font-mono text-xs text-slate-500">
                {demo.email} / {demo.password}
              </span>
            </button>
          ))}
        </div>
      </Card>

      <p className="mt-4 text-center text-sm text-slate-600">
        New here?{" "}
        <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
          Create an account
        </Link>
      </p>
    </main>
  );
}
