import Alert from "@mui/material/Alert";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import CustomersTable from "./CustomersTable";

export const metadata = { title: "Customers — Krishna Dairy" };

export default async function CustomersPage() {
  const supabase = await createClient();

  const { data: customers, error } = await supabase
    .from("customers")
    .select(
      "id, name, mobile, address, daily_quantity, rate_per_liter, delivery_time, status, user_id, users(email)",
    )
    .order("name");

  // The login's email lives on the users row, not the customer's; flattened
  // here so the table does not have to reach through the join.
  const rows = (customers ?? []).map((c) => ({
    ...c,
    login_email: c.users?.email ?? null,
  }));

  // Logins with nobody attached — almost always somebody who has just signed
  // in with Google and is sitting on the "not linked yet" screen.
  const { data: accounts } = await supabase
    .from("users")
    .select("id, name, email")
    .eq("role", "customer")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const linked = new Set(rows.map((c) => c.user_id).filter(Boolean));
  const unlinkedLogins = (accounts ?? []).filter((a) => !linked.has(a.id));

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Customer details, daily milk, rate and login are all managed here"
      />

      {error ? (
        <Alert severity="error">
          Could not load customers: {error.message}
        </Alert>
      ) : (
        <>
          {unlinkedLogins.length > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {unlinkedLogins.length} login
              {unlinkedLogins.length === 1 ? " is" : "s are"} not linked to any
              customer —{" "}
              {unlinkedLogins
                .slice(0, 3)
                .map((a) => a.email)
                .join(", ")}
              {unlinkedLogins.length > 3 ? " and more" : ""}. Click the key icon
              on the customer you want to link.
            </Alert>
          )}

          <CustomersTable customers={rows} unlinkedLogins={unlinkedLogins} />
        </>
      )}
    </>
  );
}
