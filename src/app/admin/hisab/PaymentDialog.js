"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { formatAmount, formatDate, formatLiters } from "@/lib/format";
import { recordPayment } from "./actions";

function Row({ label, value, strong }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: strong ? 700 : 500,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function Actions({ onClose }) {
  const { pending } = useFormStatus();
  return (
    <DialogActions sx={{ px: 3, pb: 2.5 }}>
      <Button onClick={onClose} disabled={pending}>
        Cancel
      </Button>
      <Button type="submit" variant="contained" disabled={pending}>
        {pending ? "Save thai rahyu..." : "Save karo"}
      </Button>
    </DialogActions>
  );
}

export default function PaymentDialog({ row, from, to, today, onClose }) {
  const [state, formAction] = useActionState(recordPayment, null);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  const total = Number(row?.total_amount ?? 0);

  return (
    <Dialog
      open={Boolean(row)}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      key={row?.id ?? "none"}
    >
      {row && (
        <form action={formAction}>
          <DialogTitle sx={{ pb: 1 }}>
            {row.customer_name}
            <Typography variant="body2" color="text.secondary">
              {formatDate(from)} – {formatDate(to)}
            </Typography>
          </DialogTitle>

          <DialogContent>
            <input type="hidden" name="customer_id" value={row.id} />
            <input type="hidden" name="from" value={from} />
            <input type="hidden" name="to" value={to} />

            {state?.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {state.error}
              </Alert>
            )}

            <Stack spacing={1} sx={{ mb: 3 }}>
              <Row label="Dudh" value={formatLiters(row.total_liters)} />
              <Row label="Total" value={formatAmount(total)} strong />
            </Stack>

            {/* Payments are dated so any span can be totalled, but the date is
                always today in practice — no need to ask for it. */}
            <input type="hidden" name="paid_on" value={today} />

            <TextField
              name="amount"
              label="Rakam"
              type="number"
              // The span's own total, so what the box says matches the Total
              // right above it. The action treats it as the running total for
              // the span, not an extra payment on top.
              defaultValue={total}
              required
              fullWidth
              autoFocus
              slotProps={{
                htmlInput: { min: 0, step: 0.5 },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">₹</InputAdornment>
                  ),
                },
              }}
            />
          </DialogContent>

          <Actions onClose={onClose} />
        </form>
      )}
    </Dialog>
  );
}
