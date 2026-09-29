import Alert from "@mui/material/Alert";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import CustomersTable from "./CustomersTable";
import { errorText } from "@/lib/format";

export const metadata = { title: "Customers" };

export default async function CustomersPage() {
  const supabase = await createClient();

  const { data: customers, error } = await supabase
    .from("customers")
    .select(
      "id, name, mobile, address, daily_quantity, rate_per_liter, delivery_time, status, user_id, users(email, profile_photo)",
    )
    .order("name");

  // The login's email lives on the users row, not the customer's; flattened
  // here so the table does not have to reach through the join.
  const rows = (customers ?? []).map((c) => ({
    ...c,
    login_email: c.users?.email ?? null,
    photo: c.users?.profile_photo ?? null,
  }));

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Customer details, daily milk, rate and login are all managed here"
      />

      {error ? (
        <Alert severity="error">
          Could not load customers: {errorText(error)}
        </Alert>
      ) : (
        <>
          <CustomersTable customers={rows} />
        </>
      )}
    </>
  );
}
