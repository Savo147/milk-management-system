"use client";

import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
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
import PaymentsIcon from "@mui/icons-material/Payments";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { formatAmount, formatDate, formatLiters } from "@/lib/format";
import RangePicker from "@/components/RangePicker";
import StatCard, { SectionLabel } from "@/components/StatCard";

export default function MyHisabView({
  mode,
  from,
  to,
  monthFrom,
  monthTo,
  liters,
  billed,
  received,
  baki,
  totalBaki,
  lastPaidOn,
  payments,
  days,
}) {
  const router = useRouter();

  const go = (nextMode, a, b) =>
    router.push(`/customer/my-hisab?mode=${nextMode}&from=${a}&to=${b}`);

  return (
    <>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mb: 3, alignItems: { sm: "center" } }}
      >
        <RangePicker
          mode={mode}
          monthFrom={monthFrom}
          monthTo={monthTo}
          dateFrom={from}
          dateTo={to}
          onChange={go}
        />
      </Stack>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            label="Total dudh"
            value={formatLiters(liters)}
            sub={`${days} divas`}
            icon={LocalDrinkIcon}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            label="Total rakam"
            value={formatAmount(billed)}
            icon={CurrencyRupeeIcon}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            label="Apeli payment"
            value={formatAmount(received)}
            sub={`${payments.length} var`}
            icon={PaymentsIcon}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            label="Aa gala nu baki"
            value={formatAmount(baki)}
            icon={AccountBalanceWalletIcon}
            color={baki > 0 ? "warning" : "success"}
          />
        </Grid>
      </Grid>

      <Alert
        severity={totalBaki > 0 ? "warning" : "success"}
        icon={<AccountBalanceWalletIcon fontSize="small" />}
        sx={{ mb: 3 }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          sx={{ alignItems: { sm: "baseline" }, gap: 1, flexWrap: "wrap" }}
        >
          <Typography variant="body2">
            <strong>Kul baki (aaj sudhi nu):</strong> {formatAmount(totalBaki)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {lastPaidOn
              ? `Chhelli payment ${formatDate(lastPaidOn)} na roj`
              : "Hju koi payment nathi apai"}
          </Typography>
        </Stack>
      </Alert>

      <SectionLabel>Apeli payment</SectionLabel>
      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ border: 1, borderColor: "divider" }}
      >
        <Table size="small" sx={{ minWidth: 420 }}>
          <TableHead>
            <TableRow
              sx={{ "& th": { fontWeight: 700, whiteSpace: "nowrap" } }}
            >
              <TableCell>Tarikh</TableCell>
              <TableCell align="right">Rakam</TableCell>
              <TableCell>Nondh</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    Aa gala ma koi payment nondhai nathi.
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {payments.map((p) => (
              <TableRow key={p.id} hover>
                <TableCell>{formatDate(p.paid_on)}</TableCell>
                <TableCell
                  align="right"
                  sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}
                >
                  {formatAmount(p.amount)}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {p.note || "—"}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          Payment dairy nondhe chhe. Kai far padto lage to Report Problem par
          jaine kaho.
        </Typography>
      </Box>
    </>
  );
}
