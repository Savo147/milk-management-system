"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
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
import SelectField from "@/components/SelectField";
import Typography from "@mui/material/Typography";
import SearchIcon from "@mui/icons-material/Search";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import EditIcon from "@mui/icons-material/Edit";
import { BILL_STATUS, STATUS_COLOR } from "@/lib/constants";
import { formatAmount, formatDate, formatLiters } from "@/lib/format";
import { tableOnly, cardsOnly } from "@/lib/responsive";
import DataCards from "@/components/DataCards";
import StatCard from "@/components/StatCard";
import LocalDrinkIcon from "@mui/icons-material/LocalDrink";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import RangePicker from "@/components/RangePicker";
import PaymentDialog from "./PaymentDialog";

/**
 * Settled once nothing is owed — the whole account, not the month on screen.
 * It used to compare the span's payments against the span's milk, which read
 * "done" for a month somebody happened to pay inside while a older bill of
 * theirs was still open.
 */
const statusOf = (row) => (Number(row.due) > 0 ? "pending" : "done");

/** "06 Oct 2026 · ₹2,500 · 35 L" — the whole last payment in one line. */
function lastPaymentText(row) {
  if (!row.last_paid_on) return "None yet";

  const parts = [formatDate(row.last_paid_on), formatAmount(row.last_paid_amount)];
  if (row.last_paid_liters > 0) parts.push(formatLiters(row.last_paid_liters));
  return parts.join(" · ");
}

export default function BillingTable({
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

  // Totalled from what is on screen, not from everyone. Search one customer
  // and these say what that customer owes — which is the question being asked
  // when somebody types a name into the box.
  const sums = useMemo(() => {
    const liters = rows.reduce((t, r) => t + Number(r.total_liters), 0);
    const total = rows.reduce((t, r) => t + Number(r.total_amount), 0);
    // Not another rupee figure — "To pay" above is already that, and a
    // second card saying the same number twice is just noise. This says how
    // many of them it is spread across.
    const owing = rows.filter((r) => Number(r.due) > 0).length;

    return { liters, total, owing };
  }, [rows]);

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
          placeholder="Search customer"
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

        <SelectField
          size="small"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 130 }}
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="done">Done</MenuItem>
        </SelectField>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 4 }}>
          <StatCard
            label="To pay"
            value={formatAmount(sums.total)}
            sub="since the last payment"
            icon={CurrencyRupeeIcon}
            color="green"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 4 }}>
          <StatCard
            label="Milk since payment"
            value={formatLiters(sums.liters)}
            icon={LocalDrinkIcon}
            color="blue"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard
            label="Customers owing"
            value={sums.owing}
            sub={sums.owing > 0 ? "still to collect from" : "all settled"}
            icon={AccountBalanceWalletIcon}
            color="amber"
          />
        </Grid>
      </Grid>

      <DataCards
        sx={cardsOnly}
        items={rows}
        getKey={(r) => r.id}
        title={(r) => r.customer_name}
        subtitle={(r) => r.customer_mobile}
        badge={(r) => {
          const status = statusOf(r);
          return (
            <Chip
              size="small"
              label={BILL_STATUS[status]}
              color={STATUS_COLOR[status]}
              variant={status === "done" ? "filled" : "outlined"}
            />
          );
        }}
        fields={(r) => [
          ["Milk since payment", formatLiters(r.total_liters)],
          ["To pay", formatAmount(r.total_amount)],
          ["Last payment", lastPaymentText(r)],
        ]}
        actions={(r) =>
          statusOf(r) === "done" ? (
            <Button
              size="small"
              color="inherit"
              startIcon={<EditIcon sx={{ fontSize: 16 }} />}
              onClick={() => setPaying(r)}
              sx={{ color: "text.secondary" }}
            >
              Add payment
            </Button>
          ) : (
            <Button
              size="small"
              variant="outlined"
              fullWidth
              startIcon={<CurrencyRupeeIcon sx={{ fontSize: 16 }} />}
              onClick={() => setPaying(r)}
            >
              Payment
            </Button>
          )
        }
        empty={
          allRows.length === 0
            ? "No records in this period."
            : "Nothing matches this search."
        }
      />

      <TableContainer
        component={Paper}
        sx={{ border: 1, borderColor: "divider", ...tableOnly }}
      >
        <Table size="small" sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow>
              <TableCell>Customer</TableCell>
              <TableCell align="right" sx={{ width: "15%" }}>
                Milk since payment
              </TableCell>
              <TableCell align="right" sx={{ width: "15%" }}>
                To pay
              </TableCell>
              <TableCell align="center" sx={{ width: "19%" }}>
                Last payment
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
                      ? "No records in this period."
                      : "Nothing matches this search."}
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

                  <TableCell align="right">
                    {formatLiters(r.total_liters)}
                  </TableCell>

                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    {formatAmount(r.total_amount)}
                  </TableCell>

                  {/* When, how much, and what it was for. "35 L nu ₹2500" is
                      the sentence the dairy says out loud, so it is the one
                      the column prints. */}
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
                      <Typography
                        variant="caption"
                        sx={{ color: "text.disabled" }}
                      >
                        None yet
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
                        Add payment
                      </Button>
                    ) : (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<CurrencyRupeeIcon sx={{ fontSize: 16 }} />}
                        onClick={() => setPaying(r)}
                      >
                        Payment
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
        to={to}
        today={today}
        onClose={() => setPaying(null)}
      />
    </>
  );
}
