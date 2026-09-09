"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
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
import { BILL_STATUS, STATUS_COLOR } from "@/lib/constants";
import { formatAmount, formatLiters } from "@/lib/format";
import PaymentDialog from "./PaymentDialog";

export default function HisabTable({ month, bills }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paying, setPaying] = useState(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bills.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (!q) return true;
      return (
        b.customer_name.toLowerCase().includes(q) ||
        (b.customer_mobile ?? "").includes(q)
      );
    });
  }, [bills, query, statusFilter]);

  return (
    <>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mb: 2, alignItems: { sm: "center" } }}
      >
        <TextField
          type="month"
          label="Mahino"
          size="small"
          value={month}
          onChange={(e) => router.push(`/admin/hisab?month=${e.target.value}`)}
          sx={{ minWidth: 170 }}
        />
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Customer shodho"
          size="small"
          sx={{ flexGrow: 1, maxWidth: { sm: 300 } }}
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
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="all">Badha</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="done">Done</MenuItem>
        </TextField>
      </Stack>

      <TableContainer component={Paper} sx={{ border: 1, borderColor: "divider" }}>
        <Table size="small" sx={{ minWidth: 820 }}>
          <TableHead>
            <TableRow>
              <TableCell>Customer</TableCell>
              <TableCell align="right">Dudh</TableCell>
              <TableCell align="right">Total rakam</TableCell>
              <TableCell align="right">Mali gayu</TableCell>
              <TableCell align="right">Baki</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Payment</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    {bills.length === 0
                      ? 'Aa mahina na bill hju banya nathi. Upar "Bill taiyar karo" dabavo.'
                      : "Aa shodh mate koi bill nathi malyu."}
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {rows.map((b) => (
              <TableRow key={b.id} hover>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {b.customer_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {b.customer_mobile}
                  </Typography>
                </TableCell>

                <TableCell align="right">
                  {formatLiters(b.total_liters)}
                </TableCell>

                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  {formatAmount(b.total_amount)}
                </TableCell>

                <TableCell align="right">
                  {formatAmount(b.received_amount)}
                </TableCell>

                <TableCell
                  align="right"
                  sx={{
                    fontWeight: 600,
                    color:
                      Number(b.remaining_amount) > 0
                        ? "warning.dark"
                        : "text.secondary",
                  }}
                >
                  {formatAmount(b.remaining_amount)}
                </TableCell>

                <TableCell>
                  <Chip
                    size="small"
                    label={BILL_STATUS[b.status]}
                    color={STATUS_COLOR[b.status]}
                    variant={b.status === "done" ? "filled" : "outlined"}
                  />
                </TableCell>

                <TableCell align="right">
                  <Button size="small" onClick={() => setPaying(b)}>
                    Rakam nakho
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          {rows.length} / {bills.length} bills
        </Typography>
      </Box>

      <PaymentDialog bill={paying} onClose={() => setPaying(null)} />
    </>
  );
}
