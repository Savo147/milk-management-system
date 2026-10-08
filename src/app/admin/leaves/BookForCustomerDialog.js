"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SelectField from "@/components/SelectField";
import usePhone from "@/components/usePhone";
import { bookLeave } from "@/app/customer/leave/actions";

/**
 * The dairy booking somebody else's days off.
 *
 * Most leave is phoned in or said at the gate — "bhai, next week nathi
 * joitu" — so the dairy needs the same form the customer has, with a name
 * on the front of it. The action is the same one; it is the action that
 * decides an admin may name anybody and a customer may not.
 */
export default function BookForCustomerDialog({
  open,
  onClose,
  customers = [],
  today,
}) {
  const [state, formAction] = useActionState(bookLeave, null);
  const phone = usePhone();

  // Watched only so the wording can change: picking "everybody" turns this
  // from one customer's week away into the dairy shutting, and the note
  // under the box is the one chance to say so before Book is pressed.
  const [who, setWho] = useState("");
  const everybody = who === "all";

  // Closed once per booking. useActionState keeps its last result for the
  // life of the component, so without remembering which one has been acted
  // on, reopening the dialog would shut it again immediately.
  const handled = useRef(null);

  useEffect(() => {
    if (state?.ok && handled.current !== state) {
      handled.current = state;
      onClose();
    }
  }, [state, onClose]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      fullScreen={phone}
    >
      <form action={formAction}>
        <DialogTitle sx={{ pb: 1 }}>
          {everybody ? "No milk on these days" : "Book leave"}
          <Typography variant="body2" color="text.secondary">
            {everybody
              ? "Every customer is told, and the round skips the whole day"
              : "The round will skip them on these days"}
          </Typography>
        </DialogTitle>

        <DialogContent>
          {state?.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {state.error}
            </Alert>
          )}

          <Stack spacing={2}>
            <SelectField
              name="customer_id"
              label="Who"
              value={who}
              onChange={(e) => setWho(e.target.value)}
              required
              fullWidth
            >
              {/* First, because "the dairy is not going out today" is the
                  one that has to be found in a hurry. */}
              <MenuItem value="all">
                Everybody — no milk at all ({customers.length})
              </MenuItem>
              <Divider />
              {customers.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                  {c.mobile ? ` · ${c.mobile}` : ""}
                </MenuItem>
              ))}
            </SelectField>

            <TextField
              name="from_date"
              label="First day"
              type="date"
              defaultValue={today}
              required
              fullWidth
              slotProps={{ htmlInput: { min: today }, inputLabel: { shrink: true } }} // prettier-ignore
            />

            <TextField
              name="to_date"
              label="Last day"
              type="date"
              defaultValue={today}
              required
              fullWidth
              helperText="Same day for a single day off"
              slotProps={{ htmlInput: { min: today }, inputLabel: { shrink: true } }} // prettier-ignore
            />

            {/* This is the message. It goes out on the customer's bell
                word for word, so it is labelled as what it is rather than
                as a note the dairy keeps to itself. */}
            <TextField
              name="reason"
              label={everybody ? "Message to everybody" : "Message (optional)"}
              placeholder={
                everybody
                  ? "Aaje dudh nahi ave — festival ni raja"
                  : "Out of town for a festival"
              }
              fullWidth
              multiline
              maxRows={3}
              helperText={
                everybody
                  ? `Sent to all ${customers.length} customers`
                  : "Sent to the customer"
              }
              slotProps={{ htmlInput: { maxLength: 200 } }}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" color={everybody ? "warning" : "primary"}>
            {everybody ? "Tell everybody" : "Book"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
