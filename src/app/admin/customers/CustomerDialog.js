"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { MILK_QUANTITIES } from "@/lib/constants";
import { saveCustomer } from "./actions";

function Actions({ onClose }) {
  const { pending } = useFormStatus();
  return (
    <DialogActions sx={{ px: 3, pb: 2 }}>
      <Button onClick={onClose} disabled={pending}>
        Cancel
      </Button>
      <Button type="submit" variant="contained" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>
    </DialogActions>
  );
}

export default function CustomerDialog({ open, onClose, customer }) {
  const [state, formAction] = useActionState(saveCustomer, null);

  // Close only once the action reports success, so errors stay visible.
  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      // Remount on customer change, otherwise the fields keep the old
      // defaultValue when switching between Edit rows.
      key={customer?.id ?? "new"}
    >
      <form action={formAction}>
        <DialogTitle>{customer ? "Edit customer" : "New customer"}</DialogTitle>

        <DialogContent>
          {customer && <input type="hidden" name="id" value={customer.id} />}

          {state?.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {state.error}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                name="name"
                label="Name"
                defaultValue={customer?.name ?? ""}
                required
                fullWidth
                autoFocus
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                name="mobile"
                label="Mobile"
                defaultValue={customer?.mobile ?? ""}
                required
                fullWidth
                slotProps={{
                  htmlInput: { inputMode: "numeric", maxLength: 10 },
                }}
                helperText="10 digits"
              />
            </Grid>
            <Grid size={12}>
              <TextField
                name="address"
                label="Address"
                defaultValue={customer?.address ?? ""}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                name="daily_quantity"
                label="Daily milk"
                defaultValue={customer?.daily_quantity ?? 1}
                select
                required
                fullWidth
              >
                {MILK_QUANTITIES.map((q) => (
                  <MenuItem key={q} value={q}>
                    {q} L
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                name="rate_per_liter"
                label="Rate (₹ / liter)"
                type="number"
                defaultValue={customer?.rate_per_liter ?? ""}
                required
                fullWidth
                slotProps={{ htmlInput: { min: 0.01, step: 0.5 } }}
                helperText={
                  customer
                    ? "Change it and the old rate is kept in history automatically"
                    : undefined
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                name="delivery_time"
                label="Delivery time"
                defaultValue={customer?.delivery_time ?? ""}
                fullWidth
                placeholder="6:00 in the morning"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                name="status"
                label="Status"
                defaultValue={customer?.status ?? "active"}
                select
                fullWidth
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>

        <Actions onClose={onClose} />
      </form>
    </Dialog>
  );
}
