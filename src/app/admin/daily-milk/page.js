import Alert from "@mui/material/Alert";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import { formatDate, errorText } from "@/lib/format";
import DailyMilkForm from "./DailyMilkForm";

export const metadata = { title: "Daily Milk" };

/** Local YYYY-MM-DD. toISOString() would roll back a day in IST. */
function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function DailyMilkPage({ searchParams }) {
  const params = await searchParams;
  // Today at the latest. The picker says so too, but ?date= is only a URL —
  // typed, bookmarked, or arrived at with a back button — and a day that has
  // not happened yet has nothing to record and nothing to show.
  const today = todayLocal();
  const asked = /^\d{4}-\d{2}-\d{2}$/.test(params?.date ?? "")
    ? params.date
    : today;
  const date = asked > today ? today : asked;

  const supabase = await createClient();

  const [{ data: customers, error }, { data: entries }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, mobile, daily_quantity, rate_per_liter")
      .eq("status", "active")
      .order("name"),
    supabase
      .from("milk_entries")
      // total_amount comes from the row rather than being worked out from
      // the customer's rate: the entry was billed at whatever the rate was
      // the day it was saved, and that is the figure the books carry.
      .select("customer_id, actual_quantity, total_amount, delivery_status")
      .eq("date", date),
  ]);

  // Who asked to be skipped today. A leave is a span, so the question is
  // "does any booked span cover this date" rather than "is there a row for
  // it". Never fatal: the table arrives with migration 0019, and until it
  // is run the page should still show the round.
  const { data: leaves } = await supabase
    .from("customer_leaves")
    .select("customer_id")
    .lte("from_date", date)
    .gte("to_date", date);

  const onLeave = new Set((leaves ?? []).map((l) => l.customer_id));

  const entryByCustomer = new Map(
    (entries ?? []).map((e) => [e.customer_id, e]),
  );

  const rows = (customers ?? []).map((c) => ({
    ...c,
    entry: entryByCustomer.get(c.id) ?? null,
    onLeave: onLeave.has(c.id),
  }));

  return (
    <>
      <PageHeader
        title="Daily Milk"
        subtitle={`${formatDate(date)} — record how much milk each customer got`}
      />

      {error ? (
        <Alert severity="error">
          Could not load customers: {errorText(error)}
        </Alert>
      ) : (
        <DailyMilkForm
          date={date}
          // Once a day has been over for 24 hours its empty rows are read as
          // missed rather than left pending for good — see @/lib/day-status.
          today={today}
          customers={rows}
        />
      )}
    </>
  );
}
