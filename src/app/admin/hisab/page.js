import Alert from "@mui/material/Alert";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/all";
import { accountOf } from "@/lib/account";
import PageHeader from "@/components/PageHeader";
import { resolveRange, todayLocal } from "@/lib/range";
import BillingTable from "./BillingTable";
import { errorText } from "@/lib/format";

export const metadata = { title: "Billing" };

/**
 * What each customer owes, counted from the day after they last paid.
 *
 * This is how the book is actually kept. Somebody takes 35 L, pays for the
 * 35 L, and from that moment the 35 L is finished business — the next bill
 * starts the following morning. The screen used to go on showing the whole
 * month whatever had been paid inside it, so a settled customer still had
 * their milk and their money sitting in front of the dairy, and working out
 * what was really outstanding meant doing the subtraction by eye.
 *
 * So the figures here are not the span's. The span picks the day the
 * accounts are read *up to*, and which customers are worth listing; each
 * bill's own start is the day after that customer last paid, however many
 * months back that reaches. A debt does not expire because the month did.
 *
 * The arithmetic itself lives in @/lib/account, which the customer's own My
 * Billing reads from too — so the two sides can never disagree about what is
 * owed.
 */
async function fetchAccounts(supabase, from, to) {
  const [entries, payments] = await Promise.all([
    // Everything up to the end of the span, not just inside it: a bill that
    // opened in September is still owed in October.
    fetchAll(() =>
      supabase
        .from("milk_entries")
        .select(
          "customer_id, date, actual_quantity, total_amount, customers(name, mobile)",
        )
        .lte("date", to)
        .order("date"),
    ),
    fetchAll(() =>
      supabase
        .from("payments")
        .select("customer_id, amount, paid_on")
        .lte("paid_on", to)
        .order("paid_on"),
    ),
  ]);

  if (entries.error) return { rows: [], error: entries.error };

  // payments arrives in migration 0006. Until that is run the table is
  // missing, and the page should still show the milk side rather than blank.
  const paymentsMissing = Boolean(payments.error);

  const byCustomer = new Map();
  const of = (id) => {
    if (!byCustomer.has(id)) {
      byCustomer.set(id, {
        id,
        name: "—",
        mobile: "",
        entries: [],
        payments: [],
        inRange: false,
      });
    }
    return byCustomer.get(id);
  };

  for (const e of entries.data ?? []) {
    const c = of(e.customer_id);
    c.name = e.customers?.name ?? c.name;
    c.mobile = e.customers?.mobile ?? c.mobile;
    c.entries.push(e);
    if (e.date >= from && e.date <= to) c.inRange = true;
  }

  for (const p of payments.data ?? []) of(p.customer_id).payments.push(p);

  const rows = [...byCustomer.values()]
    .map((c) => {
      const a = accountOf(c.entries, c.payments);

      // The same unpaid milk, cut down to the span on the picker. October's
      // share of a three-month debt, for the screen's toggle — never for
      // the payment dialog, which has to go on offering the whole of it.
      let periodLiters = 0;
      let periodAmount = 0;

      for (const e of c.entries) {
        if (e.date < from || e.date > to) continue;
        if (e.date < a.since) continue;

        periodLiters += Number(e.actual_quantity ?? 0);
        periodAmount += Number(e.total_amount ?? 0);
      }

      return {
        id: c.id,
        customer_name: c.name,
        customer_mobile: c.mobile,
        inRange: c.inRange,
        // Since the day after the last payment. These two are what the
        // payment dialog reads, so they are always the whole debt.
        total_liters: a.liters,
        total_amount: a.amount,
        // The same thing inside the span, for the table's toggle only.
        period_liters: periodLiters,
        period_amount: periodAmount,
        since: a.since,
        due: a.due,
        last_paid_on: a.lastPaidOn,
        last_paid_amount: a.lastPaidAmount,
        last_paid_liters: a.lastPaidLiters,
      };
    })
    // Somebody with no milk this month but money still owed belongs on a page
    // about who owes what. Somebody with neither does not.
    .filter((r) => r.inRange || r.due > 0)
    .sort((a, b) => a.customer_name.localeCompare(b.customer_name));

  return { rows, paymentsMissing, error: null };
}

export default async function BillingPage({ searchParams }) {
  const params = await searchParams;

  // The span says which day the accounts are read up to, and whose accounts
  // are worth showing. Each bill's own start is the day after that customer
  // last paid — see fetchAccounts.
  const { mode, from, to, label, monthFrom, monthTo } = resolveRange(params);

  const supabase = await createClient();
  const { rows, paymentsMissing, error } = await fetchAccounts(
    supabase,
    from,
    to,
  );

  return (
    <>
      <PageHeader
        title="Billing & Payments"
        subtitle={`${label} — what each customer owes since they last paid`}
      />

      {error ? (
        <Alert severity="error">Could not load: {errorText(error)}</Alert>
      ) : (
        <>
          {paymentsMissing && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              The <strong>payments</strong> table is missing from the database,
              so payments cannot be recorded. The milk side is shown below.
            </Alert>
          )}

          <BillingTable
            mode={mode}
            from={from}
            to={to}
            monthFrom={monthFrom}
            monthTo={monthTo}
            rows={rows}
            today={todayLocal()}
          />
        </>
      )}
    </>
  );
}
