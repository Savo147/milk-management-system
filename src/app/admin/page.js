import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
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
import PeopleIcon from "@mui/icons-material/People";
import LocalDrinkIcon from "@mui/icons-material/LocalDrink";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import {
  DAIRY_TZ,
  formatAmount,
  formatDate,
  formatLiters,
  greeting,
} from "@/lib/format";
import { DAILY_ROW_STATUS, STATUS_COLOR } from "@/lib/constants";
import PageHeader from "@/components/PageHeader";
import StatCard, { SectionLabel } from "@/components/StatCard";
import MilkChart from "@/components/MilkChart";
import RoundPanel from "@/components/RoundPanel";

/** Local YYYY-MM-DD. toISOString() would shift the date in IST. */
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * The dairy's own calendar day for a timestamp. created_at is stored in UTC,
 * so slicing the first ten characters would put a complaint filed at half
 * past eleven at night on the day before.
 */
function dairyDay(timestamp) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DAIRY_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestamp));
}

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/** How many days the milk report looks back over. */
const CHART_DAYS = 7;
/** How many rows the two side panels show before "View all". */
const PANEL_ROWS = 6;

/** YYYY-MM-DD, `n` days before today. */
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * One row per day for the chart, oldest first — including the days nothing
 * was delivered.
 *
 * The entries come back with the empty days simply missing. Plotting only
 * what came back would quietly close those gaps up and draw a week that
 * never had a quiet day in it, so the run of dates is built first and the
 * totals are dropped into it.
 */
function dailySeries(entries, from, count) {
  const totals = new Map();

  for (const e of entries ?? []) {
    const t = totals.get(e.date) ?? { liters: 0, amount: 0, count: 0 };
    t.liters += Number(e.actual_quantity ?? 0);
    t.amount += Number(e.total_amount ?? 0);
    if (Number(e.actual_quantity) > 0) t.count += 1;
    totals.set(e.date, t);
  }

  const start = new Date(`${from}T00:00:00`);
  const days = [];

  for (let i = 0; i < count; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);

    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const t = totals.get(date) ?? { liters: 0, amount: 0, count: 0 };

    days.push({
      date,
      ...t,
      // Short under the plot, long in the tooltip.
      tick: d.toLocaleDateString("en-IN", { weekday: "short" }),
      label: d.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
    });
  }

  return days;
}

/** The titled box the lower half of the dashboard is built out of. */
function Panel({ title, sub, action, children }) {
  return (
    <Paper
      elevation={0}
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 3,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        // A flex item is sized by its content unless it is told otherwise,
        // so without this a wide table inside pushes the panel past its
        // column and takes the whole page sideways with it.
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          px: 2.5,
          py: 1.75,
          flexShrink: 0,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          {sub && (
            <Typography variant="body2" color="text.secondary" noWrap>
              {sub}
            </Typography>
          )}
        </Box>
        {action}
      </Stack>

      <Box sx={{ flexGrow: 1, minHeight: 0, minWidth: 0 }}>{children}</Box>
    </Paper>
  );
}

/** The line a side panel shows when it has nothing to list. */
function PanelEmpty({ children }) {
  return (
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{ px: 2.5, py: 5, textAlign: "center" }}
    >
      {children}
    </Typography>
  );
}

