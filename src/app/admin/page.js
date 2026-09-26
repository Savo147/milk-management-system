import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import PeopleIcon from "@mui/icons-material/People";
import LocalDrinkIcon from "@mui/icons-material/LocalDrink";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import InventoryIcon from "@mui/icons-material/Inventory";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { createClient } from "@/lib/supabase/server";
import { formatAmount, formatLiters } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import StatCard, { SectionLabel } from "@/components/StatCard";

/** Local YYYY-MM-DD. toISOString() would shift the date in IST. */
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function AdminDashboard() {
  const supabase = await createClient();
  const day = today();
  const month = monthStart();

  const [
    { count: activeCustomers },
    { data: todayEntries },
    { data: monthEntries },
    { data: stock },
    { count: pendingBills },
    { count: doneBills },
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("milk_entries")
      .select("actual_quantity, total_amount, delivery_status")
      .eq("date", day),
    supabase
      .from("milk_entries")
      .select("actual_quantity, total_amount")
      .gte("date", month),
    supabase
      .from("milk_stock")
      .select("remaining_stock")
      .eq("date", day)
      .maybeSingle(),
    supabase
      .from("monthly_bills")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("monthly_bills")
      .select("id", { count: "exact", head: true })
      .eq("status", "done"),
  ]);

  const sum = (rows, key) =>
    (rows ?? []).reduce((t, r) => t + Number(r[key] ?? 0), 0);

  const todayMilk = sum(todayEntries, "actual_quantity");
  const todayAmount = sum(todayEntries, "total_amount");
  const monthMilk = sum(monthEntries, "actual_quantity");
  const monthAmount = sum(monthEntries, "total_amount");
  const served = (todayEntries ?? []).filter(
    (e) => e.delivery_status !== "missed",
  ).length;
  const missed = (todayEntries ?? []).filter(
    (e) => e.delivery_status === "missed",
  ).length;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={new Date().toLocaleDateString("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      />

      <SectionLabel>Today</SectionLabel>
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 4, lg: 3 }}>
          <StatCard
            label="Today's milk"
            value={formatLiters(todayMilk)}
            sub={`delivered to ${served} customers`}
            icon={LocalDrinkIcon}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 4, lg: 3 }}>
          <StatCard
            label="Today's amount"
            value={formatAmount(todayAmount)}
            sub={`${todayEntries?.length ?? 0} entries`}
            icon={CurrencyRupeeIcon}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 4, lg: 3 }}>
          <StatCard
            label="Active customers"
            value={activeCustomers ?? 0}
            icon={PeopleIcon}
            color="info"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 4, lg: 3 }}>
          <StatCard
            label="Missed delivery"
            value={missed}
            sub="today"
            icon={LocalShippingIcon}
            color={missed > 0 ? "error" : "success"}
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }} />
      <SectionLabel>This month</SectionLabel>
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 4, lg: 3 }}>
          <StatCard
            label="This month's milk"
            value={formatLiters(monthMilk)}
            icon={LocalDrinkIcon}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 4, lg: 3 }}>
          <StatCard
            label="This month's amount"
            value={formatAmount(monthAmount)}
            icon={CurrencyRupeeIcon}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 4, lg: 3 }}>
          <StatCard
            label="Unpaid bills"
            value={pendingBills ?? 0}
            sub={`${doneBills ?? 0} settled`}
            icon={PendingActionsIcon}
            color="warning"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 4, lg: 3 }}>
          <StatCard
            label="Stock left"
            value={formatLiters(stock?.remaining_stock ?? 0)}
            sub="today"
            icon={InventoryIcon}
            color="info"
          />
        </Grid>
      </Grid>
    </>
  );
}
