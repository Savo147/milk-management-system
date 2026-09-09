"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
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
  DELIVERY_STATUS,
  MILK_QUANTITIES,
  STATUS_COLOR,
} from "@/lib/constants";
import { formatAmount, formatLiters } from "@/lib/format";
import { saveDailyMilk, saveOneEntry } from "./actions";

/** Mirrors deliveryStatus() in actions.js so a row reads the same as it saves. */
function statusOf(actual, expected) {
  if (actual === "") return null;
  const a = Number(actual);
  if (a === 0) return "missed";
  if (a < expected) return "partial";
  if (a > expected) return "extra";
  return "delivered";
}

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
    <Box component="form" action={formAction}>
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

function SaveAllButton({ count }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="contained"
      size="large"
      startIcon={<SaveIcon />}
      disabled={pending || count === 0}
    >
      {pending ? "Save thai rahyu..." : "Badha save karo"}
    </Button>
  );
}

export default function DailyMilkForm({ date, customers }) {
  const router = useRouter();
  const [state, formAction] = useActionState(saveDailyMilk, null);
  const [query, setQuery] = useState("");

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
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.mobile.includes(q),
    );
  }, [customers, query]);

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

  const alreadySaved = customers.filter((c) => c.entry).length;

  return (
    <Box>
      {state?.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {state.error}
        </Alert>
      )}
      {state?.ok && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {state.saved} entries save thai gai.
        </Alert>
      )}

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
      </Stack>

      {alreadySaved > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Aa date ni {alreadySaved} entries pehla thi save chhe. Fari save karso
          to e update thai jase.
        </Alert>
      )}

      <TableContainer
        component={Paper}
        sx={{ border: 1, borderColor: "divider" }}
      >
        <Table size="small" sx={{ minWidth: 820 }}>
          <TableHead>
            <TableRow>
              <TableCell>Customer</TableCell>
              <TableCell align="center" sx={{ width: 110 }}>
                Aapyu
              </TableCell>
              <TableCell align="right">Rate</TableCell>
              <TableCell align="right">Rakam</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right" sx={{ width: 130 }}>
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
                      : "Aa shodh mate koi customer nathi malyo."}
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {visible.map((c) => {
              const qty = values[c.id] ?? "";
              const status = statusOf(qty, Number(c.daily_quantity));
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
                      changed={Number(qty) !== Number(c.daily_quantity)}
                      onChange={(v) => setQty(c.id, v)}
                    />
                  </TableCell>

                  <TableCell align="right">
                    {formatAmount(c.rate_per_liter)}
                  </TableCell>

                  <TableCell align="right">
                    {amount === null ? "—" : formatAmount(amount)}
                  </TableCell>

                  <TableCell>
                    {status && (
                      <Chip
                        size="small"
                        label={DELIVERY_STATUS[status]}
                        color={STATUS_COLOR[status]}
                        variant={status === "delivered" ? "filled" : "outlined"}
                      />
                    )}
                  </TableCell>

                  <TableCell align="right">
                    <RowSave
                      date={date}
                      customerId={c.id}
                      qty={qty}
                      saved={Boolean(c.entry)}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mt: 1.5, display: "block" }}
      >
        {visible.length} / {customers.length} customers dekhay chhe
      </Typography>

      {/*
        The "save everything" form sits outside the table: a <form> cannot be
        nested inside another <form>, and each row already has its own.
      */}
      <Box component="form" action={formAction}>
        <input type="hidden" name="date" value={date} />
        {customers.map((c) => (
          <input
            key={c.id}
            type="hidden"
            name={`qty_${c.id}`}
            value={values[c.id] ?? ""}
          />
        ))}

        <Paper
          sx={{
            position: "sticky",
            bottom: 0,
            mt: 2,
            p: 2,
            border: 1,
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            gap: 3,
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              Entries
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {totals.count}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total dudh
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {formatLiters(totals.liters)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total rakam
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {formatAmount(totals.amount)}
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <SaveAllButton count={totals.count} />
        </Paper>
      </Box>
    </Box>
  );
}
