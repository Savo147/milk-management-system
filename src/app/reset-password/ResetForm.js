"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { setNewPassword } from "./actions";

function SubmitButton() {
  // useFormStatus must live in a child of the <form>, not the form itself.
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="contained"
      size="large"
      fullWidth
      disabled={pending}
    >
      {pending ? "Save thai rahyu chhe..." : "Navo password save karo"}
    </Button>
  );
}

export default function ResetForm({ email }) {
  const [state, formAction] = useActionState(setNewPassword, null);
  const [show, setShow] = useState(false);

  // One toggle for both boxes: they have to match, so reading one without the
  // other is no help.
  const eye = {
    endAdornment: (
      <InputAdornment position="end">
        <IconButton
          onClick={() => setShow((on) => !on)}
          edge="end"
          size="small"
          aria-label={show ? "Password chhupavo" : "Password batavo"}
          tabIndex={-1}
        >
          {show ? (
            <VisibilityOffIcon fontSize="small" />
          ) : (
            <VisibilityIcon fontSize="small" />
          )}
        </IconButton>
      </InputAdornment>
    ),
  };

  return (
    <Box component="form" action={formAction} sx={{ display: "grid", gap: 2 }}>
      {state?.error && <Alert severity="error">{state.error}</Alert>}

      <TextField
        label="Email"
        value={email ?? ""}
        fullWidth
        disabled
        slotProps={{ inputLabel: { shrink: true } }}
      />

      <TextField
        name="password"
        type={show ? "text" : "password"}
        label="Navo password"
        placeholder="••••••••"
        autoComplete="new-password"
        required
        fullWidth
        autoFocus
        helperText="Ochha ma ochha 8 akshar."
        slotProps={{ inputLabel: { shrink: true }, input: eye }}
      />

      <TextField
        name="confirm"
        type={show ? "text" : "password"}
        label="Fari lakho"
        placeholder="••••••••"
        autoComplete="new-password"
        required
        fullWidth
        slotProps={{ inputLabel: { shrink: true }, input: eye }}
      />

      <SubmitButton />
    </Box>
  );
}
