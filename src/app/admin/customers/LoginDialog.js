"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import KeyIcon from "@mui/icons-material/Key";
import LinkIcon from "@mui/icons-material/Link";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import {
  createCustomerLogin,
  linkCustomerLogin,
  resetCustomerPassword,
  unlinkCustomerLogin,
} from "./actions";

/** The dropdown value that means "none of these, make a new one". */
const NEW = "__new__";

function ActionButton({ label, busy, icon: Icon = KeyIcon, color }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="contained"
      color={color}
      startIcon={<Icon sx={{ fontSize: 17 }} />}
      disabled={pending}
    >
      {pending ? busy : label}
    </Button>
  );
}

/** Reset the password of a login that already exists, or detach it. */
function ExistingLogin({ customer, onClose }) {
  const [state, formAction] = useActionState(resetCustomerPassword, null);
  const [unlinkState, unlinkAction] = useActionState(unlinkCustomerLogin, null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (state?.ok || unlinkState?.ok) onClose();
  }, [state, unlinkState, onClose]);

  return (
    <>
      <DialogContent sx={{ pt: 1 }}>
        {(state?.error || unlinkState?.error) && (
          <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
            {state?.error ?? unlinkState?.error}
          </Alert>
        )}

        <Box component="form" action={formAction} id="reset-password-form">
          <input type="hidden" name="user_id" value={customer.user_id} />

          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Email"
              value={customer.login_email ?? ""}
              fullWidth
              disabled
            />
            <TextField
              type="text"
              name="password"
              label="Navo password"
              required
              fullWidth
              autoComplete="off"
              // Shown as plain text on purpose: the admin has to read it out
              // to the customer, and a masked box they cannot check is how
              // wrong passwords get handed over.
              helperText="Ochha ma ochha 8 akshar. Juno password turant band thai jase."
            />
          </Stack>
        </Box>

        <Divider sx={{ my: 2.5 }} />

        <Box component="form" action={unlinkAction}>
          <input type="hidden" name="customer_id" value={customer.id} />

          {confirming ? (
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: "center", flexWrap: "wrap" }}
            >
              <Typography variant="body2" color="text.secondary">
                Aa login kadhi nakhvu chhe?
              </Typography>
              <Box sx={{ flexGrow: 1 }} />
              <Button size="small" onClick={() => setConfirming(false)}>
                Na
              </Button>
              <ActionButton
                label="Ha, kadho"
                busy="Kadhi rahyu..."
                icon={LinkOffIcon}
                color="error"
              />
            </Stack>
          ) : (
            <Button
              size="small"
              color="error"
              startIcon={<LinkOffIcon sx={{ fontSize: 17 }} />}
              onClick={() => setConfirming(true)}
            >
              Login aa customer parthi kadho
            </Button>
          )}

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 1 }}
          >
            Login band nahi thay — e faqt aa customer thi chhuto padse.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose}>Rehva do</Button>
        {/* Submits the form above by id — it cannot be nested in this one,
            and the unlink form sits between them. */}
        <Button
          type="submit"
          form="reset-password-form"
          variant="contained"
          startIcon={<KeyIcon sx={{ fontSize: 17 }} />}
        >
          Password badlo
        </Button>
      </DialogActions>
    </>
  );
}

/** Attach a login that already exists, or make a brand new one. */
function NoLogin({ customer, unlinkedLogins, onClose }) {
  // Somebody who has just signed in with Google is already waiting in the
  // list, so that is the first thing offered when the list is not empty.
  const [choice, setChoice] = useState(
    unlinkedLogins.length ? unlinkedLogins[0].id : NEW,
  );
  const making = choice === NEW;

  const [state, formAction] = useActionState(
    making ? createCustomerLogin : linkCustomerLogin,
    null,
  );

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  return (
    <Box component="form" action={formAction}>
      <DialogContent sx={{ pt: 1 }}>
        <input type="hidden" name="customer_id" value={customer.id} />
        {!making && <input type="hidden" name="user_id" value={choice} />}

        {state?.error && (
          <Alert severity="error" sx={{ mb: 2, mt: 1 }}>
            {state.error}
          </Alert>
        )}

        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            select
            label="Kayu login"
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
            fullWidth
            helperText={
              unlinkedLogins.length
                ? `${unlinkedLogins.length} login koi customer sathe jodayela nathi.`
                : "Koi chhuto login nathi — navu banavvu padse."
            }
          >
            {unlinkedLogins.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.name} — {a.email}
              </MenuItem>
            ))}
            <MenuItem value={NEW}>＋ Navu login banavo</MenuItem>
          </TextField>

          {making && (
            <>
              <TextField
                type="email"
                name="email"
                label="Email"
                required
                fullWidth
                autoComplete="off"
                helperText="Aa email ane password thi customer login karse."
              />
              <TextField
                type="text"
                name="password"
                label="Password"
                required
                fullWidth
                autoComplete="off"
                helperText="Ochha ma ochha 8 akshar. Customer ne aa kahi devu."
              />
            </>
          )}

          <Typography variant="caption" color="text.secondary">
            {making
              ? "Login banya pachhi customer potanu dudh, hisab ane fariyad jate joi shakse."
              : "Aa vyakti e Google ke email thi login kari lidhu chhe — jodya pachhi ene potano hisab dekhava mandse."}
          </Typography>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose}>Rehva do</Button>
        <ActionButton
          label={making ? "Login banavo" : "Jodi do"}
          busy="Thai rahyu..."
          icon={making ? KeyIcon : LinkIcon}
        />
      </DialogActions>
    </Box>
  );
}

export default function LoginDialog({ customer, unlinkedLogins, onClose }) {
  const existing = Boolean(customer?.user_id);

  return (
    <Dialog
      open={Boolean(customer)}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      // A fresh action state per customer; otherwise the previous one's error
      // is still on screen the next time it opens.
      key={customer?.id ?? "none"}
    >
      {customer && (
        <>
          <DialogTitle sx={{ pb: 1 }}>
            {existing ? "Login" : "Login aapo"}
            <Typography variant="body2" color="text.secondary">
              {customer.name}
            </Typography>
          </DialogTitle>

          {existing ? (
            <ExistingLogin customer={customer} onClose={onClose} />
          ) : (
            <NoLogin
              customer={customer}
              unlinkedLogins={unlinkedLogins}
              onClose={onClose}
            />
          )}
        </>
      )}
    </Dialog>
  );
}
