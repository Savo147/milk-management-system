import Alert from "@mui/material/Alert";
import { createClient } from "@/lib/supabase/server";
import { fetchAll } from "@/lib/supabase/all";
import { accountOf } from "@/lib/account";
import { requireCustomerAccount } from "@/lib/auth";
import { resolveRange } from "@/lib/range";
import PageHeader from "@/components/PageHeader";
import NotLinked from "@/components/NotLinked";
import MyBillingView from "./MyBillingView";
import { errorText } from "@/lib/format";

export const metadata = { title: "My Billing" };

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
      .select("id, amount, paid_on")
      .eq("customer_id", customer.id)
      .gte("paid_on", from)
      .lte("paid_on", to)
      .order("paid_on", { ascending: false }),
    // All-time, and with the dates on them. "Kul baki" is a running figure,
    // not this period's slice — and the same rows answer what the last
    // payment settled and what has come since.
    fetchAll(() =>
      supabase
        .from("milk_entries")
        .select("date, actual_quantity, total_amount")
        .eq("customer_id", customer.id)
        .order("date"),
    ),
    fetchAll(() =>
      supabase
        .from("payments")
        .select("amount, paid_on")
        .eq("customer_id", customer.id)
        .order("paid_on"),
    ),
  ]);

  const error = entries.error ?? payments.error;

  const billed = sum(entries.data, "total_amount");
  const received = sum(payments.data, "amount");

  // The account proper: measured from the day after the last payment, the
  // same way the dairy's own Billing page measures it.
  const account = accountOf(allMilk.data ?? [], allPaid.data ?? []);

  return (
    <>
      <PageHeader
        title="My Billing"
        subtitle={`${label} — milk charges and payments made`}
      />

      {error ? (
        <Alert severity="error">
          Could not load your billing: {errorText(error)}
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
          totalDue={account.due}
          since={account.since}
          sinceLiters={account.liters}
          sinceAmount={account.amount}
          lastPaidOn={account.lastPaidOn}
          lastPaidAmount={account.lastPaidAmount}
          lastPaidLiters={account.lastPaidLiters}
          payments={payments.data ?? []}
          days={entries.data?.length ?? 0}
        />
      )}
    </>
  );
}
