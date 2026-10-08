"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SearchIcon from "@mui/icons-material/Search";
import { formatAmount, formatDate, formatLiters } from "@/lib/format";
import { tableOnly, cardsOnly } from "@/lib/responsive";
import DataCards from "@/components/DataCards";
import StatCard from "@/components/StatCard";
import LocalDrinkIcon from "@mui/icons-material/LocalDrink";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import RangePicker from "@/components/RangePicker";

/**
 * What is still owed for the period, and the same thing in litres.
 *
 * Both are worked out on the server, day by day, against the date the last
 * payment settled up to — see the page. They used to be worked out here as
 * "this period's amount minus this period's payments", which read sensibly
 * and was wrong: February's ₹2,500 handed over in March wiped out March's
 * own ₹2,400, and a month in which nothing had been paid for showed as
 * settled.
 */
const due = (r) => Number(r.due ?? 0);
const litersDue = (r) => Number(r.due_liters ?? 0);

/**
 * "15 Mar 2026 · Rs2,500 · 35 L" — the last payment of the period, and what
 * it was for.
 *
 * The litres are not the period's: money handed over in March is usually for
 * milk that went out in February, so they are counted from the payment
 * before it. The page works that out; this only writes it down.
 */
function lastPaymentText(r) {
  if (!r.last_paid_on) return "—";

  const parts = [formatDate(r.last_paid_on), formatAmount(r.last_paid_amount)];
  if (r.last_paid_liters > 0) parts.push(formatLiters(r.last_paid_liters));
  return parts.join(" · ");
}

export default function ReportView({
  mode,
  from,
  to,
  monthFrom,
  monthTo,
  rows: allRows = [],
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const go = (nextMode, a, b) =>
    router.push(`/admin/reports?mode=${nextMode}&from=${a}&to=${b}`);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter(
      (r) => r.label.toLowerCase().includes(q) || (r.sub ?? "").includes(q),
    );
  }, [allRows, query]);

  // "Last payment" is deliberately not in here: a column of dates has no
  // total, and the biggest of them would answer a question nobody asked.
  const totals = useMemo(
    () =>
      rows.reduce(
        (t, r) => ({
          liters: t.liters + Number(r.liters),
          amount: t.amount + Number(r.amount),
          paid: t.paid + Number(r.paid),
          due: t.due + due(r),
          litersDue: t.litersDue + litersDue(r),
        }),
        { liters: 0, amount: 0, paid: 0, due: 0, litersDue: 0 },
      ),
    [rows],
  );

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <StatCard
            label="Total milk"
            value={formatLiters(totals.liters)}
            icon={LocalDrinkIcon}
            color="blue"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <StatCard
            label="Total amount"
            value={formatAmount(totals.amount)}
            icon={CurrencyRupeeIcon}
            color="green"
          />
        </Grid>
      </Grid>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{ mb: 2, alignItems: { md: "center" } }}
        className="no-print"
      >
        <RangePicker
          mode={mode}
          monthFrom={monthFrom}
          monthTo={monthTo}
          dateFrom={from}
          dateTo={to}
          onChange={go}
        />

        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search customer"
          size="small"
          sx={{ flexGrow: 1, maxWidth: { md: 280 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />

        <Box sx={{ flexGrow: 1 }} />
      </Stack>

      <Box sx={cardsOnly} className="no-print">
        <DataCards
          sx={{ width: "100%" }}
          items={rows}
          getKey={(r) => r.key}
          title={(r) => r.label}
          subtitle={(r) => r.sub}
          fields={(r) => [
            ["Total milk", formatLiters(r.liters)],
            ["Total amount", formatAmount(r.amount)],
            ["Received", formatAmount(r.paid)],
            ["Last payment", lastPaymentText(r)],
            ["Due", formatAmount(due(r))],
            ["Due (milk)", formatLiters(litersDue(r))],
          ]}
          empty="No records in this period."
        />

        {/* The table's footer row, which has nowhere to live among cards.
            Without it the phone would be missing the received and due
            totals altogether. */}
        {rows.length > 0 && (
          <Paper
            elevation={0}
            sx={{
              mt: 1.25,
              p: 2,
              border: 1,
              borderColor: "divider",
              borderRadius: 2.5,
              bgcolor: "grey.50",
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Total ({rows.length})
            </Typography>
            <Stack sx={{ gap: 0.4, mt: 1.5 }}>
              {[
                ["Milk", formatLiters(totals.liters)],
                ["Amount", formatAmount(totals.amount)],
                ["Received", formatAmount(totals.paid)],
                ["Due", formatAmount(totals.due)],
                ["Due (milk)", formatLiters(totals.litersDue)],
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
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {value}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>
        )}
      </Box>

      <TableContainer
        component={Paper}
        sx={{
          border: 1,
          borderColor: "divider",
          ...tableOnly,
          // Printing from a phone would otherwise produce a blank page: the
          // cards carry no-print, and the table is hidden at that width.
          // Paper is one size, so the table is what goes on it.
          "@media print": { display: "block" },
        }}
      >
        <Table size="small" sx={{ minWidth: 860 }}>
          <TableHead>
            <TableRow>
              <TableCell>Customer</TableCell>
              {/* The period's whole figure, not what is left of it — the
                  two "Due" columns further along are the leftover. */}
              <TableCell align="right" sx={{ width: "14%" }}>
                Total milk
              </TableCell>
              <TableCell align="right" sx={{ width: "15%" }}>
                Total amount
              </TableCell>
              <TableCell align="right" sx={{ width: "14%" }}>
                Received
              </TableCell>
              <TableCell align="center" sx={{ width: "20%" }}>
                Last payment
              </TableCell>
              <TableCell align="right" sx={{ width: "13%" }}>
                Due
              </TableCell>
              <TableCell align="right" sx={{ width: "12%" }}>
                Due (milk)
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    No records in this period.
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {rows.map((r) => (
              <TableRow key={r.key} hover>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {r.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {r.sub}
                  </Typography>
                </TableCell>

                <TableCell align="right">{formatLiters(r.liters)}</TableCell>

                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  {formatAmount(r.amount)}
                </TableCell>

                <TableCell align="right">{formatAmount(r.paid)}</TableCell>

                {/* When they last paid inside this period, how much, and
                    the milk it settled. */}
                <TableCell align="center">
                  {r.last_paid_on ? (
                    <>
                      <Typography variant="body2">
                        {formatDate(r.last_paid_on)}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {formatAmount(r.last_paid_amount)}
                        {r.last_paid_liters > 0 &&
                          ` · ${formatLiters(r.last_paid_liters)}`}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="caption" sx={{ color: "text.disabled" }}>
                      —
                    </Typography>
                  )}
                </TableCell>

                <TableCell
                  align="right"
                  sx={{
                    fontWeight: 600,
                    color: due(r) > 0 ? "warning.dark" : "text.secondary",
                  }}
                >
                  {formatAmount(due(r))}
                </TableCell>

                <TableCell
                  align="right"
                  sx={{ color: due(r) > 0 ? "warning.dark" : "text.secondary" }}
                >
                  {formatLiters(litersDue(r))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
