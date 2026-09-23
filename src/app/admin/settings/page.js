import Alert from "@mui/material/Alert";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, getBusinessSettings } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import SettingsTabs from "./SettingsTabs";

export const metadata = { title: "Settings — Krishna Dairy" };

export default async function SettingsPage() {
  const user = await requireAdmin();
  const settings = await getBusinessSettings();
  const supabase = await createClient();

  const [staff, rates, logs] = await Promise.all([
    supabase
      .from("users")
      .select("id, name, email, mobile, role, status, created_at")
      .order("created_at"),
    supabase
      .from("milk_rates")
      .select(
        "id, rate_per_liter, effective_from, effective_to, customers(name)",
      )
      .order("effective_from", { ascending: false })
      .limit(100),
    supabase
      .from("audit_logs")
      .select("id, action, module, created_at, users(name)")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  // A missing table or a blocked read should not take the whole page down —
  // the other tabs are still worth showing.
  const error = staff.error;

  const rateRows = (rates.data ?? [])
    .map((r) => ({ ...r, customer_name: r.customers?.name ?? "—" }))
    .sort(
      (a, b) =>
        a.customer_name.localeCompare(b.customer_name) ||
        b.effective_from.localeCompare(a.effective_from),
    );

  const logRows = (logs.data ?? []).map((l) => ({
    ...l,
    user_name: l.users?.name ?? "—",
  }));

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Dairy, your details, users, rates and audit logs"
      />

      {error ? (
        <Alert severity="error">Could not load settings: {error.message}</Alert>
      ) : (
        <SettingsTabs
          settings={settings}
          user={user}
          staff={staff.data ?? []}
          rates={rateRows}
          logs={logRows}
        />
      )}
    </>
  );
}
