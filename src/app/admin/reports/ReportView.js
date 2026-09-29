"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
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
import DownloadIcon from "@mui/icons-material/Download";
import PrintIcon from "@mui/icons-material/Print";
import { formatAmount, formatLiters } from "@/lib/format";
import { tableOnly, cardsOnly } from "@/lib/responsive";
import DataCards from "@/components/DataCards";
import StatCard from "@/components/StatCard";
import LocalDrinkIcon from "@mui/icons-material/LocalDrink";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import RangePicker from "@/components/RangePicker";

/**
 * What is still owed for the period.
 *
 * Floored at zero: somebody who paid a whole span and is then looked at over
 * a later one has more money in than milk out, and a negative here would
 * only read as broken.
 */
const due = (r) => Math.max(0, Number(r.amount) - Number(r.paid));

/**
 * The same shortfall counted in litres.
 *
 * Worked out from the money rather than the days, because a span can hold
 * more than one rate and a payment is never tied to particular days. Owing a
 * fifteenth of the bill is owing a fifteenth of the milk, whatever the rate
 * was on any given morning.
 */
const litersDue = (r) => {
  const amount = Number(r.amount);
  if (amount <= 0) return 0;
  return (Number(r.liters) * due(r)) / amount;
};

/** Quotes a CSV field: commas, quotes and newlines all need escaping. */
const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

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

  const download = () => {
    const header = [
      "Customer",
      "Mobile",
      "Milk (L)",
      "Amount",
      "Received",
      "Due",
      "Due (L)",
    ];
    const body = rows.map((r) =>
      [r.label, r.sub, r.liters, r.amount, r.paid, due(r), litersDue(r)].map(
        csvCell,
      ),
    );

    // A BOM so Excel opens rupee signs and Gujarati text as UTF-8.
    const csv =
      "﻿" + [header.map(csvCell), ...body].map((r) => r.join(",")).join("\r\n");

    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `krishna-dairy-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

        {/* Their own row, so on a phone they sit side by side instead of
            becoming two full-width blocks in the column stack. */}
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            startIcon={<DownloadIcon sx={{ fontSize: 17 }} />}
            onClick={download}
            disabled={rows.length === 0}
          >
            Excel
          </Button>
          <Button
            size="small"
            startIcon={<PrintIcon sx={{ fontSize: 17 }} />}
            onClick={() => window.print()}
            disabled={rows.length === 0}
          >
            PDF / Print
          </Button>
        </Stack>
      </Stack>

      <Box sx={cardsOnly} className="no-print">
        <DataCards
          sx={{ width: "100%" }}
          items={rows}
          getKey={(r) => r.key}
          title={(r) => r.label}
          subtitle={(r) => r.sub}
          fields={(r) => [
            ["Milk", formatLiters(r.liters)],
            ["Amount", formatAmount(r.amount)],
            ["Received", formatAmount(r.paid)],
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
              <TableCell align="right" sx={{ width: "16%" }}>
                Milk
              </TableCell>
              <TableCell align="right" sx={{ width: "18%" }}>
                Amount
              </TableCell>
              <TableCell align="right" sx={{ width: "18%" }}>
                Received
              </TableCell>
              <TableCell align="right" sx={{ width: "16%" }}>
                Due
              </TableCell>
              <TableCell align="right" sx={{ width: "14%" }}>
                Due (milk)
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
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
