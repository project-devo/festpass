import QRCode from "qrcode";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) throw new Error("RESEND_API_KEY is missing in api/.env");

const resend = new Resend(apiKey);

// Resend's test sender works without your own domain
const from = process.env.EMAIL_FROM ?? "FestPass <onboarding@resend.dev>";

// Demo mode: without a domain, Resend only delivers to your own address.
// If TICKET_EMAIL_TO is set, every ticket goes there instead of the student's email.
const overrideTo = process.env.TICKET_EMAIL_TO;

export type TicketEmail = {
  to: string;
  name: string;
  eventTitle: string;
  venue: string;
  startsAt: Date;
  qrToken: string;
};

export async function sendTicketEmail(t: TicketEmail): Promise<string> {
  // Same signed token the My tickets page shows, drawn as a PNG on the server
  const qrPng = await QRCode.toBuffer(t.qrToken, { width: 400, margin: 2 });

  const when = t.startsAt.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px">
      <h2>Your FestPass ticket</h2>
      <p>Hi ${escapeHtml(t.name)}, you're booked for <b>${escapeHtml(t.eventTitle)}</b>.</p>
      <p>${escapeHtml(t.venue)}<br>${when}</p>
      <p>Show this QR code at the gate:</p>
      <img src="cid:ticket-qr" width="240" height="240" alt="Ticket QR code">
      <p style="color: #666; font-size: 12px">Demo deployment with seeded data. Sent to ${escapeHtml(t.to)}.</p>
    </div>`;

  const { data, error } = await resend.emails.send({
    from,
    to: overrideTo ?? t.to,
    subject: `Your ticket: ${t.eventTitle}`,
    html,
    // contentId lets the HTML show it inline; it's also a normal attachment
    attachments: [{ filename: "ticket.png", content: qrPng, contentId: "ticket-qr" }],
  });

  // Resend doesn't throw on a failed send, it returns { error }. Throw so pg-boss retries.
  if (error) throw new Error(`Resend failed: ${error.name}: ${error.message}`);
  return data.id;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
