import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { createClient } from "@/lib/supabase/server";
import { tableOnly, cardsOnly } from "@/lib/responsive";
import PageHeader from "@/components/PageHeader";
import { formatAmount, formatDate, formatLiters } from "@/lib/format";
import DayPicker from "./DayPicker";
import DayTable from "./DayTable";

export const metadata = { title: "Stock" };

/** Local YYYY-MM-DD. toISOString() would roll back a day in IST. */
function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Stat({ label, value, color = "text.primary" }) {
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

export default async function StockPage({ searchParams }) {
  const params = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params?.date ?? "")
    ? params.date
    : ymd(new Date());

  const since = new Date();
  since.setDate(since.getDate() - 29);

  const supabase = await createClient();

  const [{ data: day, error }, { data: recent }] = await Promise.all([
    supabase
      .from("milk_entries")
      .select(
        "id, actual_quantity, rate_per_liter, total_amount, delivery_status, customers(name, mobile)",
      )
      .eq("date", date),
    supabase
      .from("milk_entries")
      .select("date, actual_quantity, total_amount")
      .gte("date", ymd(since)),
  ]);

  const rows = (day ?? [])
    .map((r) => ({
      ...r,
      customer_name: r.customers?.name ?? "—",
      customer_mobile: r.customers?.mobile ?? "",
    }))
    .sort((a, b) => a.customer_name.localeCompare(b.customer_name));

  const liters = rows.reduce((t, r) => t + Number(r.actual_quantity), 0);
  const amount = rows.reduce((t, r) => t + Number(r.total_amount), 0);
  const served = rows.filter((r) => Number(r.actual_quantity) > 0).length;
  const missed = rows.filter((r) => Number(r.actual_quantity) === 0).length;

  // Day-by-day totals, newest first.
  const byDate = new Map();
  for (const e of recent ?? []) {
    const t = byDate.get(e.date) ?? { liters: 0, amount: 0, count: 0 };
    t.liters += Number(e.actual_quantity ?? 0);
    t.amount += Number(e.total_amount ?? 0);
    if (Number(e.actual_quantity) > 0) t.count += 1;
    byDate.set(e.date, t);
  }
  const history = [...byDate.entries()].sort((a, b) =>
    b[0].localeCompare(a[0]),
  );

  return (
    <>
      <PageHeader
        title="Stock"
        subtitle={`${formatDate(date)} — milk delivered on this day`}
        action={<DayPicker date={date} />}
      />

      {error ? (
        <Alert severity="error">Could not load: {error.message}</Alert>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid size={{ xs: 6, md: 3 }}>
              <Stat label="Total milk delivered" value={formatLiters(liters)} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Stat
                label="Total amount"
                value={formatAmount(amount)}
                color="success.main"
              />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Stat label="Given to customers" value={served} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Stat
                label="Missed"
                value={missed}
                color={missed > 0 ? "error.main" : "text.secondary"}
              />
            </Grid>
          </Grid>

          <SectionLabel>Who got how much</SectionLabel>
          <DayTable rows={rows} />

          <Box sx={{ mt: 4 }}>
            <SectionLabel>Last 30 days</SectionLabel>

            {/* Written out here rather than through DataCards: this is a
                Server Component, and DataCards takes its columns as
                callbacks, which cannot cross that boundary. */}
            <Stack sx={{ ...cardsOnly, gap: 1.25 }}>
              {history.length === 0 && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 4,
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 2,
                    textAlign: "center",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    No entries in the last 30 days.
                  </Typography>
                </Paper>
              )}

              {history.map(([d, t]) => (
                <Paper
                  key={d}
                  elevation={0}
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: d === date ? "primary.main" : "divider",
                    borderRadius: 2.5,
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {formatDate(d)}
                  </Typography>
                  <Stack sx={{ gap: 0.4, mt: 1.5 }}>
                    {[
                      ["Milk", formatLiters(t.liters)],
                      ["Amount", formatAmount(t.amount)],
                      ["Customers", t.count],
                    ].map(([label, value]) => (
                      <Stack
                        key={label}
                        direction="row"
                        sx={{
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          gap: 2,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {label}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {value}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Paper>
              ))}
            </Stack>

            <TableContainer
              component={Paper}
              sx={{ border: 1, borderColor: "divider", ...tableOnly }}
            >
              <Table size="small" sx={{ minWidth: 520 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell align="center" sx={{ width: "22%" }}>
                      Milk
                    </TableCell>
                    <TableCell align="center" sx={{ width: "22%" }}>
                      Amount
                    </TableCell>
                    <TableCell align="center" sx={{ width: "22%" }}>
                      Customers
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                          No entries in the last 30 days.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}

                  {history.map(([d, t]) => (
                    <TableRow key={d} hover selected={d === date}>
                      <TableCell>{formatDate(d)}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>
                        {formatLiters(t.liters)}
                      </TableCell>
                      <TableCell align="center">
                        {formatAmount(t.amount)}
                      </TableCell>
                      <TableCell align="center">{t.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </>
      )}
    </>
  );
}
