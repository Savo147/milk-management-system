/**
 * One customer's account, read the way a dairy actually keeps it.
 *
 * The book is not a month, and it is not a running ledger either. It is a
 * line drawn on the day money changes hands: paying settles everything up to
 * that day — hisab chukta — and the next bill opens the following morning
 * with nothing on it. From then on it grows a day at a time as the milk goes
 * out, and it stops growing the next time they pay.
 *
 * So what is owed is simply the milk delivered since the last payment. Not
 * "everything billed minus everything paid": that keeps old arithmetic alive
 * behind a bill both sides have already shaken hands on, and puts a figure on
 * the screen that neither of them recognises.
 *
 * The dairy's Billing page, both dashboards and the customer's own My Billing
 * all read from here, so no two screens can disagree about what is owed.
 */

/**
 * Where a bill starts for somebody who has never paid at all: the beginning.
 * Nothing has been settled, so nothing is written off — their whole account
 * is outstanding, and clipping it at the month being viewed would quietly
 * leave the older half out.
 */
export const BEGINNING = "1900-01-01";

/** The day after a given one, as YYYY-MM-DD. */
export function nextDay(date) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

const num = (v) => Number(v ?? 0);

/**
 * Works out one customer's account from their rows.
 *
 * `entries` are milk_entries ({ date, actual_quantity, total_amount }) and
 * `payments` are payments ({ paid_on, amount }). Both must already be cut
 * down to this one customer, and both must reach back as far as the records
 * go — a customer who has never paid owes for every day there has ever been,
 * and handing in only this month's rows would answer a different question
 * convincingly.
 *
 * Order does not matter; nothing here assumes it.
 */
/** The latest payment on or before `limit`, or the latest of all. */
function latestPaidOn(payments, limit = null) {
  let latest = null;

  for (const p of payments) {
    if (!p.paid_on) continue;
    if (limit && p.paid_on >= limit) continue;
    if (!latest || p.paid_on > latest) latest = p.paid_on;
  }

  return latest;
}

/**
 * What one payment settled: the money, and the milk it was for.
 *
 * "₹2,500 nu 35 L" — the sentence a dairy says. The 35 L is the milk from
 * the morning after the payment before it up to and including the day of
 * this one, which is exactly the stretch this payment closed.
 *
 * `paidOn` is a day, not a row: two payments handed over on the same day are
 * one payment as far as the book cares, so they are added together.
 *
 * `payments` must reach back past `paidOn` — the payment before it is what
 * decides where its stretch begins, and it may well be in another month.
 */
export function paymentCover(entries = [], payments = [], paidOn = null) {
  if (!paidOn) return { amount: 0, liters: 0, from: null };

  const before = latestPaidOn(payments, paidOn);

  const amount = payments
    .filter((p) => p.paid_on === paidOn)
    .reduce((t, p) => t + num(p.amount), 0);

  let liters = 0;
  for (const e of entries) {
    if (e.date <= paidOn && (!before || e.date > before)) {
      liters += num(e.actual_quantity);
    }
  }

  return { amount, liters, from: before ? nextDay(before) : null };
}

export function accountOf(entries = [], payments = []) {
  const lastPaidOn = latestPaidOn(payments);

  // The first day of the bill that is open now.
  const since = lastPaidOn ? nextDay(lastPaidOn) : BEGINNING;

  // What that last payment was for — the same question the Reports page
  // asks of a payment in the middle of a period, so it is asked in one place.
  const covered = paymentCover(entries, payments, lastPaidOn);

  let liters = 0;
  let amount = 0;

  for (const e of entries) {
    // Everything from `since` onwards is not paid for yet. This, and only
    // this, is what they owe.
    if (e.date >= since) {
      liters += num(e.actual_quantity);
      amount += num(e.total_amount);
    }
  }

  return {
    /** First day of the open bill. BEGINNING when they have never paid. */
    since,
    /** Milk since that day, and what it comes to. */
    liters,
    amount,
    /** What is owed. The same figure as `amount`, said out loud. */
    due: amount,
    /** The last payment: when, how much, and how much milk it covered. */
    lastPaidOn,
    lastPaidAmount: covered.amount,
    lastPaidLiters: covered.liters,
  };
}
