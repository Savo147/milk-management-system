"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
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
import SearchIcon from "@mui/icons-material/Search";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import EditIcon from "@mui/icons-material/Edit";
import { BILL_STATUS, STATUS_COLOR } from "@/lib/constants";
import { formatAmount, formatDate, formatLiters } from "@/lib/format";
import RangePicker from "./RangePicker";
import PaymentDialog from "./PaymentDialog";

/** Settled once the money in matches the milk out for the shown span. */
const statusOf = (row) =>
  Number(row.received_amount) >= Number(row.total_amount) ? "done" : "pending";

export default function HisabTable({
  mode,
  from,
  to,
  monthFrom,
  monthTo,
  rows: allRows = [],
  today,
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paying, setPaying] = useState(null);

  const go = (nextMode, a, b) =>
    router.push(`/admin/hisab?mode=${nextMode}&from=${a}&to=${b}`);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allRows.filter((r) => {
      if (statusFilter !== "all" && statusOf(r) !== statusFilter) return false;
      if (!q) return true;
      return (
        r.customer_name.toLowerCase().includes(q) ||
        (r.customer_mobile ?? "").includes(q)
      );
    });
  }, [allRows, query, statusFilter]);

  return (
    <>
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

        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Customer shodho"
          size="small"
          sx={{ flexGrow: 1, maxWidth: { sm: 280 } }}
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

        <TextField
          select
          size="small"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 130 }}
        >
          <MenuItem value="all">Badha</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="done">Done</MenuItem>
        </TextField>
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
                Total rakam
              </TableCell>
              <TableCell align="center" sx={{ width: "15%" }}>
                Chhellu payment
              </TableCell>
              <TableCell align="center" sx={{ width: "14%" }}>
                Status
              </TableCell>
              <TableCell align="center" sx={{ width: "16%" }}>
                Payment
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    {allRows.length === 0
                      ? "Aa gala ma koi nondh nathi."
                      : "Aa shodh mate kai nathi malyu."}
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {rows.map((r) => {
              const status = statusOf(r);
              return (
                <TableRow key={r.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {r.customer_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {r.customer_mobile}
                    </Typography>
                  </TableCell>

                  <TableCell align="center">
                    {formatLiters(r.total_liters)}
                  </TableCell>

                  <TableCell align="center" sx={{ fontWeight: 600 }}>
                    {formatAmount(r.total_amount)}
                  </TableCell>

                  <TableCell align="center">
                    {r.last_paid_on ? (
                      formatDate(r.last_paid_on)
                    ) : (
                      <Typography
                        variant="caption"
                        sx={{ color: "text.disabled" }}
                      >
                        —
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell align="center">
                    <Chip
                      size="small"
                      label={BILL_STATUS[status]}
                      color={STATUS_COLOR[status]}
                      variant={status === "done" ? "filled" : "outlined"}
                    />
                  </TableCell>

                  <TableCell align="center">
                    {status === "done" ? (
                      <Button
                        size="small"
                        color="inherit"
                        startIcon={<EditIcon sx={{ fontSize: 16 }} />}
                        onClick={() => setPaying(r)}
                        sx={{ color: "text.secondary" }}
                      >
                        Sudharo
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<CurrencyRupeeIcon sx={{ fontSize: 16 }} />}
                        onClick={() => setPaying(r)}
                      >
                        Payment lo
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <PaymentDialog
        row={paying}
        from={from}
        to={to}
        today={today}
        onClose={() => setPaying(null)}
      />
    </>
  );
}
