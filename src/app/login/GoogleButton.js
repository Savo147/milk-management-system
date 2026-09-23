"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { signInWithGoogle } from "./actions";

/** Google's own mark. MUI ships no brand icons, and this one may not be
 *  recoloured or redrawn, so it is inlined exactly as published. */
function GoogleIcon() {
  return (
    <Box component="svg" viewBox="0 0 48 48" sx={{ width: 18, height: 18 }}>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Box>
  );
}

function Inner() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outlined"
      size="large"
      fullWidth
      disabled={pending}
      startIcon={pending ? null : <GoogleIcon />}
      sx={{
        color: "text.primary",
        borderColor: "divider",
        bgcolor: "background.paper",
        "&:hover": { borderColor: "grey.400", bgcolor: "grey.50" },
      }}
    >
      {pending ? "Taking you to Google..." : "Sign in with Google"}
    </Button>
  );
}

export default function GoogleButton() {
  // On success this never returns — the action redirects to Google — so state
  // only ever holds a failure worth showing.
  const [state, formAction] = useActionState(signInWithGoogle, null);

  return (
    <Box component="form" action={formAction} sx={{ display: "grid", gap: 2 }}>
      {state?.error && <Alert severity="error">{state.error}</Alert>}
      <Inner />
    </Box>
  );
}
