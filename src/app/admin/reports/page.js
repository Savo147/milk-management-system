import Alert from "@mui/material/Alert";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/all";
import { paymentCover } from "@/lib/account";
import PageHeader from "@/components/PageHeader";
import { resolveRange } from "@/lib/range";
import ReportView from "./ReportView";
import { errorText } from "@/lib/format";

export const metadata = { title: "Reports" };

/**
 * Milk out and money in, per customer, for the period.
 *
 * This page is an account of a period, and it stays one — unlike Billing,
 * which answers "what is owed right now". Ask for March and the milk, the
 * money and the shortfall are March's: ₹2,500 billed, ₹2,500 received,
 * nothing due. Ask for April next and April starts again at its own ₹2,400.
 * That is the point of a report.
 *
 * What cannot be read off the period alone is which milk a payment was
 * *for*. Rs2,500 handed over in March usually settles February's milk, and
 * two columns depend on knowing that:
 *
 *   Due         was "amount minus received", which made March look settled
 *               the moment February's money arrived in it — March's own
 *               Rs2,400 vanished behind a payment that had nothing to do
 *               with it. It is now the milk of this period that came *after*
 *               the last payment, which is the milk nobody has paid for.
 *   Last payment  the litres behind it, counted from the payment before it
 *               rather than from the first of the month.
 *
 * Both rules live in @/lib/account, where Billing reads them too.
 */
async function buildReport(supabase, from, to) {
  // Everything up to the end of the period rather than only inside it. The
  // sums below still use the period's slice; the extra rows are there so a
  // payment made in March can say which milk it paid for, even when that
  // milk went out in February.
  const [entries, payments] = await Promise.all([
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

  if (entries.error) return { error: entries.error };

  const byCustomer = new Map();
  const of = (id) => {
    if (!byCustomer.has(id)) {
      byCustomer.set(id, {
        key: id,
        label: "—",
        sub: "",
        liters: 0,
        amount: 0,
        paid: 0,
        entries: [],
        payments: [],
        lastPaidOn: null,
        settledTo: null,
      });
    }
    return byCustomer.get(id);
  };

  for (const e of entries.data ?? []) {
    const row = of(e.customer_id);
    row.label = e.customers?.name ?? row.label;
    row.sub = e.customers?.mobile ?? row.sub;
    row.entries.push(e);

    if (e.date >= from && e.date <= to) {
      row.liters += Number(e.actual_quantity ?? 0);
      row.amount += Number(e.total_amount ?? 0);
    }
  }

  for (const p of payments.data ?? []) {
    // A payment from somebody with no milk at all is nobody's row to be on.
    if (!byCustomer.has(p.customer_id)) continue;

    const row = of(p.customer_id);
    row.payments.push(p);

    // The last payment of any date up to the end of the period. This is the
    // line everything before which is settled, and it may well have been
    // made before this period began.
    if (!row.settledTo || p.paid_on > row.settledTo) row.settledTo = p.paid_on;

    if (p.paid_on >= from && p.paid_on <= to) {
      row.paid += Number(p.amount ?? 0);
      // The last one inside the period, not the last one ever: a March
      // report should say what was paid in March.
      if (!row.lastPaidOn || p.paid_on > row.lastPaidOn) {
        row.lastPaidOn = p.paid_on;
      }
    }
  }

  const rows = [...byCustomer.values()]
    // A customer with no milk in the period has nothing to report on.
    .filter((row) => row.entries.some((e) => e.date >= from && e.date <= to))
    .map((row) => {
      const covered = paymentCover(row.entries, row.payments, row.lastPaidOn);

      // This period's milk that the last payment did not reach.
      let due = 0;
      let dueLiters = 0;

      for (const e of row.entries) {
        if (e.date < from || e.date > to) continue;
        if (row.settledTo && e.date <= row.settledTo) continue;

        due += Number(e.total_amount ?? 0);
        dueLiters += Number(e.actual_quantity ?? 0);
      }

      return {
        key: row.key,
        label: row.label,
        sub: row.sub,
        liters: row.liters,
        amount: row.amount,
        paid: row.paid,
        due,
        due_liters: dueLiters,
        last_paid_on: row.lastPaidOn,
        last_paid_amount: covered.amount,
        last_paid_liters: covered.liters,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  return { rows, error: null };
}

export default async function ReportsPage({ searchParams }) {
  const params = await searchParams;
  const { mode, from, to, label, monthFrom, monthTo } = resolveRange(params);

  const supabase = await createClient();
  const report = await buildReport(supabase, from, to);

  return (
    <>
      <PageHeader title="Reports" subtitle={label} />

      {report.error ? (
        <Alert severity="error">
          Could not build the report: {errorText(report.error)}
        </Alert>
      ) : (
        <ReportView
          mode={mode}
          from={from}
          to={to}
          monthFrom={monthFrom}
          monthTo={monthTo}
          rows={report.rows}
        />
      )}
    </>
  );
}
