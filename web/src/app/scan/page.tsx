"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/components/session";
import { ScanIcon } from "@/components/icons";
import { Notice, PageHeader, PageState, buttonClass } from "@/components/ui";

type ScanResult = { ok: boolean; title: string; studentName?: string; eventTitle?: string };

// How long the green/red screen stays up; scans are ignored meanwhile
const PAUSE_MS = 2000;
// The camera keeps seeing the same QR while the phone is still pointed at it.
// Ignore that same ticket until it has been out of view for this long.
const SAME_TICKET_MS = 3000;

const text = (value: unknown) => (typeof value === "string" ? value : undefined);

export default function ScanPage() {
  const { session, loading } = useSession();
  const isVolunteer = session?.role === "volunteer";

  const [result, setResult] = useState<ScanResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [checkedIn, setCheckedIn] = useState(0);

  const busy = useRef(false);
  const lastSeen = useRef({ token: "", at: 0 });

  useEffect(() => {
    if (!isVolunteer) return;

    let scanner: Html5Qrcode | null = null;
    let started: Promise<unknown> | null = null;
    let stopped = false;

    async function handleScan(token: string) {
      const now = Date.now();
      const last = lastSeen.current;
      if (token === last.token && now - last.at < SAME_TICKET_MS) {
        last.at = now; // still in view: keep ignoring it
        return;
      }
      if (busy.current) return; // still showing the previous result
      busy.current = true;
      lastSeen.current = { token, at: now };

      try {
        const res = await api.checkIn(token);
        setResult({ ok: true, title: "Checked in", studentName: res.studentName, eventTitle: res.eventTitle });
        setCheckedIn((n) => n + 1);
        navigator.vibrate?.(150);
      } catch (err) {
        const body = err instanceof ApiError ? err.body : undefined;
        setResult({
          ok: false,
          title: err instanceof Error ? err.message : "Something went wrong",
          studentName: text(body?.studentName),
          eventTitle: text(body?.eventTitle),
        });
        navigator.vibrate?.([100, 80, 100]);
      }

      // Pause, then clear the screen and accept the next scan
      setTimeout(() => {
        setResult(null);
        busy.current = false;
      }, PAUSE_MS);
    }

    // html5-qrcode touches window/document, so load it in the browser only
    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (stopped) return;
      scanner = new Html5Qrcode("reader");
      started = scanner
        .start(
          { facingMode: "environment" }, // back camera
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => void handleScan(decodedText),
          () => undefined, // "no QR in this frame" fires constantly; ignore it
        )
        .catch(() =>
          setCameraError("Can't open the camera. Allow camera access for this site in your browser, then reload."),
        );
    });

    // Leaving the page: wait for the camera to finish starting, then turn it off
    return () => {
      stopped = true;
      started
        ?.then(() => scanner?.stop())
        .then(() => scanner?.clear())
        .catch(() => undefined);
    };
  }, [isVolunteer]);

  if (loading) return <PageState loading />;

  if (!isVolunteer) {
    return (
      <Notice
        icon={<ScanIcon className="size-5" />}
        title="Only volunteers can scan tickets"
        text="Log in with a volunteer account, for example volunteer1@festpass.test."
        action={
          <Link href="/login" className={buttonClass("primary")}>
            Log in
          </Link>
        }
      />
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <PageHeader title="Scan tickets" subtitle="Point the back camera at the QR code on a student's ticket." />

      <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-lg">
        {cameraError ? (
          <p role="alert" className="p-6 text-sm text-red-300">
            {cameraError}
          </p>
        ) : (
          <div id="reader" className="w-full" />
        )}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-5 py-4">
        <span className="flex items-center gap-2 text-sm text-zinc-600">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          Checked in on this device
        </span>
        <span className="text-2xl font-semibold tabular-nums text-zinc-950">{checkedIn}</span>
      </div>

      {result && <ResultScreen result={result} />}
    </main>
  );
}

// Full-screen green tick or red cross, readable at arm's length at the gate
function ResultScreen({ result }: { result: ScanResult }) {
  return (
    <div
      role="status"
      aria-live="assertive"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center px-6 text-center text-white ${
        result.ok ? "bg-emerald-600" : "bg-red-600"
      }`}
    >
      <div aria-hidden className="text-[9rem] font-bold leading-none">
        {result.ok ? "✓" : "✕"}
      </div>
      <p className="mt-6 text-3xl font-semibold">{result.title}</p>
      {result.studentName && <p className="mt-3 text-2xl">{result.studentName}</p>}
      {result.eventTitle && <p className="mt-1 text-lg text-white/80">{result.eventTitle}</p>}
    </div>
  );
}
