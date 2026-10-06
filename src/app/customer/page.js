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
import LocalDrinkIcon from "@mui/icons-material/LocalDrink";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import SellIcon from "@mui/icons-material/Sell";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { createClient } from "@/lib/supabase/server";
import { requireCustomerAccount } from "@/lib/auth";
import {
  DAIRY_TZ,
  formatAmount,
  formatDate,
  formatLiters,
  formatRate,
} from "@/lib/format";
import { monthStart, todayLocal } from "@/lib/range";
import { tableOnly, cardsOnlyFlex } from "@/lib/responsive";
import {
  DAILY_ROW_STATUS,
  STATUS_COLOR,
  PROBLEM_STATE,
  problemState,
} from "@/lib/constants";
import PageHeader from "@/components/PageHeader";
import StatCard, { SectionLabel } from "@/components/StatCard";
import NotLinked from "@/components/NotLinked";
import MilkChart from "@/components/MilkChart";
import StatusDonut from "@/components/StatusDonut";

export const metadata = { title: "Dashboard" };

const sum = (rows, key) =>
  (rows ?? []).reduce((t, r) => t + Number(r[key] ?? 0), 0);

/** How many days the milk report looks back over. */
const CHART_DAYS = 7;
/** How many rows the payments panel shows. */
const PANEL_ROWS = 6;

/**
 * One row per day for the chart, oldest first — including the days nothing
 * was delivered.
 *
 * The entries come back with the empty days simply missing. Plotting only
 * what came back would quietly close those gaps up and draw a week that never
 * had a quiet day in it, so the run of dates is built first and the totals
 * are dropped into it.
 */
function dailySeries(rows, from, count) {
  const totals = new Map();

  for (const e of rows ?? []) {
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

    const pad = (v) => String(v).padStart(2, "0");
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const t = totals.get(date) ?? { liters: 0, amount: 0, count: 0 };

    days.push({
      date,
      ...t,
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
function Panel({ title, sub: note, children }) {
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
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 1.75,
          flexShrink: 0,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {note && (
          <Typography variant="body2" color="text.secondary" noWrap>
            {note}
          </Typography>
        )}
      </Box>

      <Box sx={{ flexGrow: 1, minHeight: 0, minWidth: 0 }}>{children}</Box>
    </Paper>
  );
}

/** Date n days back from today, as local YYYY-MM-DD. */
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const pad = (v) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * "Good morning" and the rest, off the dairy's clock rather than the
 * server's — on Vercel that is UTC, which would wish somebody good night
 * while they are having their breakfast.
 *
 * Night runs from ten to five: the dairy's own round starts before six, so
 * anyone here at that hour is up for the morning, not still up from the night.
 */
function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: DAIRY_TZ,
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );

  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 22) return "Good evening";
  return "Good night";
}

