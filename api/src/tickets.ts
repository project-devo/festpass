import { createHmac, timingSafeEqual } from "node:crypto";

const qrSecret = process.env.QR_SECRET;

if (!qrSecret) {
  throw new Error("QR_SECRET is missing in api/.env");
}

// HMAC-SHA256 of the booking id, as URL-safe base64
const sign = (bookingId: string): string =>
  createHmac("sha256", qrSecret).update(bookingId).digest("base64url");

// Ticket token = booking id + "." + signature.
// Only the server knows QR_SECRET, so nobody can make a valid token for a booking that doesn't exist.
export const signTicket = (bookingId: string): string => `${bookingId}.${sign(bookingId)}`;

// Returns the booking id if the token was signed by us, otherwise null.
export const verifyTicket = (token: string): string | null => {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const bookingId = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(sign(bookingId));

  // timingSafeEqual needs equal lengths, and takes the same time whether it matches or not
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return bookingId;
};