/**
 * The dairy's clock, everywhere.
 *
 * Locally the server runs on IST and none of this shows; on Vercel it runs on
 * UTC, and "today" would then flip at half past five in the morning — an entry
 * made at 1am would be filed under yesterday, and the customer's dashboard
 * would greet them good night over breakfast. Pinning the zone makes the app
 * read the same date the dairy does, wherever it happens to be running.
 */
export const DAIRY_TZ = "Asia/Kolkata";

const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function formatAmount(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return rupees.format(Number(value));
}

export function formatLiters(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  // 2.5 L, not 2.50 L — quantities always land on 0.5 steps.
  return `${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })} L`;
}

export function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    timeZone: DAIRY_TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatMonth(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    timeZone: DAIRY_TZ,
    month: "long",
    year: "numeric",
  });
}
