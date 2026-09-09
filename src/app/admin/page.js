import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import PeopleIcon from "@mui/icons-material/People";
import LocalDrinkIcon from "@mui/icons-material/LocalDrink";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import InventoryIcon from "@mui/icons-material/Inventory";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { createClient } from "@/lib/supabase/server";
import { formatAmount, formatLiters } from "@/lib/format";
import PageHeader from "@/components/PageHeader";

/** Local YYYY-MM-DD. toISOString() would shift the date in IST. */
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Icon tints as plain strings, matching the theme palette.
 *
 * This page is a Server Component, so an `sx` value cannot be a function —
 * functions do not serialize across to the client, and `sx={{ bgcolor: (t) =>
 * ... }}` fails at runtime. Static values it is.
 */
const TINT = {
  primary: { bg: "#eaf4fc", fg: "#095895" },
  info: { bg: "#eaf4fc", fg: "#095895" },
  success: { bg: "#e6f5ee", fg: "#0c6244" },
  warning: { bg: "#fdf1e0", fg: "#8a5200" },
  error: { bg: "#fdeaea", fg: "#9b1c1c" },
};

function StatCard({ label, value, sub, icon: Icon, color = "primary" }) {
  const tint = TINT[color] ?? TINT.primary;

  return (
    <Card
      sx={{
        height: "100%",
        transition: "border-color .15s, box-shadow .15s",
        "&:hover": {
          borderColor: "grey.300",
          boxShadow: "0 1px 3px rgba(21,26,32,.06)",
        },
      }}
    >
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 600,
              letterSpacing: "0.03em",
            }}
          >
            {label}
          </Typography>
          <Box
            sx={{
              display: "grid",
              placeItems: "center",
              width: 34,
              height: 34,
              borderRadius: 2,
              flexShrink: 0,
              bgcolor: tint.bg,
              color: tint.fg,
            }}
          >
            <Icon sx={{ fontSize: 19 }} />
          </Box>
        </Box>

        <Typography
          variant="h4"
          sx={{ mt: 1, fontSize: "1.6rem", fontVariantNumeric: "tabular-nums" }}
        >
          {value}
        </Typography>

        <Typography
          variant="caption"
          sx={{ color: "text.secondary", display: "block", minHeight: 18 }}
        >
          {sub ?? ""}
        </Typography>
      </CardContent>
    </Card>
  );
}

function SectionLabel({ children }) {
  return (
    <Typography
      variant="overline"
      sx={{
        color: "text.secondary",
        fontWeight: 700,
        letterSpacing: "0.08em",
        display: "block",
        mb: 1.5,
      }}
    >
      {children}
    </Typography>
  );
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

      <SectionLabel>Aaj</SectionLabel>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard
            label="Aaj nu dudh"
            value={formatLiters(todayMilk)}
            sub={`${served} customer ne apayu`}
            icon={LocalDrinkIcon}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard
            label="Aaj ni rakam"
            value={formatAmount(todayAmount)}
            sub={`${todayEntries?.length ?? 0} entries`}
            icon={CurrencyRupeeIcon}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard
            label="Active customers"
            value={activeCustomers ?? 0}
            icon={PeopleIcon}
            color="info"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard
            label="Missed delivery"
            value={missed}
            sub="aaj"
            icon={LocalShippingIcon}
            color={missed > 0 ? "error" : "success"}
          />
        </Grid>

      </Grid>

      <Box sx={{ mt: 4 }} />
      <SectionLabel>Aa mahino</SectionLabel>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard
            label="Aa mahina nu dudh"
            value={formatLiters(monthMilk)}
            icon={LocalDrinkIcon}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard
            label="Aa mahina ni rakam"
            value={formatAmount(monthAmount)}
            icon={CurrencyRupeeIcon}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard
            label="Baki hisab"
            value={pendingBills ?? 0}
            sub={`${doneBills ?? 0} pura thaya`}
            icon={PendingActionsIcon}
            color="warning"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard
            label="Stock baki"
            value={formatLiters(stock?.remaining_stock ?? 0)}
            sub="aaj"
            icon={InventoryIcon}
            color="info"
          />
        </Grid>
      </Grid>
    </>
  );
}
