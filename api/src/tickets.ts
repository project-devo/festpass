import { createHmac } from "node:crypto";


const qrSecret = process.env.QR_SECRET;

if(!qrSecret) {
    throw new Error("QR_SECRET is missing in api/.env");
}


// Ticket token = booking id + "." + HMAC-SHA256 of that id.
// Only the server knows QR_SECRET, so nobody can make a valid token for a booking that doesn't exist.

export const signTicket = (bookingId: string): string => {
    const signature = createHmac("sha256", qrSecret).update(bookingId).digest("base64url");
    return `${bookingId}.${signature}`;
}
