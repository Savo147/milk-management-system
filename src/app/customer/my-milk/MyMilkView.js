"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
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
import { formatAmount, formatDate, formatLiters } from "@/lib/format";
import { DELIVERY_STATUS, STATUS_COLOR } from "@/lib/constants";
import { tableOnly, cardsOnly } from "@/lib/responsive";
import RangePicker from "@/components/RangePicker";
import DataCards from "@/components/DataCards";
import StatCard from "@/components/StatCard";

export default function MyMilkView({
  entries,
  mode,
  from,
  to,
  monthFrom,
  monthTo,
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("all");

  const go = (nextMode, a, b) =>
    router.push(`/customer/my-milk?mode=${nextMode}&from=${a}&to=${b}`);

  const rows = useMemo(
    () =>
      statusFilter === "all"
        ? entries
        : entries.filter((e) => e.delivery_status === statusFilter),
    [entries, statusFilter],
  );

  // Totals follow the whole period, not the status filter — the filter is for
  // finding a particular day, and a total that moved with it would be a
  // different number every time you looked.
  const liters = entries.reduce((t, e) => t + Number(e.actual_quantity), 0);
  const amount = entries.reduce((t, e) => t + Number(e.total_amount), 0);
  const missed = entries.filter((e) => e.delivery_status === "missed").length;

  return (
    <>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Total milk" value={formatLiters(liters)} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            label="Total amount"
            value={formatAmount(amount)}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard label="Days" value={entries.length} color="info" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            label="Not received"
            value={missed}
            sub={missed > 0 ? "days" : ""}
            color={missed > 0 ? "error" : "success"}
          />
        </Grid>
      </Grid>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mb: 2, alignItems: { sm: "center" } }}
      >
        <RangePicker
          mode={mode}
          monthFrom={monthFrom}
          monthTo={monthTo}
          dateFrom={from}
          dateTo={to}
          onChange={go}
        />
        <Box sx={{ flexGrow: 1 }} />
        <TextField
          select
          size="small"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">All days</MenuItem>
          {Object.entries(DELIVERY_STATUS).map(([value, text]) => (
            <MenuItem key={value} value={value}>
              {text}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <DataCards
        sx={cardsOnly}
        items={rows}
        getKey={(e) => e.id}
        title={(e) => formatDate(e.date)}
        badge={(e) => (
          <Chip
            size="small"
            label={DELIVERY_STATUS[e.delivery_status]}
            color={STATUS_COLOR[e.delivery_status]}
            variant={e.delivery_status === "delivered" ? "filled" : "outlined"}
          />
        )}
        fields={(e) => [
          ["Delivered", formatLiters(e.actual_quantity)],
          ["Rate", `${formatAmount(e.rate_per_liter)} / L`],
          ["Amount", formatAmount(e.total_amount)],
        ]}
        empty={
          entries.length === 0
            ? "No entries in this period."
            : "No days with this status."
        }
      />

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ border: 1, borderColor: "divider", ...tableOnly }}
      >
        <Table size="small" sx={{ minWidth: 560 }}>
          <TableHead>
            <TableRow
              sx={{ "& th": { fontWeight: 700, whiteSpace: "nowrap" } }}
            >
              <TableCell>Date</TableCell>
              <TableCell align="right">Delivered</TableCell>
              <TableCell align="right">Rate</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="center">Status</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    {entries.length === 0
                      ? "No entries in this period."
                      : "No days with this status."}
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {rows.map((e) => (
              <TableRow key={e.id} hover>
                <TableCell>{formatDate(e.date)}</TableCell>
                <TableCell
                  align="right"
                  sx={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {formatLiters(e.actual_quantity)}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {formatAmount(e.rate_per_liter)}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}
                >
                  {formatAmount(e.total_amount)}
                </TableCell>
                <TableCell align="center">
                  <Chip
                    size="small"
                    label={DELIVERY_STATUS[e.delivery_status]}
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

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mt: 1.5, display: "block" }}
      >
        Each day shows the rate as it was that day — changing the rate later
        does not alter past days.
      </Typography>
    </>
  );
}