export default async function CustomerDashboard() {
  const { customer } = await requireCustomerAccount();

  if (!customer) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <NotLinked />
      </>
    );
  }

  const supabase = await createClient();
  const day = todayLocal();

  const [today, month, allMilk, allPaid, recent, problems] = await Promise.all([
    supabase
      .from("milk_entries")
      .select("actual_quantity, total_amount, delivery_status")
      .eq("customer_id", customer.id)
      .eq("date", day)
      .maybeSingle(),
    supabase
      .from("milk_entries")
      .select("actual_quantity, total_amount, delivery_status")
      .eq("customer_id", customer.id)
      .gte("date", monthStart()),
    // Due is an all-time figure on purpose: what is owed does not reset when
    // the month does, and a customer looking at this card wants the real
    // number, not this month's slice of it.
    supabase
      .from("milk_entries")
      .select("total_amount")
      .eq("customer_id", customer.id),
    supabase
      .from("payments")
      .select("amount, paid_on")
      .eq("customer_id", customer.id)
      .order("paid_on", { ascending: false }),
    supabase
      .from("milk_entries")
      .select(
        "date, actual_quantity, rate_per_liter, total_amount, delivery_status",
      )
      .eq("customer_id", customer.id)
      .gte("date", daysAgo(13))
      .order("date", { ascending: false }),
    supabase
      .from("reports")
      .select("id, issue_type, message, status, created_at")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const billed = sum(allMilk.data, "total_amount");
  const paid = sum(allPaid.data, "amount");
  // Paying ahead leaves payments above the milk; a negative Due would just
  // read as broken.
  const baki = Math.max(0, billed - paid);

  // Days the round did not reach them. A day nobody has recorded yet is not
  // a missed one — only an entry saved as "missed" counts.
  const missedThisMonth = (month.data ?? []).filter(
    (e) => e.delivery_status === "missed",
  ).length;
  const lastPaid = allPaid.data?.[0]?.paid_on ?? null;

  const openProblems = (problems.data ?? []).filter(
    (p) => problemState(p.status) === "pending",
  ).length;

  // No row saved for today yet is not the same as a missed delivery.
  const todayStatus = today.data?.delivery_status ?? "pending";

  // The same two weeks the dairy's own report draws, for one customer.
  const weekFrom = daysAgo(CHART_DAYS - 1);
  const series = dailySeries(recent.data, weekFrom, CHART_DAYS);
  const lastWeek = dailySeries(
    recent.data,
    daysAgo(CHART_DAYS * 2 - 1),
    CHART_DAYS,
  ).map((d) => d.liters);

  // The table below keeps to a week; the chart needed a fortnight.
  const lastSeven = (recent.data ?? []).filter((e) => e.date >= weekFrom);

  const payments = (allPaid.data ?? []).slice(0, PANEL_ROWS);

  // How the month has gone. Pending is counted, not left out: it is the one
  // state with no row in the database, and a ring built only from saved
  // entries would say "all delivered" on a month half of which has not been
  // entered yet.
  const monthRows = month.data ?? [];
  const soFar = Number(day.slice(8));
  const countOf = (key) =>
    monthRows.filter((e) => e.delivery_status === key).length;

  const byStatus = [
    { label: DAILY_ROW_STATUS.pending, color: "var(--ring-pending)", value: Math.max(0, soFar - monthRows.length) }, // prettier-ignore
    { label: DAILY_ROW_STATUS.delivered, color: "var(--ring-done)", value: countOf("delivered") }, // prettier-ignore
    { label: DAILY_ROW_STATUS.partial, color: "var(--ring-partial)", value: countOf("partial") }, // prettier-ignore
    { label: DAILY_ROW_STATUS.extra, color: "var(--ring-extra)", value: countOf("extra") }, // prettier-ignore
    { label: DAILY_ROW_STATUS.missed, color: "var(--ring-missed)", value: countOf("missed") }, // prettier-ignore
  ];

  return (
    <>
      <PageHeader
        title={`Hello, ${customer.name} — ${greeting()}`}
        subtitle={new Date().toLocaleDateString("en-IN", {
          timeZone: DAIRY_TZ,
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      />

      {/* Eight cards, eight hues, one each — and the hue belongs to the
          card, not to the news on it. Two of them used to turn red when
          something was wrong, which meant that on exactly the days somebody
          is looking hardest, two cards were wearing the same colour and the
          eye had nothing left to tell them apart by. Whether the news is bad
          is already said by the number and the line under it. The hues are
          the same ones, for the same things, as the dairy's own dashboard. */}
      <SectionLabel>Today</SectionLabel>
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 4, lg: 3 }}>
          <StatCard
            label="Today's milk"
            value={formatLiters(today.data?.actual_quantity ?? 0)}
            sub={DAILY_ROW_STATUS[todayStatus]}
            icon={LocalDrinkIcon}
            color="blue"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 4, lg: 3 }}>
          <StatCard
            label="Today's amount"
            value={formatAmount(today.data?.total_amount ?? 0)}
            icon={CurrencyRupeeIcon}
            color="green"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 4, lg: 3 }}>
          <StatCard
            label="My rate"
            value={`${formatRate(customer.rate_per_liter)} / L`}
            sub={`${formatLiters(customer.daily_quantity)} a day`}
            icon={SellIcon}
            color="violet"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 4, lg: 3 }}>
          <StatCard
            label="Amount due"
            value={formatAmount(baki)}
            sub={
              lastPaid
                ? `Last payment ${formatDate(lastPaid)}`
                : "No payments yet"
            }
            icon={AccountBalanceWalletIcon}
            color="amber"
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 6 }} />
      <SectionLabel>This month</SectionLabel>
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 4, lg: 3 }}>
          <StatCard
            label="This month's milk"
            value={formatLiters(sum(month.data, "actual_quantity"))}
            sub={`${month.data?.length ?? 0} days`}
            icon={LocalDrinkIcon}
            color="pink"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 4, lg: 3 }}>
          <StatCard
            label="This month's amount"
            value={formatAmount(sum(month.data, "total_amount"))}
            icon={CurrencyRupeeIcon}
            color="indigo"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 4, lg: 3 }}>
          <StatCard
            label="Missed this month"
            value={missedThisMonth}
            sub={missedThisMonth > 0 ? "days with no milk" : "nothing missed"}
            icon={LocalShippingIcon}
            color="red"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 4, lg: 3 }}>
          <StatCard
            label="My complaints"
            value={openProblems}
            sub={openProblems > 0 ? "awaiting a reply" : "all resolved"}
            icon={ReportProblemIcon}
            color="teal"
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 6 }} />
      <SectionLabel>Last 7 days</SectionLabel>
      {/* Written out here rather than through DataCards: this is a Server
          Component, and DataCards takes its columns as callbacks, which
          cannot cross that boundary. */}
      <Stack sx={{ ...cardsOnlyFlex, gap: 2 }}>
        {lastSeven.length === 0 && (
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
              No entries in the last 7 days.
            </Typography>
          </Paper>
        )}

        {lastSeven.map((e) => (
          <Paper
            key={e.date}
            elevation={0}
            sx={{
              p: 2,
              border: 1,
              borderColor: "divider",
              borderRadius: 2.5,
            }}
          >
            <Stack
              direction="row"
              sx={{ alignItems: "center", justifyContent: "space-between" }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {formatDate(e.date)}
              </Typography>
              <Chip
                size="small"
                label={DAILY_ROW_STATUS[e.delivery_status]}
                color={STATUS_COLOR[e.delivery_status]}
                variant={
                  e.delivery_status === "delivered" ? "filled" : "outlined"
                }
              />
            </Stack>
            <Stack sx={{ gap: 0.4, mt: 1.5 }}>
              {[
                ["Delivered", formatLiters(e.actual_quantity)],
                ["Amount", formatAmount(e.total_amount)],
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
        elevation={0}
        sx={{ border: 1, borderColor: "divider", ...tableOnly }}
      >
        <Table size="small">
          <TableHead>
            <TableRow
              sx={{ "& th": { fontWeight: 700, whiteSpace: "nowrap" } }}
            >
              <TableCell>Date</TableCell>
              <TableCell align="right">Delivered</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="center">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lastSeven.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 5 }}>
                  <Typography variant="body2" color="text.secondary">
                    No entries in the last 7 days.
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {lastSeven.map((e) => (
              <TableRow key={e.date} hover>
                <TableCell>{formatDate(e.date)}</TableCell>
                <TableCell align="right">
                  {formatLiters(e.actual_quantity)}
                </TableCell>
                <TableCell align="right">
                  {formatAmount(e.total_amount)}
                </TableCell>
                <TableCell align="center">
                  <Chip
                    size="small"
                    label={DAILY_ROW_STATUS[e.delivery_status]}
                    color={STATUS_COLOR[e.delivery_status]}
                    variant={
                      e.delivery_status === "delivered" ? "filled" : "outlined"
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 5 }} />
      <Grid container spacing={2} sx={{ alignItems: "stretch" }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Panel title="Milk report" sub="Litres you got each day">
            <Box sx={{ p: 2.5 }}>
              <MilkChart days={series} previous={lastWeek} />
            </Box>
          </Panel>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Panel title="My payments" sub="What you have paid">
            {payments.length === 0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ px: 2.5, py: 5, textAlign: "center" }}
              >
                You have not made a payment yet.
              </Typography>
            ) : (
              <Stack sx={{ px: 1.5, py: 1.5, gap: 0.25 }}>
                {payments.map((p) => (
                  <Stack
                    key={`${p.paid_on}-${p.amount}`}
                    direction="row"
                    sx={{ alignItems: "center", gap: 1.5, px: 1, py: 0.9 }}
                  >
                    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
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

        <Grid size={{ xs: 12, lg: 7 }}>
          <Panel title="This month" sub="How your milk has come">
            <StatusDonut
              slices={byStatus}
              total={soFar}
              note="days"
              figures={[
                {
                  label: "Milk this month",
                  value: formatLiters(sum(month.data, "actual_quantity")),
                },
                {
                  label: "Amount this month",
                  value: formatAmount(sum(month.data, "total_amount")),
                  color: "var(--tile-green-fg)",
                },
              ]}
            />
          </Panel>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Panel
            title="My complaints"
            sub={
              openProblems > 0
                ? `${openProblems} awaiting a reply`
                : "nothing open"
            }
          >
            {(problems.data ?? []).length === 0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ px: 2.5, py: 5, textAlign: "center" }}
              >
                You have not raised anything. Tell us if your milk is ever
                wrong.
              </Typography>
            ) : (
              <Stack>
                {problems.data.map((p, i) => (
                  <Stack
                    key={p.id}
                    direction="row"
                    sx={{
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 2,
                      px: 2.5,
                      py: 1.75,
                      borderTop: i === 0 ? 0 : 1,
                      borderColor: "divider",
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {p.message || "—"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(p.created_at)}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={PROBLEM_STATE[problemState(p.status)]}
                      color={STATUS_COLOR[problemState(p.status)]}
                      variant={
                        problemState(p.status) === "done"
                          ? "filled"
                          : "outlined"
                      }
                    />
                  </Stack>
                ))}
              </Stack>
            )}
          </Panel>
        </Grid>
      </Grid>
    </>
  );
}
