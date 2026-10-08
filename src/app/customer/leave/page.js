import Alert from "@mui/material/Alert";
import { createClient } from "@/lib/supabase/server";
import { requireCustomerAccount } from "@/lib/auth";
import { todayLocal } from "@/lib/range";
import PageHeader from "@/components/PageHeader";
import NotLinked from "@/components/NotLinked";
import LeaveView from "./LeaveView";
import { errorText } from "@/lib/format";

export const metadata = { title: "Leave" };

export default async function LeavePage() {
  const { customer } = await requireCustomerAccount();

  if (!customer) {
    return (
      <>
        <PageHeader title="Leave" />
        <NotLinked />
      </>
    );
  }

  const supabase = await createClient();

  // Their own, every one of them — the list is short by nature and the ones
  // already over are the record of what was taken.
  const { data, error } = await supabase
    .from("customer_leaves")
    .select("id, from_date, to_date, reason")
    .eq("customer_id", customer.id)
    .order("from_date", { ascending: false });

  return (
    <>
      <PageHeader
        title="Leave"
        subtitle="Days you do not want milk delivered"
      />

      {error ? (
        <Alert severity="error">
          Could not load your leave: {errorText(error)}
        </Alert>
      ) : (
        <LeaveView leaves={data ?? []} today={todayLocal()} />
      )}
    </>
  );
}
