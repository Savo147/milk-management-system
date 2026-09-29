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

/**
 * A rate, without the pennies nobody wrote: 55 reads as ₹55, 62.50 still
 * reads as ₹62.50.
 *
 * Only for a rate. A total keeps its two decimals — money owed is money
 * owed, and a bill that says ₹1,250 where the sum was ₹1,250.50 is wrong in
 * a way nobody would notice until it mattered.
 */
export function formatRate(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  const n = Number(value);

  return n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
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

/**
 * A database error in words the dairy can act on.
 *
 * The raw ones are written for whoever wrote the driver: "TimeoutError: The
 * operation was aborted due to timeout" says nothing about what to do, and on
 * a connection that drops it is the message people see most. Anything not
 * recognised is passed through — an unfamiliar fault is worth reading, even
 * awkwardly worded.
 */
export function errorText(error) {
  const message = error?.message ?? "";

  if (
    /timeout|aborted|fetch failed|network|ENOTFOUND|ECONNRESET/i.test(message)
  ) {
    return "the server could not be reached. Check the connection and reload.";
  }
  if (
    /JWT|not authorized|permission denied|row-level security/i.test(message)
  ) {
    return "you are not allowed to see this. Try signing in again.";
  }

  return message;
}
