import Alert from "@mui/material/Alert";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import { resolveRange } from "@/lib/range";
import ReportView from "./ReportView";

export const metadata = { title: "Reports" };

/** Milk out and money in, per customer, for the period. */
async function buildReport(supabase, from, to) {
  const [entries, payments] = await Promise.all([
    supabase
      .from("milk_entries")
      .select(
        "customer_id, actual_quantity, total_amount, customers(name, mobile)",
      )
      .gte("date", from)
      .lte("date", to),
    supabase
      .from("payments")
      .select("customer_id, amount")
      .gte("paid_on", from)
      .lte("paid_on", to),
  ]);

  if (entries.error) return { error: entries.error };

  const paidBy = new Map();
  for (const p of payments.data ?? []) {
    paidBy.set(
      p.customer_id,
      (paidBy.get(p.customer_id) ?? 0) + Number(p.amount ?? 0),
    );
  }

  const byCustomer = new Map();
  for (const e of entries.data ?? []) {
    const row = byCustomer.get(e.customer_id) ?? {
      key: e.customer_id,
      label: e.customers?.name ?? "—",
      sub: e.customers?.mobile ?? "",
      liters: 0,
      amount: 0,
    };

    row.liters += Number(e.actual_quantity ?? 0);
    row.amount += Number(e.total_amount ?? 0);
    byCustomer.set(e.customer_id, row);
  }

  for (const row of byCustomer.values()) {
    row.paid = paidBy.get(row.key) ?? 0;
    row.baki = Math.max(0, row.amount - row.paid);
  }

  const rows = [...byCustomer.values()].sort((a, b) =>
    a.label.localeCompare(b.label),
  );

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
          Could not build the report: {report.error.message}
        </Alert>
      ) : (
        <ReportView
          mode={mode}
          from={from}
          to={to}
          monthFrom={monthFrom}
          monthTo={monthTo}
          label={label}
          rows={report.rows}
        />
      )}
    </>
  );
}
