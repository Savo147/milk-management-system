/**
 * When a day stops waiting to be filled in and counts as missed.
 *
 * A day with no entry is not the same as a day with nothing delivered — not
 * on the morning itself, anyway. The round is walked, the figures go in
 * afterwards, and for those few hours "nothing recorded" only means nobody
 * has got to it yet. So the Daily Milk page calls it **pending**.
 *
 * But that cannot be true forever. Left alone, a day the dairy simply forgot
 * to write up stays pending for good: it is on no missed list, in no total,
 * and two months later there is no way to tell it from a day that was
 * properly recorded. The customer got no milk and nothing anywhere says so.
 *
 * So a day is given 24 hours after it ends. Miss that, and an empty row is
 * taken at its word: no milk went out.
 *
 * Nothing is written to the database for this — it is worked out when the
 * screen is drawn. Three reasons:
 *
 *   Money does not move. A missed entry is 0 L at ₹0, which is exactly what
 *   no entry already bills, so there is nothing for a stored row to correct.
 *
 *   Writing one would be writing rows for a day nobody touched, for every
 *   customer, from a page load — and it could not be taken back by deleting
 *   them, because the next page load would put them straight back.
 *
 *   And it stays honest if the dairy fills the day in late: save the entry
 *   and the day reads correctly again, with nothing left over to clean up.
 */

/** A day is its own, plus a full day after it, before it counts. */
const GRACE_DAYS = 1;

/** YYYY-MM-DD, `days` before the given one. */
function minusDays(date, days) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * Has this day been over for 24 hours?
 *
 * On the 10th: the 8th is closed, the 9th still has today to be written up
 * in, and today is today.
 */
export function isDayClosed(date, today) {
  if (!date || !today) return false;
  return date <= minusDays(today, GRACE_DAYS + 1);
}

/**
 * What one customer's row says on one day.
 *
 * An entry speaks for itself. Without one it is "pending" while the day is
 * still open and "missed" once it has closed.
 */
export function rowStatus(entry, date, today, onLeave = false) {
  if (entry?.delivery_status) return entry.delivery_status;

  // A booked leave outranks both. Missed means the round should have reached
  // them and did not; on a day they asked to be skipped, nobody missed
  // anything. And the day is not pending either — there is nothing waiting
  // to be written up.
  if (onLeave) return "leave";

  return isDayClosed(date, today) ? "missed" : "pending";
}

/**
 * Days in a span that are closed, have no entry, and belong to this
 * customer — the ones that silently went unrecorded.
 *
 * `joinedOn` keeps the count honest: somebody added on the 20th was not
 * missed on the 19th, they were not a customer yet. It is the date part of
 * customers.created_at.
 *
 * `recorded` is the set of YYYY-MM-DD that do have an entry.
 */
export function unrecordedDays({
  from,
  to,
  today,
  joinedOn,
  recorded,
  leaves = [],
}) {
  const days = [];
  const start = joinedOn && joinedOn > from ? joinedOn : from;

  for (let d = start; d <= to; d = minusDays(d, -1)) {
    if (!isDayClosed(d, today)) break; // and every day after it is newer
    if (recorded.has(d)) continue;
    // Asked for, so not missed.
    if (leaves.some((l) => d >= l.from_date && d <= l.to_date)) continue;

    days.push(d);
  }

  return days;
}
