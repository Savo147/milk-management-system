import Alert from "@mui/material/Alert";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import CustomersTable from "./CustomersTable";

export const metadata = { title: "Customers" };

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

  // Customers created for somebody the moment they signed in. They carry a
  // placeholder rate and no mobile, and stay inactive until an admin fills
  // the real figures in — so they are worth pointing at.
  const needDetails = rows.filter((c) => !c.mobile);

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
          {needDetails.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {needDetails.length}{" "}
              {needDetails.length === 1 ? "customer has" : "customers have"}{" "}
              just signed up —{" "}
              {needDetails
                .slice(0, 3)
                .map((c) => c.name)
                .join(", ")}
              {needDetails.length > 3 ? " and more" : ""}. Add their mobile,
              daily milk and rate, then set them to Active. Until then they do
              not appear on Daily Milk.
            </Alert>
          )}

          {/* No banner for unlinked logins any more: signing in now creates
              the customer record itself, so there is nothing left waiting to
              be joined up. The list is still gathered, because the key icon
              can still attach a login that lost its customer. */}
          <CustomersTable customers={rows} unlinkedLogins={unlinkedLogins} />
        </>
      )}
    </>
  );
}
