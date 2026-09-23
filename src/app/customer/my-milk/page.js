import Alert from "@mui/material/Alert";
import { createClient } from "@/lib/supabase/server";
import { requireCustomerAccount } from "@/lib/auth";
import { resolveRange } from "@/lib/range";
import PageHeader from "@/components/PageHeader";
import NotLinked from "@/components/NotLinked";
import MyMilkView from "./MyMilkView";

export const metadata = { title: "My Milk — Krishna Dairy" };

export default async function MyMilkPage({ searchParams }) {
  const { customer } = await requireCustomerAccount();
  const params = await searchParams;
  const { mode, from, to, label, monthFrom, monthTo } = resolveRange(params);

  if (!customer) {
    return (
      <>
        <PageHeader title="My Milk" />
        <NotLinked />
      </>
    );
  }

  const supabase = await createClient();

  const { data: entries, error } = await supabase
    .from("milk_entries")
    .select(
      "id, date, expected_quantity, actual_quantity, rate_per_liter, total_amount, delivery_status",
    )
    .eq("customer_id", customer.id)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false });

  return (
    <>
      <PageHeader
        title="My Milk"
        subtitle={`${label} — roj ketlu dudh malyu`}
      />

      {error ? (
        <Alert severity="error">
          Dudh no hisab load na thayo: {error.message}
        </Alert>
      ) : (
        <MyMilkView
          entries={entries ?? []}
          mode={mode}
          from={from}
          to={to}
          monthFrom={monthFrom}
          monthTo={monthTo}
        />
      )}
    </>
  );
}
