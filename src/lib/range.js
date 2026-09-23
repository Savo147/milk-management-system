import { formatDate, formatMonth } from "@/lib/format";

/**
 * Turning ?mode/?from/?to into one span of days.
 *
 * Every screen that filters by time — Hisab, Reports, Problems, and the
 * customer's own Milk and Hisab — asks the same question: which days. A month
 * is just a span from its first day to its last, so both picker modes end up
 * as a `from`/`to` pair and the queries downstream never have to care which
 * one was used.
 */

const pad = (n) => String(n).padStart(2, "0");
const isMonth = (v) => /^\d{4}-\d{2}$/.test(v ?? "");
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v ?? "");

export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** Local YYYY-MM-DD. toISOString() would roll back a day in IST. */
export function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
