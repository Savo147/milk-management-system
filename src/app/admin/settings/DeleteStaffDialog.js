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
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { deleteStaff } from "./actions";

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="contained"
      color="error"
      startIcon={<DeleteOutlineIcon sx={{ fontSize: 18 }} />}
      disabled={pending}
    >
      {pending ? "Deleting..." : "Delete login"}
    </Button>
  );
}

/**
 * Asks before removing a login, and says what goes with it.
 *
 * Deleting takes the person's replies on complaint threads along with them —
 * the database removes those rows too. Everything else survives: the milk,
 * the billing, the complaints themselves, and the customer record, which is
 * simply unlinked. An admin should know all that before pressing, not after.
 */
export default function DeleteStaffDialog({ member, onClose }) {
  const [state, formAction] = useActionState(deleteStaff, null);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  return (
    <Dialog
      open={Boolean(member)}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      key={member?.id ?? "none"}
    >
      {member && (
        <>
          <DialogTitle sx={{ pb: 1 }}>
            Delete this login?
            <Typography variant="body2" color="text.secondary">
              {member.name} — {member.email}
            </Typography>
          </DialogTitle>

          <Box component="form" action={formAction}>
            <DialogContent sx={{ pt: 1 }}>
              <input type="hidden" name="user_id" value={member.id} />

              {state?.error && (
                <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
                  {state.error}
                </Alert>
              )}

              <Stack spacing={1.5} sx={{ mt: 1 }}>
                <Typography variant="body2">
                  They will not be able to sign in again. This cannot be undone.
                </Typography>

                {member.reply_count > 0 && (
                  <Alert severity="warning">
                    {member.reply_count}{" "}
                    {member.reply_count === 1 ? "message" : "messages"} they
                    wrote on complaint threads will be deleted too. The
                    complaints themselves stay.
                  </Alert>
                )}

                {member.linked_customer && (
                  <Alert severity="info">
                    <strong>{member.linked_customer}</strong> is kept — only the
                    login is removed, and the customer goes back to having none.
                  </Alert>
                )}

                <Typography variant="caption" color="text.secondary">
                  If you only want to keep them out, set their status to
                  Inactive instead. Nothing is lost that way.
                </Typography>
              </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2.5 }}>
              <Button onClick={onClose}>Cancel</Button>
              <ConfirmButton />
            </DialogActions>
          </Box>
        </>
      )}
    </Dialog>
  );
}
