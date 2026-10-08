import { todayLocal } from "@/lib/range";

/**
 * Raja — the days a customer has told the dairy not to come.
 *
 * Held as spans rather than a row per day: "the 5th to the 12th" is one
 * decision somebody made, and cancelling it should be one tap rather than
 * eight. Everything below works on those spans.
 *
 * A leave day is not a missed day, and that is the whole point of the
 * feature. Missed means the round should have reached them and did not; a
 * leave means nobody was expecting it. The money is the same either way —
 * no entry, nothing billed — so what this changes is what the screens say,
 * which is what somebody looking at them is trying to find out.
 */

/** Does this leave cover that day? Both ends included. */
export const covers = (leave, date) =>
  date >= leave.from_date && date <= leave.to_date;

/** The leave covering a day, out of a list, or null. */
export const leaveOn = (leaves, date) =>
  (leaves ?? []).find((l) => covers(l, date)) ?? null;

/**
 * Leaves by customer, for the screens that hold a list of customers and ask
 * the question once per row.
 */
export function byCustomer(leaves) {
  const map = new Map();

  for (const l of leaves ?? []) {
    if (!map.has(l.customer_id)) map.set(l.customer_id, []);
    map.get(l.customer_id).push(l);
  }

  return map;
}

/**
 * Where a leave stands against today: on now, still to come, or over.
 *
 * Sorting by this rather than by date is what makes the dairy's list useful:
 * who is away this morning comes first, then who is going, and what is
 * finished sinks to the bottom.
 */
export function leaveState(leave, today = todayLocal()) {
  if (leave.to_date < today) return "past";
  if (leave.from_date > today) return "upcoming";
  return "current";
}

const ORDER = { current: 0, upcoming: 1, past: 2 };

/** Current first, then the soonest to start, then the most recently over. */
export function sortLeaves(leaves, today = todayLocal()) {
  return [...(leaves ?? [])].sort((a, b) => {
    const byState = ORDER[leaveState(a, today)] - ORDER[leaveState(b, today)];
    if (byState !== 0) return byState;

    return leaveState(a, today) === "past"
      ? b.to_date.localeCompare(a.to_date)
      : a.from_date.localeCompare(b.from_date);
  });
}

/** How many days a span covers, both ends counted. */
export function lengthInDays(leave) {
  const a = Date.parse(`${leave.from_date}T00:00:00Z`);
  const b = Date.parse(`${leave.to_date}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000) + 1;
}

/**
 * Does a new span run into one already booked?
 *
 * Two overlapping leaves are not wrong so much as pointless — the days are
 * off either way — but they read as a mistake on the dairy's list, and the
 * person booking the second one has usually forgotten the first.
 */
export const overlaps = (leaves, from, to) =>
  (leaves ?? []).find((l) => from <= l.to_date && to >= l.from_date) ?? null;
