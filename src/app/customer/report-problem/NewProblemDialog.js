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
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SendIcon from "@mui/icons-material/Send";
import { ISSUE_TYPE, MILK_QUANTITIES } from "@/lib/constants";
import { formatLiters } from "@/lib/format";
import { raiseProblem } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="contained"
      startIcon={<SendIcon sx={{ fontSize: 17 }} />}
      disabled={pending}
    >
      {pending ? "Sending..." : "Send complaint"}
    </Button>
  );
}

export default function NewProblemDialog({ open, customer, today, onClose }) {
  const [state, formAction] = useActionState(raiseProblem, null);

  // Close only once it is actually in, so a failure keeps what was typed.
  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      // A fresh action state per opening; otherwise the previous attempt's
      // error is still on screen the next time it opens.
      key={open ? "open" : "closed"}
    >
      <DialogTitle sx={{ pb: 1 }}>
        New complaint
        <Typography variant="body2" color="text.secondary">
          If anything was wrong with your milk, write it here — the dairy is
          told straight away.
        </Typography>
      </DialogTitle>

      <Box component="form" action={formAction}>
        <DialogContent sx={{ pt: 1 }}>
          {state?.error && (
            <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
              {state.error}
            </Alert>
          )}

          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              name="issue_type"
              label="What went wrong"
              defaultValue=""
              required
              fullWidth
            >
              {Object.entries(ISSUE_TYPE).map(([value, text]) => (
                <MenuItem key={value} value={value}>
                  {text}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              type="date"
              name="date"
              label="Which date"
              defaultValue={today}
              fullWidth
              helperText="The complaint will be attached to that day's entry."
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { max: today },
              }}
            />

            <TextField
              select
              name="received_quantity"
              label="How much you actually got"
              defaultValue=""
              fullWidth
              helperText={`Should get ${formatLiters(customer.daily_quantity)} a day`}
            >
              <MenuItem value="">
                <em>Whatever was recorded that day</em>
              </MenuItem>
              <MenuItem value="0">Nothing (0 L)</MenuItem>
              {MILK_QUANTITIES.map((q) => (
                <MenuItem key={q} value={q}>
                  {formatLiters(q)}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              name="message"
              label="What happened"
              multiline
              rows={3}
              fullWidth
              required
              placeholder="For example: no milk arrived this morning"
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose}>Cancel</Button>
          <SubmitButton />
        </DialogActions>
      </Box>
    </Dialog>
  );
}
