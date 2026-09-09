import Alert from "@mui/material/Alert";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import { formatDate } from "@/lib/format";
import DailyMilkForm from "./DailyMilkForm";

export const metadata = { title: "Daily Milk — Krishna Dairy" };

/** Local YYYY-MM-DD. toISOString() would roll back a day in IST. */
function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function DailyMilkPage({ searchParams }) {
  const params = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params?.date ?? "")
    ? params.date
    : todayLocal();

  const supabase = await createClient();

  const [{ data: customers, error }, { data: entries }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, mobile, daily_quantity, rate_per_liter")
      .eq("status", "active")
      .order("name"),
    supabase
      .from("milk_entries")
      .select("customer_id, actual_quantity, notes")
      .eq("date", date),
  ]);

  const entryByCustomer = new Map(
    (entries ?? []).map((e) => [e.customer_id, e]),
  );

  const rows = (customers ?? []).map((c) => ({
    ...c,
    entry: entryByCustomer.get(c.id) ?? null,
  }));

  return (
    <>
      <PageHeader
        title="Daily Milk"
        subtitle={`${formatDate(date)} — kone ketlu dudh apyu e nakho`}
      />

      {error ? (
        <Alert severity="error">
          Customers load na thai shakya: {error.message}
        </Alert>
      ) : (
        <DailyMilkForm date={date} customers={rows} />
      )}
    </>
  );
}
