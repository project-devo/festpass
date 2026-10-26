import {sql } from "drizzle-orm";
import { check, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["student", "organiser", "volunteer"]);
    
export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull().default("student"),
    createdAt: timestamp("created_at",{ withTimezone: true }).notNull().defaultNow(),
});

export const events = pgTable(
    "events",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        title: text("title").notNull(),
        venue: text("venue").notNull(),
        startsAt: timestamp("starts_at", {withTimezone: true}).notNull(),
        capacity: integer("capacity").notNull(),
        seatsLeft: integer("seats_left").notNull(),
        organiserId: uuid("organiser_id").notNull().references(() => users.id),
        createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
    },
    (t) => [
        check("seats_left_not_negative", sql`${t.seatsLeft} >= 0`),
        check("seats_left_within_capacity", sql`${t.seatsLeft} <= ${t.capacity}`),
    ],


);

export const bookingStatus = pgEnum("booking_status", ["confirmed", "cancelled"]);

export const bookings = pgTable(
    "bookings",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id").notNull().references(() => users.id),
        eventId: uuid("event_id").notNull().references(() => events.id),
        status: bookingStatus("status").notNull().default("confirmed"),
        qrToken: text("qr_token").notNull().unique(),
        createdAt: timestamp("created_at", {withTimezone: true}).notNull().defaultNow(),
    },
    (t) => [
        uniqueIndex("one_active_booking_per_user").on(t.userId, t.eventId).where(sql`${t.status} = 'confirmed'`)
    ],
);


export const checkins = pgTable("checkins", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id")
    .notNull()
    .unique()
    .references(() => bookings.id),
  scannedBy: uuid("scanned_by")
    .notNull()
    .references(() => users.id),
  scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
});





