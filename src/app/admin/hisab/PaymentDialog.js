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
import { formatAmount, formatLiters, formatMonth } from "@/lib/format";
import { recordPayment } from "./actions";

function Row({ label, value, strong }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: strong ? 700 : 500, fontVariantNumeric: "tabular-nums" }}
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

export default function PaymentDialog({ bill, onClose }) {
  const [state, formAction] = useActionState(recordPayment, null);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  return (
    <Dialog
      open={Boolean(bill)}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      key={bill?.id ?? "none"}
    >
      {bill && (
        <form action={formAction}>
          <DialogTitle sx={{ pb: 1 }}>
            {bill.customer_name}
            <Typography variant="body2" color="text.secondary">
              {formatMonth(bill.billing_month)}
            </Typography>
          </DialogTitle>

          <DialogContent>
            <input type="hidden" name="bill_id" value={bill.id} />

            {state?.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {state.error}
              </Alert>
            )}

            <Stack spacing={1} sx={{ mb: 3 }}>
              <Row label="Total dudh" value={formatLiters(bill.total_liters)} />
              <Row
                label="Total rakam"
                value={formatAmount(bill.total_amount)}
                strong
              />
              <Row
                label="Hju baki"
                value={formatAmount(bill.remaining_amount)}
              />
            </Stack>

            <TextField
              name="received_amount"
              label="Mali gayeli rakam"
              type="number"
              defaultValue={bill.received_amount}
              required
              fullWidth
              autoFocus
              slotProps={{
                htmlInput: { min: 0, max: bill.total_amount, step: 0.5 },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">₹</InputAdornment>
                  ),
                },
              }}
              helperText="Puri rakam nakhso to status jate Done thai jase"
            />
          </DialogContent>

          <Actions onClose={onClose} />
        </form>
      )}
    </Dialog>
  );
}
