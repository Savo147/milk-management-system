"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import Menu from "@mui/material/Menu";
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
import SearchIcon from "@mui/icons-material/Search";
import SaveIcon from "@mui/icons-material/Save";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import {
  DAILY_ROW_STATUS,
  MILK_QUANTITIES,
  STATUS_COLOR,
} from "@/lib/constants";
import { formatAmount, formatLiters } from "@/lib/format";
import { saveOneEntry } from "./actions";

/**
 * − 2.5 L + stepper. Half-litre steps are the only quantities the business
 * allows and the database rejects anything else, so free typing would only
 * invite errors.
 */
function QuantityPicker({ value, onChange, changed }) {
  const n = Number(value);
  const [anchorEl, setAnchorEl] = useState(null);

  const choose = (q) => {
    onChange(String(q));
    setAnchorEl(null);
  };

  return (
    <>
      <ButtonBase
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-label="Quantity pasand karo"
        sx={{
          pl: 1,
          pr: 0.25,
          py: 0.4,
          minWidth: 76,
          gap: 0.25,
          justifyContent: "space-between",
          border: 1,
          borderColor: changed ? "primary.main" : "divider",
          borderRadius: 1.5,
          bgcolor: "background.paper",
          "&:hover": { bgcolor: "grey.50", borderColor: "grey.400" },
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            color: n === 0 ? "error.main" : "text.primary",
          }}
        >
          {n} L
        </Typography>
        <ArrowDropDownIcon sx={{ fontSize: 18, color: "text.secondary" }} />
      </ButtonBase>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{
          list: { dense: true, sx: { py: 0.5 } },
          paper: {
            sx: {
              minWidth: 96,
              maxHeight: 196,
              // Scrolling still works — only the scrollbar is hidden, since a
              // visible one on a popup this narrow looks broken.
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              "&::-webkit-scrollbar": { display: "none" },
              "& .MuiMenuItem-root": {
                minHeight: 28,
                py: 0.25,
                fontSize: "0.8rem",
              },
            },
          },
        }}
      >
        <MenuItem selected={n === 0} onClick={() => choose(0)}>
          0 L
        </MenuItem>
        {MILK_QUANTITIES.map((q) => (
          <MenuItem key={q} selected={n === q} onClick={() => choose(q)}>
            {q} L
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

function Total({ label, value }) {
  return (
    <Box>
      <Typography
        variant="caption"
        sx={{ color: "text.secondary", display: "block", lineHeight: 1.4 }}
      >
        {label}
      </Typography>
      <Typography
        variant="subtitle1"
        sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1.3 }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function RowSubmitButton({ saved }) {
  // useFormStatus reports the status of *this row's* form only, because each
  // row has its own.
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="small"
      variant={saved ? "text" : "outlined"}
      color={saved ? "success" : "primary"}
      disabled={pending}
      startIcon={
        pending ? null : saved ? (
          <CheckCircleIcon fontSize="small" />
        ) : (
          <SaveIcon fontSize="small" />
        )
      }
      sx={{ minWidth: 100 }}
    >
      {pending ? "..." : saved ? "Saved" : "Save"}
    </Button>
  );
}

/** One row, one form, one customer. */
function RowSave({ date, customerId, qty, saved }) {
  const [state, formAction] = useActionState(saveOneEntry, null);

  return (
    <Box
      component="form"
      action={formAction}
      sx={{ display: "flex", justifyContent: "center" }}
    >
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="customer_id" value={customerId} />
      <input type="hidden" name="qty" value={qty} />

      {state?.error ? (
        <Tooltip title={state.error}>
          <span>
            <RowSubmitButton saved={false} />
          </span>
        </Tooltip>
      ) : (
        <RowSubmitButton saved={saved || Boolean(state?.ok)} />
      )}
    </Box>
  );
}

export default function DailyMilkForm({ date, customers }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  // Defaults to "pending": on a fresh day that is every customer, and each
  // save drops a row out of the list, so what is left is what is left to do.
  const [statusFilter, setStatusFilter] = useState("pending");

  // Existing entry wins; otherwise pre-fill with what the customer normally
  // takes, so a normal day needs no typing at all.
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      customers.map((c) => [
        c.id,
        String(c.entry ? c.entry.actual_quantity : c.daily_quantity),
      ]),
    ),
  );

  const setQty = (id, qty) => setValues((v) => ({ ...v, [id]: qty }));

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      const status = c.entry ? c.entry.delivery_status : "pending";
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || c.mobile.includes(q);
    });
  }, [customers, query, statusFilter]);

  const totals = useMemo(() => {
    let count = 0;
    let liters = 0;
    let amount = 0;
    for (const c of customers) {
      const qty = values[c.id] ?? "";
      if (qty === "") continue;
      count += 1;
      liters += Number(qty);
      amount += Number(qty) * Number(c.rate_per_liter);
    }
    return { count, liters, amount };
  }, [customers, values]);

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mb: 2, alignItems: { sm: "center" } }}
      >
        <TextField
          type="date"
          label="Date"
          size="small"
          value={date}
          onChange={(e) => router.push(`/admin/daily-milk?date=${e.target.value}`)}
          sx={{ minWidth: 180 }}
        />
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Customer shodho"
          size="small"
          sx={{ flexGrow: 1, maxWidth: { sm: 320 } }}
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
          {Object.entries(DAILY_ROW_STATUS).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>

        <Box sx={{ flexGrow: 1 }} />

        {/* Totals sit with the controls rather than in a sticky footer: the
            numbers are a summary of what is on screen, not an action. */}
        <Stack direction="row" spacing={3} sx={{ pr: 0.5 }}>
          <Total label="Entries" value={totals.count} />
          <Total label="Total dudh" value={formatLiters(totals.liters)} />
          <Total label="Total rakam" value={formatAmount(totals.amount)} />
        </Stack>
      </Stack>

      <TableContainer
        component={Paper}
        sx={{ border: 1, borderColor: "divider" }}
      >
        <Table size="small" sx={{ minWidth: 820 }}>
          <TableHead>
            <TableRow>
              <TableCell>Customer</TableCell>
              <TableCell align="center" sx={{ width: "14%" }}>
                Aapyu
              </TableCell>
              <TableCell align="center" sx={{ width: "14%" }}>
                Rate
              </TableCell>
              <TableCell align="center" sx={{ width: "14%" }}>
                Rakam
              </TableCell>
              <TableCell align="center" sx={{ width: "14%" }}>
                Status
              </TableCell>
              <TableCell align="center" sx={{ width: "14%" }}>
                Save
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    {customers.length === 0
                      ? "Ek pan active customer nathi. Pehla Customers page ma add karo."
                      : statusFilter === "pending" && !query
                        ? "Badha thai gaya! Aa date na badha customers save thai gaya chhe."
                        : "Aa shodh/filter mate koi customer nathi malyo."}
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {visible.map((c) => {
              const qty = values[c.id] ?? "";
              const storedQty = c.entry
                ? String(c.entry.actual_quantity)
                : String(c.daily_quantity);
              const dirty = qty !== storedQty;

              // Straight from the database: no row for this date means the
              // delivery has not happened yet.
              const status = c.entry ? c.entry.delivery_status : "pending";

              const amount =
                qty === "" ? null : Number(qty) * Number(c.rate_per_liter);

              return (
                <TableRow key={c.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {c.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {c.mobile}
                    </Typography>
                  </TableCell>

                  <TableCell align="center">
                    <QuantityPicker
                      value={qty}
                      changed={dirty}
                      onChange={(v) => setQty(c.id, v)}
                    />
                  </TableCell>

                  <TableCell align="center">
                    {formatAmount(c.rate_per_liter)}
                  </TableCell>

                  <TableCell align="center">
                    {amount === null ? "—" : formatAmount(amount)}
                  </TableCell>

                  <TableCell align="center">
                    <Chip
                      size="small"
                      label={DAILY_ROW_STATUS[status]}
                      color={STATUS_COLOR[status]}
                      variant={
                        status === "pending" || status === "missed"
                          ? "outlined"
                          : "filled"
                      }
                    />
                  </TableCell>

                  <TableCell align="center">
                    <RowSave
                      date={date}
                      customerId={c.id}
                      qty={qty}
                      saved={Boolean(c.entry) && !dirty}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
