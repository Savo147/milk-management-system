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
      scroll="paper"
      sx={{
        // On a short window this form has to scroll; it does not need a
        // scrollbar down the side to say so. Wheel, trackpad and keyboard
        // all still work.
        "& .MuiDialog-container, & .MuiDialog-paper, & .MuiDialogContent-root":
          {
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            "&::-webkit-scrollbar": { display: "none" },
          },
      }}
      slotProps={{ paper: { sx: { maxHeight: "calc(100dvh - 32px)" } } }}
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
                fullWidth
                slotProps={{
                  htmlInput: { inputMode: "numeric", maxLength: 10 },
                }}
                helperText="10 digits, or leave it for later"
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
              {/* Typed, not picked from a list: a customer on 6 L or 1.25 L
                  is the dairy's business, not something a dropdown written
                  months ago gets to rule out. */}
              <TextField
                name="daily_quantity"
                label="Daily milk (liters)"
                type="number"
                defaultValue={customer?.daily_quantity ?? 1}
                required
                fullWidth
                slotProps={{ htmlInput: { min: 0.25, max: 100, step: 0.25 } }}
                helperText="Any amount, in quarter-liter steps"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                name="rate_per_liter"
                label="Rate (₹ / liter)"
                type="number"
                defaultValue={customer?.rate_per_liter ?? ""}
                required
                fullWidth
                slotProps={{ htmlInput: { min: 0.01, step: "any" } }}
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
