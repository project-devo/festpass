"use client";

import { useEffect, useState } from "react";
import { toDataURL } from "qrcode";

// Draws the signed ticket token as a QR code.
// It runs in the browser, so the API only has to send the short token text, not an image.
export function TicketQr({ token, size = 200 }: { token: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let stale = false; // set when the token changes or the card unmounts, so an old result is ignored

    // width is doubled so the code stays sharp on phone screens
    toDataURL(token, { width: size * 2, margin: 1, errorCorrectionLevel: "M" })
      .then((url) => {
        if (!stale) setSrc(url);
      })
      .catch(() => {
        if (!stale) setFailed(true);
      });

    return () => {
      stale = true;
    };
  }, [token, size]);

  if (failed) {
    return <p className="text-sm text-red-600">Couldn&apos;t draw the QR code. Reload the page.</p>;
  }

  if (!src) {
    return <div className="animate-pulse rounded-lg bg-slate-100" style={{ width: size, height: size }} />;
  }

  // A plain img on purpose: src is a data: URL, so there is nothing for next/image to optimise
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="Ticket QR code" width={size} height={size} className="rounded-lg bg-white" />;
}
