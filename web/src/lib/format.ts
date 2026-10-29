// e.g. "Fri, 14 Nov, 6:30 pm" in the viewer's own time zone
const dateTime = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export function formatDateTime(iso: string) {
  return dateTime.format(new Date(iso));
}
