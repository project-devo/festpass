"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { api, type FestEvent } from "@/lib/api";
import { EventCard, EventCardSkeleton } from "@/components/event-card";
import {
  ArrowRightIcon,
  ChartIcon,
  CheckIcon,
  GaugeIcon,
  GithubIcon,
  LockIcon,
  Logo,
  MailIcon,
  ScanIcon,
  ShieldIcon,
  TicketIcon,
} from "@/components/icons";
import { Perforation } from "@/components/perforation";
import { TicketQr } from "@/components/ticket-qr";
import { buttonClass } from "@/components/ui";

const REPO_URL = "https://github.com/project-devo/festpass";

// Real numbers from the k6 load tests and the CI test suite (see the README)
const STATS = [
  { value: "500", label: "students booking at the same moment in the load test" },
  { value: "0", label: "oversold seats across 1,500 booking attempts" },
  { value: "14", label: "integration tests on a real Postgres in CI" },
  { value: "3", label: "roles: student, volunteer and organiser" },
];

const STEPS = [
  {
    icon: <TicketIcon className="size-5" />,
    role: "Students",
    title: "Book in one tap",
    text: "Pick an event and tap Book. The QR ticket shows up on screen and lands in your inbox.",
  },
  {
    icon: <ScanIcon className="size-5" />,
    role: "Volunteers",
    title: "Scan at the gate",
    text: "The phone camera reads the ticket. A full-screen green tick means in; red means used or fake.",
  },
  {
    icon: <ChartIcon className="size-5" />,
    role: "Organisers",
    title: "Watch the hall fill up",
    text: "Create events and follow live attendance that refreshes every five seconds.",
  },
];

const ENGINEERING = [
  {
    icon: <LockIcon className="size-5" />,
    title: "No overselling",
    text: "A seat is taken in one atomic UPDATE that only succeeds while seats are left, so the last seat goes to exactly one student.",
  },
  {
    icon: <ShieldIcon className="size-5" />,
    title: "Signed QR tickets",
    text: "Each ticket carries an HMAC-signed token. A made-up code fails the check, and a real one scans only once.",
  },
  {
    icon: <MailIcon className="size-5" />,
    title: "Emails off the hot path",
    text: "A pg-boss job queue sends ticket emails with retries, so booking stays fast even when email is slow.",
  },
  {
    icon: <GaugeIcon className="size-5" />,
    title: "Rate limited",
    text: "Upstash Redis caps booking clicks per student and per IP, and answers 429 with a retry time.",
  },
];

export default function LandingPage() {
  const [events, setEvents] = useState<FestEvent[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api
      .getEvents()
      .then(setEvents)
      .catch(() => setFailed(true));
  }, []);

  return (
    <main>
      <Hero />

      {/* Proof strip */}
      <section className="border-y border-zinc-200 bg-white">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-zinc-200 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="bg-white px-4 py-8 sm:px-8">
              <dt className="sr-only">{s.label}</dt>
              <dd className="text-3xl font-semibold tracking-tight tabular-nums text-zinc-950">{s.value}</dd>
              <p className="mt-1 text-sm text-zinc-500">{s.label}</p>
            </div>
          ))}
        </dl>
      </section>

      <Section eyebrow="How it works" title="One app for everyone at the fest">
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.role} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">{step.icon}</span>
                <span className="font-mono text-xs text-zinc-400">0{i + 1}</span>
              </div>
              <p className="mt-5 text-xs font-medium uppercase tracking-wider text-zinc-500">{step.role}</p>
              <h3 className="mt-1 text-lg font-semibold text-zinc-950">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">{step.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Happening soon"
        title="Resonance 2026"
        action={
          <Link href="/events" className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500">
            All events <ArrowRightIcon />
          </Link>
        }
      >
        {failed ? (
          <p className="text-sm text-zinc-500">
            Couldn&apos;t load events right now.{" "}
            <Link href="/events" className="font-medium text-indigo-600">
              Try the events page
            </Link>
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events
              ? events.slice(0, 3).map((event) => (
                  <li key={event.id}>
                    <EventCard event={event} />
                  </li>
                ))
              : [0, 1, 2].map((i) => (
                  <li key={i}>
                    <EventCardSkeleton />
                  </li>
                ))}
          </ul>
        )}
      </Section>

      <Section eyebrow="Under the hood" title="Built to survive the rush when bookings open">
        <div className="grid gap-4 sm:grid-cols-2">
          {ENGINEERING.map((item) => (
            <div key={item.title} className="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-6">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 text-zinc-700">
                {item.icon}
              </span>
              <div>
                <h3 className="font-semibold text-zinc-950">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Closing call to action */}
      <section className="px-4 pb-20">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-zinc-950 px-6 py-14 text-center sm:px-12">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(79_70_229/0.45),transparent_60%)]" />
          <div className="relative">
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Try it as any role</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-zinc-400">
              One click logs you in as a student, a volunteer or the organiser. Book a pass, scan it, and watch the count go up.
            </p>
            <Link href="/login" className={buttonClass("secondary", "mt-8 border-transparent")}>
              Open the demo accounts <ArrowRightIcon />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-sm text-zinc-500">
          <span className="flex items-center gap-2">
            <Logo className="size-5" /> FestPass · college fest ticketing
          </span>
          <a href={REPO_URL} className="inline-flex items-center gap-1.5 hover:text-zinc-950">
            <GithubIcon /> Source on GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div aria-hidden className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div aria-hidden className="absolute -top-40 left-1/2 h-80 w-[48rem] -translate-x-1/2 rounded-full bg-indigo-400/20 blur-3xl" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-16 lg:grid-cols-[1.15fr_1fr] lg:pt-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 shadow-xs">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Bookings open for Resonance 2026
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl">
            College fest passes, <span className="text-indigo-600">without the queue chaos.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-zinc-600">
            Book a seat in one tap, get a QR ticket by email, and walk in after a two-second scan. Built so no event is ever
            oversold, even when hundreds of students hit Book at once.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/events" className={buttonClass("primary", "px-5 py-3")}>
              Browse events <ArrowRightIcon />
            </Link>
            <Link href="/login" className={buttonClass("secondary", "px-5 py-3")}>
              Try a demo account
            </Link>
          </div>
        </div>

        <TicketMock />
      </div>
    </section>
  );
}

// A sample ticket, styled like the real one on the My tickets page
function TicketMock() {
  return (
    <div className="relative mx-auto w-full max-w-xs lg:rotate-2">
      <div className="rounded-3xl border border-zinc-200 bg-white shadow-2xl shadow-indigo-950/10">
        <div className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Resonance 2026</p>
          <p className="mt-2 text-xl font-semibold text-zinc-950">Battle of the Bands</p>
          <p className="mt-1 text-sm text-zinc-500">Open Air Theatre · 6:00 pm</p>
        </div>
        <Perforation />
        <div className="flex flex-col items-center p-6">
          <TicketQr token="festpass-sample-ticket-not-valid" size={148} />
          <p className="mt-4 font-mono text-xs text-zinc-400">ADMIT ONE · #7F3A21C9</p>
        </div>
      </div>
      <div className="absolute -bottom-5 -left-6 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-lg lg:-rotate-2">
        <span className="flex size-8 items-center justify-center rounded-full bg-emerald-500 text-white">
          <CheckIcon />
        </span>
        <div>
          <p className="text-sm font-semibold text-zinc-950">Checked in</p>
          <p className="text-xs text-zinc-500">Aditi Sharma · Gate 1</p>
        </div>
      </div>
    </div>
  );
}

function Section({ eyebrow, title, action, children }: { eyebrow: string; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-indigo-600">{eyebrow}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
