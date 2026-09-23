import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import { formatAmount, formatLiters } from "@/lib/format";
import { resolveRange, todayLocal } from "@/lib/range";
import BillingTable from "./BillingTable";

export const metadata = { title: "Billing — Krishna Dairy" };

/**
 * Milk delivered and money received, per customer, for one span of days.
 *
 * Both sides are read from dated rows — milk_entries and payments — so any
 * span answers the same way, and a month is nothing more than a span from its
 * first day to its last. While payments lived on a month's bill instead, a
 * range that crossed months had no honest answer at all.
 */
async function fetchRange(supabase, from, to) {
  const [entries, payments, latest] = await Promise.all([
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
    // Not limited to the span: "when did this customer last pay me" is worth
    // knowing precisely when the answer is before the period being viewed.
    supabase
      .from("payments")
      .select("customer_id, paid_on")
      .order("paid_on", { ascending: false }),
  ]);

  if (entries.error) return { rows: [], error: entries.error };

  // payments arrives in migration 0006. Until that is run the table is
  // missing, and the page should still show the milk side rather than blank.
  const paymentsMissing = Boolean(payments.error);

  const byCustomer = new Map();
  for (const e of entries.data ?? []) {
    const row = byCustomer.get(e.customer_id) ?? {
      id: e.customer_id,
      customer_name: e.customers?.name ?? "—",
      customer_mobile: e.customers?.mobile ?? "",
      total_liters: 0,
      total_amount: 0,
      received_amount: 0,
      last_paid_on: null,
    };
    row.total_liters += Number(e.actual_quantity ?? 0);
    row.total_amount += Number(e.total_amount ?? 0);
    byCustomer.set(e.customer_id, row);
  }

  for (const p of payments.data ?? []) {
    const row = byCustomer.get(p.customer_id);
    if (row) row.received_amount += Number(p.amount ?? 0);
  }

  // Rows come newest first, so the first one seen for a customer is theirs.
  for (const p of latest.data ?? []) {
    const row = byCustomer.get(p.customer_id);
    if (row && !row.last_paid_on) row.last_paid_on = p.paid_on;
  }

  const rows = [...byCustomer.values()].sort((a, b) =>
    a.customer_name.localeCompare(b.customer_name),
  );

  return { rows, paymentsMissing, error: null };
}

function Summary({ label, value, color = "text.primary" }) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        <Typography
          variant="caption"
          sx={{ color: "text.secondary", fontWeight: 600 }}
        >
          {label}
        </Typography>
        <Typography
          variant="h5"
          sx={{ mt: 0.5, color, fontVariantNumeric: "tabular-nums" }}
        >
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default async function BillingPage({ searchParams }) {
  const params = await searchParams;

  // Both pickers resolve to the same thing: a span of days. Milk and payments
  // are dated, so the span is all the query needs.
  const { mode, from, to, label, monthFrom, monthTo } = resolveRange(params);

  const supabase = await createClient();
  const { rows, paymentsMissing, error } = await fetchRange(supabase, from, to);

  const liters = rows.reduce((t, r) => t + Number(r.total_liters), 0);
  const total = rows.reduce((t, r) => t + Number(r.total_amount), 0);
  const received = rows.reduce((t, r) => t + Number(r.received_amount), 0);
  // Paying a span in full and then looking at a later span leaves payments
  // ahead of the milk. Nothing is owed then — a negative "Due" would just
  // read as broken.
  const baki = Math.max(0, total - received);

  return (
    <>
      <PageHeader
        title="Billing & Payments"
        subtitle={`${label} — every customer's account`}
      />

      {error ? (
        <Alert severity="error">Could not load: {error.message}</Alert>
      ) : (
        <>
          {paymentsMissing && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              The <strong>payments</strong> table is missing from the database,
              so payments cannot be recorded. The milk side is shown below.
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, md: 4 }}>
              <Summary label="Total amount" value={formatAmount(total)} />
            </Grid>
            <Grid size={{ xs: 6, md: 4 }}>
              <Summary label="Total milk" value={formatLiters(liters)} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Summary
                label="Due"
                value={formatAmount(baki)}
                color={baki > 0 ? "warning.dark" : "text.secondary"}
              />
            </Grid>
          </Grid>

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
