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
      "id, name, mobile, address, daily_quantity, rate_per_liter, delivery_time, status",
    )
    .order("name");

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Customer ni details, roj nu dudh ane eno rate ahi thi manage thay chhe"
      />

      {error ? (
        <Alert severity="error">
          Customers load na thai shakya: {error.message}
        </Alert>
      ) : (
        <CustomersTable customers={customers ?? []} />
      )}
    </>
  );
}
