import { DAIRY_TZ } from "@/lib/format";

/**
 * Where a problem notification goes when it is clicked.
 *
 * The two sides have different screens for the same complaint, and the date
 * matters as much as the side: the dairy's Problems page shows one day at a
 * time and the customer's a month, so opening either on today would hide the
 * very complaint that was tapped. Both are pointed at the day the
 * notification was written, read in the dairy's own timezone — a complaint
 * filed at half past eleven at night belongs to that night, not to the next
 * morning in UTC.
 *
 * `reportId` is the complaint itself, carried through as `?report=` so the
 * page opens straight onto that thread instead of leaving it to be found in
 * a day's worth of rows. Notifications written before the id was stored have
 * none, and those still land on the right day.
 *
 * Shared by the bell and the full list so the two can never drift apart.
 */
export function problemHref(createdAt, isAdmin, reportId) {
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
