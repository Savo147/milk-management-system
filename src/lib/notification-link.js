import { DAIRY_TZ } from "@/lib/format";

/**
 * Where a notification goes when it is clicked.
 *
 * Two sides, and two kinds, so four answers.
 *
 * **A complaint** opens the complaint itself — `?report=` names it, so the
 * page lands on that thread rather than on a day's worth of rows. The date
 * matters as much as the side: the dairy's Problems page shows one day at a
 * time and the customer's a month, so opening either on today would hide the
 * very complaint that was tapped. Both are pointed at the day the
 * notification was written, read in the dairy's own timezone — one filed at
 * half past eleven at night belongs to that night, not to the next morning
 * in UTC.
 *
 * **A rate change** has no thread to open, so it goes to wherever the rate
 * can be seen: the dairy's Rates tab, or the customer's own milk details.
 */
export function problemHref(createdAt, isAdmin, reportId, type = "problem") {
  if (type === "rate") {
    return isAdmin
      ? "/admin/settings?tab=rates"
      : "/customer/profile?tab=my+milk+details";
  }

  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: DAIRY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(createdAt));

  const month = day.slice(0, 7);
  const base = isAdmin
    ? `/admin/problems?date=${day}`
    : `/customer/report-problem?mode=month&from=${month}&to=${month}`;

  return reportId ? `${base}&report=${reportId}` : base;
}
