"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import { sendResetLink } from "./actions";

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
      {pending ? "Sending..." : "Send link"}
    </Button>
  );
}

export default function ForgotForm({ initialError }) {
  const [state, formAction] = useActionState(sendResetLink, null);
  const error = state?.error ?? initialError;

  if (state?.ok) {
    return (
      <Box sx={{ display: "grid", gap: 2 }}>
        <Alert severity="success" icon={<MarkEmailReadIcon />}>
          <AlertTitle>Email sent</AlertTitle>A password reset link has been sent
          to <strong>{state.email}</strong>. Open the email and click the link.
        </Alert>

        <Alert severity="info">
          If you cannot see it, check your <strong>Spam</strong> folder. The
          link works for <strong>1 hour</strong> only.
        </Alert>

        <Button
          component={Link}
          href="/login"
          startIcon={<ArrowBackIcon sx={{ fontSize: 17 }} />}
        >
          Back to sign in
        </Button>
      </Box>
    );
  }

  return (
    <Box component="form" action={formAction} sx={{ display: "grid", gap: 2 }}>
      {error && <Alert severity="error">{error}</Alert>}

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

      <SubmitButton />

      <Button
        component={Link}
        href="/login"
        startIcon={<ArrowBackIcon sx={{ fontSize: 17 }} />}
      >
        Back to sign in
      </Button>
    </Box>
  );
}
