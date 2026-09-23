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
import { createClient } from "@/lib/supabase/server";
import { requireCustomerAccount } from "@/lib/auth";
import { formatAmount, formatDate, formatLiters } from "@/lib/format";
import { monthStart, todayLocal } from "@/lib/range";
import {
  DAILY_ROW_STATUS,
  STATUS_COLOR,
  PROBLEM_STATE,
  problemState,
} from "@/lib/constants";
import PageHeader from "@/components/PageHeader";
import StatCard, { SectionLabel } from "@/components/StatCard";
import NotLinked from "@/components/NotLinked";

export const metadata = { title: "Dashboard — Krishna Dairy" };

const sum = (rows, key) =>
  (rows ?? []).reduce((t, r) => t + Number(r[key] ?? 0), 0);

/** Date n days back from today, as local YYYY-MM-DD. */
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const pad = (v) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
      .select("actual_quantity, total_amount")
      .eq("customer_id", customer.id)
      .gte("date", monthStart()),
    // Baki is an all-time figure on purpose: what is owed does not reset when
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
      .gte("date", daysAgo(6))
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
  // Paying ahead leaves payments above the milk; a negative Baki would just
  // read as broken.
  const baki = Math.max(0, billed - paid);
  const lastPaid = allPaid.data?.[0]?.paid_on ?? null;

  const openProblems = (problems.data ?? []).filter(
    (p) => problemState(p.status) === "pending",
  ).length;

  // No row saved for today yet is not the same as a missed delivery.
  const todayStatus = today.data?.delivery_status ?? "pending";

  return (
    <>
      <PageHeader
        title={`Namaste, ${customer.name}`}
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
            value={formatLiters(today.data?.actual_quantity ?? 0)}
            sub={DAILY_ROW_STATUS[todayStatus]}
            icon={LocalDrinkIcon}
            color={
              todayStatus === "missed"
                ? "error"
                : todayStatus === "pending"
                  ? "warning"
                  : "primary"
            }
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard
            label="Aaj ni rakam"
            value={formatAmount(today.data?.total_amount ?? 0)}
            icon={CurrencyRupeeIcon}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard
            label="Maro rate"
            value={`${formatAmount(customer.rate_per_liter)} / L`}
            sub={`Roj ${formatLiters(customer.daily_quantity)}`}
            icon={SellIcon}
            color="info"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard
            label="Baki rakam"
            value={formatAmount(baki)}
            sub={
              lastPaid
                ? `Chhelli payment ${formatDate(lastPaid)}`
                : "Hju koi payment nathi"
            }
            icon={AccountBalanceWalletIcon}
            color={baki > 0 ? "warning" : "success"}
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }} />
      <SectionLabel>Aa mahino</SectionLabel>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard
            label="Aa mahina nu dudh"
            value={formatLiters(sum(month.data, "actual_quantity"))}
            sub={`${month.data?.length ?? 0} divas`}
            icon={LocalDrinkIcon}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard
            label="Aa mahina ni rakam"
            value={formatAmount(sum(month.data, "total_amount"))}
            icon={CurrencyRupeeIcon}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <StatCard
            label="Mari fariyado"
            value={openProblems}
            sub={
              openProblems > 0 ? "jawab ni raah ma" : "badhu solve thai gayu"
            }
            icon={ReportProblemIcon}
            color={openProblems > 0 ? "warning" : "success"}
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }} />
      <SectionLabel>Chhella 7 divas</SectionLabel>
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ border: 1, borderColor: "divider" }}
      >
        <Table size="small">
          <TableHead>
            <TableRow
              sx={{ "& th": { fontWeight: 700, whiteSpace: "nowrap" } }}
            >
              <TableCell>Tarikh</TableCell>
              <TableCell align="right">Aapyu</TableCell>
              <TableCell align="right">Rakam</TableCell>
              <TableCell align="center">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(recent.data ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 5 }}>
                  <Typography variant="body2" color="text.secondary">
                    Chhella 7 divas ma koi entry nathi.
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {(recent.data ?? []).map((e) => (
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

      {(problems.data ?? []).length > 0 && (
        <>
          <Box sx={{ mt: 4 }} />
          <SectionLabel>Chhelli fariyado</SectionLabel>
          <Stack spacing={1.5}>
            {problems.data.map((p) => (
              <Paper
                key={p.id}
                elevation={0}
                sx={{ p: 2, border: 1, borderColor: "divider" }}
              >
                <Stack
                  direction="row"
                  sx={{
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
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
                      problemState(p.status) === "done" ? "filled" : "outlined"
                    }
                  />
                </Stack>
              </Paper>
            ))}
          </Stack>
        </>
      )}
    </>
  );
}