export default async function AdminDashboard() {
  // The layout has already turned away anyone who is not an active admin;
  // this is here for the name in the greeting.
  const admin = await requireAdmin();
  const supabase = await createClient();
  const day = today();
  const month = monthStart();
  // Monday of this week. It can fall in the previous month — on the 2nd of
  // October the week began on the 28th of September — so the rows have to be
  // fetched from whichever of the two comes first, or "this week" quietly
  // loses its first days at the start of every month.
  const weekday = (new Date(`${day}T00:00:00`).getDay() + 6) % 7;
  const weekFrom = new Date(Date.parse(day) - weekday * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const since = weekFrom < month ? weekFrom : month;
  // Six days back plus today makes a week of columns.
  const chartFrom = daysAgo(CHART_DAYS - 1);
  // Two weeks back, so last week can be drawn behind this one.
  const compareFrom = daysAgo(CHART_DAYS * 2 - 1);

  const [
    { count: activeCustomers },
    { data: todayEntries },
    { data: recentEntries },
    { data: balances },
    { data: openReports },
    { data: chartEntries },
    { data: todayRows },
    { data: latestPayments },
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
      .select(
        "date, delivery_status, actual_quantity, total_amount, customer_id, customers(name)",
      )
      .gte("date", since),
    // One row per customer, summed by the database — see migration 0010.
    supabase.from("customer_balances").select("customer_id, name, due"),
    // Complaints nobody has answered yet. Not a month's slice: a complaint
    // left unanswered from three weeks ago is the one that matters most.
    supabase
      .from("reports")
      .select("id, created_at")
      .not("status", "in", "(resolved,rejected)"),
    supabase
      .from("milk_entries")
      .select("date, actual_quantity, total_amount")
      .gte("date", compareFrom)
      .order("date"),
    // Today again, but with the names on it. The cards above only need the
    // numbers, and dragging the join into that query would slow them down
    // for the sake of a list further down the page.
    supabase
      .from("milk_entries")
      .select(
        "id, actual_quantity, total_amount, delivery_status, customers(name)",
      ) // prettier-ignore
      .eq("date", day)
      .order("id"),
    supabase
      .from("payments")
      .select("id, amount, paid_on, customers(name)")
      .order("paid_on", { ascending: false })
      .limit(PANEL_ROWS),
  ]);

  const series = dailySeries(chartEntries, chartFrom, CHART_DAYS);
  // The same seven weekdays a week earlier, in the same order, so Monday is
  // compared with Monday.
  const lastWeek = dailySeries(chartEntries, compareFrom, CHART_DAYS).map(
    (d) => d.liters,
  );

  // Colours are the app's status colours; the key beside the ring carries
  // the words and the counts, because some of them sit close under colour
  // blindness.
  const sum = (rows, key) =>
    (rows ?? []).reduce((t, r) => t + Number(r[key] ?? 0), 0);

  // One pass over rows the page had fetched anyway. The query reaches back to
  // whichever came first, this week's Monday or the first of the month, so
  // "this month" has to be cut out of it rather than taken whole.
  const recent = recentEntries ?? [];
  const monthRows = recent.filter((e) => e.date >= month);

  // Who took the most this month. The same rows again, so this costs one more
  // pass rather than another trip to the database.
  const perCustomer = new Map();
  for (const e of monthRows) {
    const id = e.customer_id;
    const row = perCustomer.get(id) ?? {
      id,
      name: e.customers?.name ?? "—",
      liters: 0,
    };
    row.liters += Number(e.actual_quantity ?? 0);
    perCustomer.set(id, row);
  }
  const topCustomers = [...perCustomer.values()]
    .filter((c) => c.liters > 0)
    .sort((a, b) => b.liters - a.liters)
    .slice(0, PANEL_ROWS);
  const topLiters = Math.max(1, ...topCustomers.map((c) => c.liters));

  // Pending is counted, not left out. It is the one state with no row in the
  // database — it means a customer the round has not reached yet — so a ring
  // built only from saved entries said "4 entries, 100% delivered" on a
  // morning when ten customers had not been marked at all. The round looked
  // finished because only the finished part was being counted.
  /**
   * How a stretch of days came out, for the ring.
   *
   * `expected` is customers × days, not rows — that is what makes Pending
   * mean something. A ring built only from saved entries said "4 entries,
   * 100% delivered" on a morning when ten customers had not been marked at
   * all: the round looked finished because only the finished part was being
   * counted. Over a week it answers the same question backwards — how many
   * customer-days were never written down.
   */
  function round(rows, days, noun) {
    const list = rows ?? [];
    const expected = (activeCustomers ?? 0) * days;
    const notYet = Math.max(0, expected - list.length);
    const countOf = (key) =>
      list.filter((e) => e.delivery_status === key).length;

    return {
      total: list.length + notYet,
      note: noun,
      // The five states keep the same words the Daily Milk page uses, so the
      // ring and the list over there never disagree about what a row is
      // called.
      slices: [
        { label: DAILY_ROW_STATUS.pending, color: "var(--ring-pending)", value: notYet }, // prettier-ignore
        { label: DAILY_ROW_STATUS.delivered, color: "var(--ring-done)", value: countOf("delivered") }, // prettier-ignore
        { label: DAILY_ROW_STATUS.partial, color: "var(--ring-partial)", value: countOf("partial") }, // prettier-ignore
        { label: DAILY_ROW_STATUS.extra, color: "var(--ring-extra)", value: countOf("extra") }, // prettier-ignore
        { label: DAILY_ROW_STATUS.missed, color: "var(--ring-missed)", value: countOf("missed") }, // prettier-ignore
      ],
      figures: [
        {
          label: "Milk",
          value: formatLiters(sum(list, "actual_quantity")),
        },
        {
          label: "Amount",
          value: formatAmount(sum(list, "total_amount")),
          color: "var(--tile-green-fg)",
        },
      ],
    };
  }

  const periods = {
    today: round(
      recent.filter((e) => e.date === day),
      1,
      "customers",
    ),
    week: round(
      recent.filter((e) => e.date >= weekFrom),
      weekday + 1,
      "deliveries",
    ),
    month: round(monthRows, Number(day.slice(8)), "deliveries"),
  };

  const deliveries = (todayRows ?? []).map((r) => ({
    id: r.id,
    name: r.customers?.name ?? "—",
    liters: Number(r.actual_quantity ?? 0),
    amount: Number(r.total_amount ?? 0),
    status: r.delivery_status,
  }));

  const payments = (latestPayments ?? []).map((p) => ({
    id: p.id,
    name: p.customers?.name ?? "—",
    amount: Number(p.amount ?? 0),
    paid_on: p.paid_on,
  }));

  // The card above says how much is outstanding in all; this says who by.
  const debtors = (balances ?? [])
    .filter((b) => Number(b.due) > 0)
    .sort((a, b) => Number(b.due) - Number(a.due))
    .slice(0, PANEL_ROWS);
  // The bars are read against the biggest debt, not against the total —
  // relative to the total every bar would be a sliver.
  const worstDue = Math.max(1, ...debtors.map((b) => Number(b.due)));

  const todayMilk = sum(todayEntries, "actual_quantity");
  const todayAmount = sum(todayEntries, "total_amount");
  const monthMilk = sum(monthRows, "actual_quantity");
  const monthAmount = sum(monthRows, "total_amount");
  const waiting = openReports?.length ?? 0;
  // How long the oldest unanswered one has been sitting there. That number,
  // more than the count, is what the customer on the other end feels.
  const oldestDay = waiting
    ? dairyDay(
        openReports.reduce((a, b) => (a.created_at < b.created_at ? a : b))
          .created_at,
      )
    : null;
  const oldestDays = oldestDay
    ? Math.max(
        0,
        Math.round((Date.parse(day) - Date.parse(oldestDay)) / 86_400_000),
      )
    : 0;
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
        title={`${greeting()}, ${admin.name}`}
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
            color="red"
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
        <Grid size={{ xs: 6, md: 4, lg: 3 }}>
          <StatCard
            label="Open complaints"
            value={waiting}
            sub={
              waiting === 0
                ? "nothing pending"
                : oldestDays === 0
                  ? "came in today"
                  : `oldest ${oldestDays} ${oldestDays === 1 ? "day" : "days"} old`
            }
            icon={ReportProblemIcon}
            color="teal"
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 5 }} />
      <Grid container spacing={2} sx={{ alignItems: "stretch" }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Panel
            title="Today's deliveries"
            sub={`${deliveries.length} ${deliveries.length === 1 ? "entry" : "entries"}`}
          >
            <TableContainer sx={{ borderRadius: 0 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 52 }}>#</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell align="right">Milk</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="center">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deliveries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                          Nothing recorded today yet.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}

                  {deliveries.map((d, i) => (
                    <TableRow key={d.id} hover>
                      <TableCell sx={{ color: "text.disabled" }}>
                        {i + 1}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{d.name}</TableCell>
                      <TableCell align="right">
                        {formatLiters(d.liters)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {formatAmount(d.amount)}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={DAILY_ROW_STATUS[d.status] ?? d.status}
                          color={STATUS_COLOR[d.status] ?? "default"}
                          variant={
                            d.status === "delivered" ? "filled" : "outlined"
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Panel>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Panel
            title="Owing the most"
            sub={
              owing > 0
                ? `${owing} ${owing === 1 ? "customer owes" : "customers owe"} money`
                : "everyone is settled"
            }
          >
            {debtors.length === 0 ? (
              <PanelEmpty>Nothing outstanding.</PanelEmpty>
            ) : (
              <Stack sx={{ px: 2.5, py: 2, gap: 1.75 }}>
                {debtors.map((b) => (
                  <Box key={b.customer_id}>
                    <Stack
                      direction="row"
                      sx={{ justifyContent: "space-between", gap: 2, mb: 0.6 }}
                    >
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{ fontWeight: 600 }}
                      >
                        {b.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700, flexShrink: 0, color: "var(--tile-amber-fg)", fontVariantNumeric: "tabular-nums" }} // prettier-ignore
                      >
                        {formatAmount(b.due)}
                      </Typography>
                    </Stack>

                    {/* The track is a lighter step of the fill's own colour,
                        so the bar reads as one thing at any length. */}
                    <Box
                      sx={{ height: 6, borderRadius: 3, bgcolor: "var(--tile-amber-bg)", overflow: "hidden" }} // prettier-ignore
                    >
                      <Box
                        sx={{
                          height: "100%",
                          width: `${Math.max(6, (Number(b.due) / worstDue) * 100)}%`,
                          bgcolor: "var(--tile-amber-line)",
                          borderRadius: 3,
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}
          </Panel>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <Panel title="Milk report" sub="Litres delivered each day">
            <Box sx={{ p: 2.5 }}>
              <MilkChart days={series} previous={lastWeek} />
            </Box>
          </Panel>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Panel title="Recent payments" sub="Money that has come in">
            {payments.length === 0 ? (
              <PanelEmpty>No payments recorded yet.</PanelEmpty>
            ) : (
              <Stack sx={{ px: 1.5, py: 1.5, gap: 0.25 }}>
                {payments.map((p) => (
                  <Stack
                    key={p.id}
                    direction="row"
                    sx={{ alignItems: "center", gap: 1.5, px: 1, py: 0.9 }}
                  >
                    <Avatar
                      sx={{ width: 34, height: 34, flexShrink: 0, fontSize: "0.8rem", fontWeight: 700, bgcolor: "var(--tile-green-bg)", color: "var(--tile-green-fg)" }} // prettier-ignore
                    >
                      {p.name?.[0]?.toUpperCase()}
                    </Avatar>

                    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{ fontWeight: 600 }}
                      >
                        {p.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ display: "block", color: "text.secondary" }}
                      >
                        {formatDate(p.paid_on)}
                      </Typography>
                    </Box>

                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 700, flexShrink: 0, color: "var(--tile-green-fg)", fontVariantNumeric: "tabular-nums" }} // prettier-ignore
                    >
                      {formatAmount(p.amount)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </Panel>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Panel title="The round" sub="How the deliveries came out">
            <RoundPanel periods={periods} />
          </Panel>
        </Grid>

        <Grid size={{ xs: 12, lg: 7 }}>
          <Panel title="Top customers" sub="Most milk taken this month">
            {topCustomers.length === 0 ? (
              <PanelEmpty>Nothing delivered this month yet.</PanelEmpty>
            ) : (
              <Stack sx={{ px: 2.5, py: 2, gap: 1.75 }}>
                {topCustomers.map((c, i) => (
                  <Box key={c.id}>
                    <Stack
                      direction="row"
                      sx={{ alignItems: "center", gap: 1.5, mb: 0.6 }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ color: "text.disabled", width: 14, flexShrink: 0 }} // prettier-ignore
                      >
                        {i + 1}
                      </Typography>
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{ fontWeight: 600, flexGrow: 1, minWidth: 0 }}
                      >
                        {c.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700, flexShrink: 0, fontVariantNumeric: "tabular-nums" }} // prettier-ignore
                      >
                        {formatLiters(c.liters)}
                      </Typography>
                    </Stack>

                    {/* Read against the biggest of them, not against the
                        month's total — against the total every bar would be
                        a sliver and nothing could be compared. */}
                    <Box
                      sx={{ height: 6, borderRadius: 3, bgcolor: "var(--tile-blue-bg)", overflow: "hidden", ml: "30px" }} // prettier-ignore
                    >
                      <Box
                        sx={{
                          height: "100%",
                          width: `${Math.max(6, (c.liters / topLiters) * 100)}%`,
                          bgcolor: "var(--tile-blue-line)",
                          borderRadius: 3,
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}
          </Panel>
        </Grid>
      </Grid>
    </>
  );
}
