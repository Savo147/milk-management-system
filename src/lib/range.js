import { DAIRY_TZ, formatDate, formatMonth } from "@/lib/format";

/**
 * Turning ?mode/?from/?to into one span of days.
 *
 * Every screen that filters by time — Billing, Reports, Problems, and the
 * customer's own Milk and Billing — asks the same question: which days. A month
 * is just a span from its first day to its last, so both picker modes end up
 * as a `from`/`to` pair and the queries downstream never have to care which
 * one was used.
 */

const pad = (n) => String(n).padStart(2, "0");
const isMonth = (v) => /^\d{4}-\d{2}$/.test(v ?? "");
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v ?? "");

/** YYYY-MM in the dairy's own timezone. */
export function currentMonth() {
  return todayLocal().slice(0, 7);
}

/**
 * Today as YYYY-MM-DD, read off the dairy's clock rather than the server's.
 *
 * en-CA formats as YYYY-MM-DD, which is exactly the shape the date columns
 * and the ?date= params want, so there is nothing to reassemble by hand.
 */
export function todayLocal() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DAIRY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function monthStart() {
  return `${currentMonth()}-01`;
}

/** Last day of a YYYY-MM month. */
export function monthEnd(month) {
  const [y, m] = month.split("-").map(Number);
  return `${month}-${pad(new Date(y, m, 0).getDate())}`;
}

/**
 * @param params the resolved searchParams object
 * @returns {{mode, from, to, label, monthFrom, monthTo}}
 *
 * The month pair is carried even in date mode, so switching the picker back
 * lands somewhere sane instead of jumping to today.
 */
export function resolveRange(params) {
  const mode = params?.mode === "date" ? "date" : "month";

  if (mode === "date") {
    const to = isDate(params?.to) ? params.to : todayLocal();
    const start = isDate(params?.from) ? params.from : monthStart();
    // A start after the end would return nothing at all; clamp it instead.
    const from = start > to ? to : start;

    return {
      mode,
      from,
      to,
      label: `${formatDate(from)} – ${formatDate(to)}`,
      monthFrom: from.slice(0, 7),
      monthTo: to.slice(0, 7),
    };
  }

  const monthTo = isMonth(params?.to) ? params.to : currentMonth();
  const fromRaw = isMonth(params?.from) ? params.from : monthTo;
  const monthFrom = fromRaw > monthTo ? monthTo : fromRaw;

  const from = `${monthFrom}-01`;
  const to = monthEnd(monthTo);

  return {
    mode,
    from,
    to,
    label:
      monthFrom === monthTo
        ? formatMonth(from)
        : `${formatMonth(from)} – ${formatMonth(`${monthTo}-01`)}`,
    monthFrom,
    monthTo,
  };
}

/**
 * The dairy's clock, written the way Postgres wants to read it.
 *
 * Asia/Kolkata is a fixed +05:30 all year — India has no daylight saving — so
 * the offset can be written down rather than worked out.
 */
const DAIRY_OFFSET = "+05:30";

/**
 * One calendar day, as the two instants that bound it.
 *
 * `created_at` is an instant, not a date. Asking for it between
 * "2026-10-01T00:00:00" and "2026-10-01T23:59:59.999" with no offset hands
 * Postgres two *UTC* moments, so the window it actually searched ran from
 * half past five on the morning of the 1st to half past five on the morning
 * of the 2nd, in the dairy's own time.
 *
 * Everything on screen is formatted in the dairy's timezone, so a complaint
 * filed at two in the morning on the 2nd was listed under the 1st and then
 * printed as "02 Oct 2026" on its own row — the page disagreeing with itself.
 *
 * With the offset attached, the window is the day the dairy means.
 */
export const dayStart = (date) => `${date}T00:00:00${DAIRY_OFFSET}`;
export const dayEnd = (date) => `${date}T23:59:59.999${DAIRY_OFFSET}`;
