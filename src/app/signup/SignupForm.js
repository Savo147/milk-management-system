"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { signUp } from "@/app/login/actions";
import GoogleButton from "@/app/login/GoogleButton";

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
      {pending ? "Creating..." : "Create account"}
    </Button>
  );
}

/** The eye on a password field, shared by both boxes. */
function eyeAdornment(shown, toggle) {
  return {
    endAdornment: (
      <InputAdornment position="end">
        <IconButton
          onClick={toggle}
          edge="end"
          size="small"
          aria-label={shown ? "Hide password" : "Show password"}
          // Keeps it out of the tab order: tabbing from the password field
          // should land on the next field, not here.
          tabIndex={-1}
        >
          {shown ? (
            <VisibilityOffIcon fontSize="small" />
          ) : (
            <VisibilityIcon fontSize="small" />
          )}
        </IconButton>
      </InputAdornment>
    ),
  };
}

export default function SignupForm() {
  const [state, formAction] = useActionState(signUp, null);
  const [shown, setShown] = useState(false);

  return (
    // Two separate forms, deliberately: a <form> cannot be nested, and the
    // Google button must not carry these fields with it.
    <Box sx={{ display: "grid", gap: 2 }}>
      {state?.error && <Alert severity="error">{state.error}</Alert>}

      <Box component="form" action={formAction}>
        {/*
          Two to a row from sm up, stacked on a phone. shrink is forced on
          every field: browser autofill writes a value without firing an
          event MUI can see, so the label otherwise sits on top of the
          filled-in text.
        */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              name="name"
              label="Your name"
              placeholder="Nishant Kalariya"
              autoComplete="name"
              required
              fullWidth
              autoFocus
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              name="email"
              type="email"
              label="Email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              name="password"
              type={shown ? "text" : "password"}
              label="Password"
              placeholder="••••••••"
              autoComplete="new-password"
              required
              fullWidth
              helperText="At least 8 characters"
              slotProps={{
                inputLabel: { shrink: true },
                input: eyeAdornment(shown, () => setShown((on) => !on)),
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              name="confirm"
              type={shown ? "text" : "password"}
              label="Confirm password"
              placeholder="••••••••"
              autoComplete="new-password"
              required
              fullWidth
              slotProps={{
                inputLabel: { shrink: true },
                input: eyeAdornment(shown, () => setShown((on) => !on)),
              }}
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 2.5 }}>
          <SubmitButton />
        </Box>
      </Box>

      <Divider>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          or
        </Typography>
      </Divider>

      <GoogleButton />

      <Typography
        variant="body2"
        sx={{ textAlign: "center", color: "text.secondary" }}
      >
        Already have an account?{" "}
        <Box component={Link} href="/login" sx={{ fontWeight: 600 }}>
          Sign in
        </Box>
      </Typography>
    </Box>
  );
}
