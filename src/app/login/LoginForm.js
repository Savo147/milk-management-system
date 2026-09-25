"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { signIn } from "./actions";
import GoogleButton from "./GoogleButton";

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
      {pending ? "Signing in..." : "Login"}
    </Button>
  );
}

export default function LoginForm({ initialError }) {
  const [state, formAction] = useActionState(signIn, null);
  const [showPassword, setShowPassword] = useState(false);
  const error = state?.error ?? initialError;

  return (
    // Two separate forms, deliberately: a <form> cannot be nested, and the
    // Google button must not carry the email and password fields with it.
    <Box sx={{ display: "grid", gap: 2 }}>
      {error && <Alert severity="error">{error}</Alert>}

      <Box
        component="form"
        action={formAction}
        sx={{ display: "grid", gap: 2 }}
      >
        {/*
          shrink is forced on both fields. Browser autofill writes a value
          without firing an event MUI can see, so the label stays sitting on
          top of the filled-in text.
        */}
        <TextField
          name="email"
          type="email"
          label="Email"
          placeholder="you@example.com"
          autoComplete="email"
          required
          fullWidth
          autoFocus
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          name="password"
          type={showPassword ? "text" : "password"}
          label="Password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
          fullWidth
          slotProps={{
            inputLabel: { shrink: true },
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((on) => !on)}
                    edge="end"
                    size="small"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    // Keeps the button out of the tab order: tabbing from the
                    // password field should land on Login, not here.
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <VisibilityOffIcon fontSize="small" />
                    ) : (
                      <VisibilityIcon fontSize="small" />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />

        <SubmitButton />
      </Box>

      <Divider>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          or
        </Typography>
      </Divider>

      <GoogleButton />
    </Box>
  );
}
