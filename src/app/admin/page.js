import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import PeopleIcon from "@mui/icons-material/People";
import LocalDrinkIcon from "@mui/icons-material/LocalDrink";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
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
    { data: balances },
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
    // One row per customer, summed by the database — see migration 0010.
    supabase.from("customer_balances").select("due"),
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
  // Everything owed, by everybody, all time. Not a month's slice of it:
  // what is owed does not reset when the month does.
  const totalDue = (balances ?? []).reduce((t, b) => t + Number(b.due ?? 0), 0);
  const owing = (balances ?? []).filter((b) => Number(b.due) > 0).length;

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
            color="blue"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 4, lg: 3 }}>
          <StatCard
            label="Today's amount"
            value={formatAmount(todayAmount)}
            sub={`${todayEntries?.length ?? 0} entries`}
            icon={CurrencyRupeeIcon}
            color="green"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 4, lg: 3 }}>
          <StatCard
            label="Active customers"
            value={activeCustomers ?? 0}
            icon={PeopleIcon}
            color="violet"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 4, lg: 3 }}>
          <StatCard
            label="Missed delivery"
            value={missed}
            sub="today"
            icon={LocalShippingIcon}
            color={missed > 0 ? "red" : "teal"}
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
            color="pink"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 4, lg: 3 }}>
          <StatCard
            label="This month's amount"
            value={formatAmount(monthAmount)}
            icon={CurrencyRupeeIcon}
            color="indigo"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 4, lg: 3 }}>
          <StatCard
            label="Total due"
            value={formatAmount(totalDue)}
            sub={
              owing > 0
                ? `${owing} ${owing === 1 ? "customer" : "customers"}`
                : "everyone is settled"
            }
            icon={AccountBalanceWalletIcon}
            color="amber"
          />
        </Grid>
      </Grid>
    </>
  );
}
