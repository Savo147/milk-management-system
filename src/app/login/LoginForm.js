"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import { signIn } from "./actions";

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
      {pending ? "Login thai rahyu chhe..." : "Login"}
    </Button>
  );
}

export default function LoginForm({ initialError }) {
  const [state, formAction] = useActionState(signIn, null);
  const error = state?.error ?? initialError;

  return (
    <Box component="form" action={formAction} sx={{ display: "grid", gap: 2 }}>
      {error && <Alert severity="error">{error}</Alert>}

      <TextField
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        required
        fullWidth
        autoFocus
      />
      <TextField
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        required
        fullWidth
      />
      <SubmitButton />
    </Box>
  );
}
