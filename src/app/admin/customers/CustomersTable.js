"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
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
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import { formatAmount, formatLiters } from "@/lib/format";
import { STATUS_COLOR, ACCOUNT_STATUS } from "@/lib/constants";
import { tableOnly, cardsOnly } from "@/lib/responsive";
import DataCards from "@/components/DataCards";
import CustomerDialog from "./CustomerDialog";

export default function CustomersTable({ customers }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState(undefined); // undefined = closed

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        (c.address ?? "").toLowerCase().includes(q)
      );
    });
  }, [customers, query, statusFilter]);

  return (
    <>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mb: 2, alignItems: { sm: "center" } }}
      >
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, mobile or address"
          size="small"
          sx={{ flexGrow: 1, maxWidth: { sm: 360 } }}
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
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
        </TextField>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setEditing(null)}
        >
          New customer
        </Button>
      </Stack>

      {/* One card per customer on a phone; the table below takes over from
          md up. Both walk the same filtered rows. */}
      <DataCards
        sx={cardsOnly}
        items={rows}
        getKey={(c) => c.id}
        title={(c) => c.name}
        subtitle={(c) => c.mobile}
        badge={(c) => (
          <Chip
            size="small"
            label={ACCOUNT_STATUS[c.status]}
            color={STATUS_COLOR[c.status]}
            variant={c.status === "active" ? "filled" : "outlined"}
          />
        )}
        fields={(c) => [
          ["Daily milk", formatLiters(c.daily_quantity)],
          ["Rate", `${formatAmount(c.rate_per_liter)} / L`],
          c.address && ["Address", c.address],
          c.login_email && ["Login", c.login_email],
        ]}
        actions={(c) => (
          <Button
            size="small"
            startIcon={<EditIcon sx={{ fontSize: 17 }} />}
            onClick={() => setEditing(c)}
          >
            Edit
          </Button>
        )}
        empty={
          customers.length === 0
            ? 'No customers yet. Click "New customer".'
            : "No customer matches this search."
        }
      />

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ border: 1, borderColor: "divider", ...tableOnly }}
      >
        <Table size="small" sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow
              sx={{ "& th": { fontWeight: 700, whiteSpace: "nowrap" } }}
            >
              <TableCell>Name</TableCell>
              <TableCell>Mobile</TableCell>
              <TableCell align="right">Daily milk</TableCell>
              <TableCell align="right">Rate</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Edit</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    {customers.length === 0
                      ? 'No customers yet. Click "New customer".'
                      : "No customer matches this search."}
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {rows.map((c) => (
              <TableRow key={c.id} hover>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {c.name}
                  </Typography>
                  {c.address && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block" }}
                    >
                      {c.address}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{c.mobile}</TableCell>
                <TableCell align="right">
                  {formatLiters(c.daily_quantity)}
                </TableCell>
                <TableCell align="right">
                  {formatAmount(c.rate_per_liter)}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={ACCOUNT_STATUS[c.status]}
                    color={STATUS_COLOR[c.status]}
                    variant={c.status === "active" ? "filled" : "outlined"}
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => setEditing(c)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
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
        {rows.length} / {customers.length} customers
      </Typography>

      <CustomerDialog
        open={editing !== undefined}
        customer={editing ?? null}
        onClose={() => setEditing(undefined)}
      />
    </>
  );
}
