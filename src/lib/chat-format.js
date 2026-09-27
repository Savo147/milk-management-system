/** Shared wording for the chat: times, day headings and list previews. */

/** "14:32" — inside one thread the clock is all the detail anyone needs. */
export function clock(value) {
  if (!value) return "";

  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** "now", "5m", "3h", "2d", "4w", "1y" — the age, in the narrowest form. */
export function ago(value) {
  if (!value) return "";

  const secs = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);

  // Largest unit that fits, so a two-month-old thread reads "9w" rather than
  // a number of hours nobody is going to count.
  for (const [suffix, size] of [
    ["y", 31536000],
    ["w", 604800],
    ["d", 86400],
    ["h", 3600],
    ["m", 60],
  ]) {
    const n = Math.floor(secs / size);
    if (n >= 1) return `${n}${suffix}`;
  }

  return "now";
}

/** "Today", "Yesterday", or the date, as the separator between days. */
export function dayLabel(value) {
  const a = new Date(value);
  const b = new Date();
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);

  const days = Math.round((b - a) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** The one line a conversation list shows under the name. */
export function preview(thread) {
  if (!thread?.last) return "No messages yet";
  return `${thread.lastMine ? "You: " : ""}${thread.last}`;
}
