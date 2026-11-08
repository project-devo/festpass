// All in the viewer's own time zone, Indian English style
const dateTime = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});
const dayFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric" });
const monthFormat = new Intl.DateTimeFormat("en-IN", { month: "short" });
const timeFormat = new Intl.DateTimeFormat("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit" });

// e.g. "Fri, 14 Nov, 6:30 pm"
export function formatDateTime(iso: string) {
  return dateTime.format(new Date(iso));
}

// For the calendar chip on event cards: "14" and "NOV"
export function dayOfMonth(iso: string) {
  return dayFormat.format(new Date(iso));
}
export function monthShort(iso: string) {
  return monthFormat.format(new Date(iso)).toUpperCase();
}

// e.g. "Fri, 6:30 pm"
export function weekdayTime(iso: string) {
  return timeFormat.format(new Date(iso));
}
