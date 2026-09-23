import Alert from "@mui/material/Alert";
import { createClient } from "@/lib/supabase/server";
import { requireCustomerAccount } from "@/lib/auth";
import { resolveRange } from "@/lib/range";
import PageHeader from "@/components/PageHeader";
import NotLinked from "@/components/NotLinked";
import MyBillingView from "./MyBillingView";

export const metadata = { title: "My Billing — Krishna Dairy" };

const sum = (rows, key) =>
  (rows ?? []).reduce((t, r) => t + Number(r[key] ?? 0), 0);

export default async function MyBillingPage({ searchParams }) {
  const { customer } = await requireCustomerAccount();
  const params = await searchParams;
  const { mode, from, to, label, monthFrom, monthTo } = resolveRange(params);

  if (!customer) {
    return (
      <>
        <PageHeader title="My Billing" />
        <NotLinked />
      </>
    );
  }

  const supabase = await createClient();

  // Milk and money are both dated rows, so one span answers both sides — the
  // same shape the admin's Billing uses, narrowed to this one customer.
  const [entries, payments, allMilk, allPaid] = await Promise.all([
    supabase
      .from("milk_entries")
      .select("date, actual_quantity, total_amount")
      .eq("customer_id", customer.id)
      .gte("date", from)
      .lte("date", to),
    supabase
      .from("payments")
      .select("id, amount, paid_on, note")
      .eq("customer_id", customer.id)
      .gte("paid_on", from)
      .lte("paid_on", to)
      .order("paid_on", { ascending: false }),
    // All-time, so "kul baki" is the real outstanding figure rather than this
    // period's slice of it.
    supabase
      .from("milk_entries")
      .select("total_amount")
      .eq("customer_id", customer.id),
    supabase
      .from("payments")
      .select("amount, paid_on")
      .eq("customer_id", customer.id)
      .order("paid_on", { ascending: false }),
  ]);

  const error = entries.error ?? payments.error;

  const billed = sum(entries.data, "total_amount");
  const received = sum(payments.data, "amount");

  const totalBilled = sum(allMilk.data, "total_amount");
  const totalPaid = sum(allPaid.data, "amount");

  return (
    <>
      <PageHeader
        title="My Billing"
        subtitle={`${label} — milk charges and payments made`}
      />

      {error ? (
        <Alert severity="error">
          Could not load your billing: {error.message}
        </Alert>
      ) : (
        <MyBillingView
          mode={mode}
          from={from}
          to={to}
          monthFrom={monthFrom}
          monthTo={monthTo}
          liters={sum(entries.data, "actual_quantity")}
          billed={billed}
          received={received}
          // Paying ahead leaves payments above the milk; a negative figure
          // would just read as broken.
          baki={Math.max(0, billed - received)}
          totalDue={Math.max(0, totalBilled - totalPaid)}
          lastPaidOn={allPaid.data?.[0]?.paid_on ?? null}
          payments={payments.data ?? []}
          days={entries.data?.length ?? 0}
        />
      )}
    </>
  );
}
