"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/components/session";
import { PageState } from "@/components/ui";

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
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="font-medium text-slate-900">Only volunteers can scan tickets</p>
        <p className="mt-1 text-sm text-slate-600">Log in with a volunteer account, for example volunteer1@festpass.test.</p>
        <Link href="/login" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500">
          Log in
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Scan tickets</h1>
      <p className="mt-1 text-sm text-slate-600">Point the back camera at the QR code on a student&apos;s ticket.</p>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {cameraError ? (
          <p role="alert" className="p-6 text-sm text-red-700">
            {cameraError}
          </p>
        ) : (
          <div id="reader" className="w-full" />
        )}
      </div>

      <p className="mt-4 text-center text-sm text-slate-600">
        Checked in on this device: <span className="font-medium text-slate-900">{checkedIn}</span>
      </p>

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
