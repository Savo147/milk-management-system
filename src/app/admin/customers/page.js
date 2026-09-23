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
  // in with Google and is sitting on the "account jodayu nathi" screen.
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
        subtitle="Customer ni details, roj nu dudh, rate ane eno login ahi thi manage thay chhe"
      />

      {error ? (
        <Alert severity="error">
          Customers load na thai shakya: {error.message}
        </Alert>
      ) : (
        <>
          {unlinkedLogins.length > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {unlinkedLogins.length} login koi customer sathe jodayela nathi —{" "}
              {unlinkedLogins
                .slice(0, 3)
                .map((a) => a.email)
                .join(", ")}
              {unlinkedLogins.length > 3 ? " ane bija" : ""}. Jene jodvu hoy e
              customer ni chavi par click karo.
            </Alert>
          )}

          <CustomersTable customers={rows} unlinkedLogins={unlinkedLogins} />
        </>
      )}
    </>
  );
}
