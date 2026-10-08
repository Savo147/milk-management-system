import Alert from "@mui/material/Alert";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { todayLocal } from "@/lib/range";
import PageHeader from "@/components/PageHeader";
import LeavesView from "./LeavesView";
import { errorText } from "@/lib/format";

export const metadata = { title: "Leaves" };

export default async function LeavesPage() {
  await requireAdmin();

  const supabase = await createClient();

  const [leaves, customers] = await Promise.all([
    supabase
      .from("customer_leaves")
      .select(
        "id, customer_id, from_date, to_date, reason, customers(name, mobile, daily_quantity, users(profile_photo))",
      )
      .order("from_date", { ascending: false }),
    // Everybody, not only those with leave booked: the dialog needs the
    // whole book to add one for somebody who phoned in.
    supabase
      .from("customers")
      .select("id, name, mobile")
      .eq("status", "active")
      .order("name"),
  ]);

  const rows = (leaves.data ?? []).map((l) => ({
    id: l.id,
    customer_id: l.customer_id,
    from_date: l.from_date,
    to_date: l.to_date,
    reason: l.reason,
    customer_name: l.customers?.name ?? "—",
    customer_mobile: l.customers?.mobile ?? "",
    // What they take on a normal day — the milk the round does not have to
    // carry while they are away.
    daily_quantity: Number(l.customers?.daily_quantity ?? 0),
    customer_photo: l.customers?.users?.profile_photo ?? null,
  }));

  return (
    <>
      <PageHeader
        title="Festival Leave"
        subtitle="Customers who have asked for no milk on certain days"
      />

      {leaves.error ? (
        <Alert severity="error">
          Could not load leaves: {errorText(leaves.error)}
          {/* The table arrives with migration 0019. Until it is run this is
              the only thing this page can honestly say. */}
        </Alert>
      ) : (
        <LeavesView
          leaves={rows}
          customers={customers.data ?? []}
          today={todayLocal()}
        />
      )}
    </>
  );
}
