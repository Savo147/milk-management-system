"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableFooter from "@mui/material/TableFooter";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SearchIcon from "@mui/icons-material/Search";
import DownloadIcon from "@mui/icons-material/Download";
import PrintIcon from "@mui/icons-material/Print";
import { formatAmount, formatLiters } from "@/lib/format";
import RangePicker from "@/components/RangePicker";

function Summary({ label, value }) {
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
          sx={{ mt: 0.5, fontVariantNumeric: "tabular-nums" }}
        >
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

/** Quotes a CSV field: commas, quotes and newlines all need escaping. */
const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export default function ReportView({
  mode,
  from,
  to,
  monthFrom,
  monthTo,
  label,
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
          baki: t.baki + Number(r.baki),
        }),
        { liters: 0, amount: 0, paid: 0, baki: 0 },
      ),
    [rows],
  );

  const download = () => {
    const header = [
      "Customer",
      "Mobile",
      "Dudh (L)",
      "Rakam",
      "Mali gayu",
      "Baki",
    ];
    const body = rows.map((r) =>
      [r.label, r.sub, r.liters, r.amount, r.paid, r.baki].map(csvCell),
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
          <Summary label="Total dudh" value={formatLiters(totals.liters)} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Summary label="Total rakam" value={formatAmount(totals.amount)} />
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
          placeholder="Customer shodho"
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

      <TableContainer
        component={Paper}
        sx={{ border: 1, borderColor: "divider" }}
      >
        <Table size="small" sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow>
              <TableCell>Customer</TableCell>
              <TableCell align="center" sx={{ width: "16%" }}>
                Dudh
              </TableCell>
              <TableCell align="center" sx={{ width: "18%" }}>
                Rakam
              </TableCell>
              <TableCell align="center" sx={{ width: "18%" }}>
                Mali gayu
              </TableCell>
              <TableCell align="center" sx={{ width: "18%" }}>
                Baki
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    Aa gala ma koi nondh nathi.
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

                <TableCell align="center">{formatLiters(r.liters)}</TableCell>

                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  {formatAmount(r.amount)}
                </TableCell>

                <TableCell align="center">{formatAmount(r.paid)}</TableCell>

                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 600,
                    color: r.baki > 0 ? "warning.dark" : "text.secondary",
                  }}
                >
                  {formatAmount(r.baki)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>

          {rows.length > 0 && (
            <TableFooter>
              <TableRow
                sx={{ "& td": { fontWeight: 700, color: "text.primary" } }}
              >
                <TableCell>Total ({rows.length})</TableCell>
                <TableCell align="center">
                  {formatLiters(totals.liters)}
                </TableCell>
                <TableCell align="center">
                  {formatAmount(totals.amount)}
                </TableCell>
                <TableCell align="center">
                  {formatAmount(totals.paid)}
                </TableCell>
                <TableCell align="center">
                  {formatAmount(totals.baki)}
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </TableContainer>

      <Typography
        variant="caption"
        sx={{ mt: 1.5, display: "block", color: "text.secondary" }}
      >
        {label}
      </Typography>
    </Box>
  );
}
