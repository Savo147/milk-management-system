import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import { formatAmount, formatMonth } from "@/lib/format";
import HisabTable from "./HisabTable";
import PaymentRequests from "./PaymentRequests";
import GenerateBills from "./GenerateBills";

export const metadata = { title: "Hisab — Krishna Dairy" };

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function Summary({ label, value, color = "text.primary" }) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        <Typography
          variant="caption"
          sx={{ color: "text.secondary", fontWeight: 600 }}
        >
          {label}
        </Typography>
        <Typography
          variant="h5"
          sx={{ mt: 0.5, color, fontVariantNumeric: "tabular-nums" }}
        >
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default async function HisabPage({ searchParams }) {
  const params = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(params?.month ?? "")
    ? params.month
    : currentMonth();

  const supabase = await createClient();

  const [{ data: bills, error }, { data: requests }] = await Promise.all([
    supabase
      .from("monthly_bills")
      .select(
        "id, billing_month, total_liters, total_amount, received_amount, remaining_amount, status, customers(name, mobile)",
      )
      .eq("billing_month", `${month}-01`),
    supabase
      .from("payment_requests")
      .select(
        "id, requested_amount, message, status, created_at, monthly_bills!inner(billing_month), customers(name)",
      )
      .eq("monthly_bills.billing_month", `${month}-01`)
      .order("created_at", { ascending: false }),
  ]);

  const rows = (bills ?? [])
    .map((b) => ({
      ...b,
      customer_name: b.customers?.name ?? "—",
      customer_mobile: b.customers?.mobile ?? "",
    }))
    .sort((a, b) => a.customer_name.localeCompare(b.customer_name));

  const requestRows = (requests ?? []).map((r) => ({
    ...r,
    customer_name: r.customers?.name ?? "—",
  }));

  const total = rows.reduce((t, b) => t + Number(b.total_amount), 0);
  const received = rows.reduce((t, b) => t + Number(b.received_amount), 0);
  const pendingCount = rows.filter((b) => b.status === "pending").length;

  return (
    <>
      <PageHeader
        title="Hisab & Payment"
        subtitle={`${formatMonth(`${month}-01`)} — har customer no mahina no hisab`}
        action={<GenerateBills month={month} />}
      />

      {error ? (
        <Alert severity="error">Bills load na thaya: {error.message}</Alert>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6, md: 3 }}>
              <Summary label="Total rakam" value={formatAmount(total)} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Summary
                label="Mali gayu"
                value={formatAmount(received)}
                color="success.main"
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Summary
                label="Baki"
                value={formatAmount(total - received)}
                color={total - received > 0 ? "warning.dark" : "text.secondary"}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Summary label="Pending bills" value={pendingCount} />
            </Grid>
          </Grid>

          <HisabTable month={month} bills={rows} />
          <PaymentRequests requests={requestRows} />

          <Box sx={{ mt: 3 }}>
            <Typography variant="caption" color="text.secondary">
              Bill mahina ni milk entries ma thi banave chhe, ane har entry no
              potano rate snapshot vapre chhe — etle vachche rate badlyo hoy to
              pan hisab barabar j rahe chhe.
            </Typography>
          </Box>
        </>
      )}
    </>
  );
}
