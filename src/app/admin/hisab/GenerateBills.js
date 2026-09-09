"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { generateBills } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="contained"
      startIcon={<ReceiptLongIcon />}
      disabled={pending}
    >
      {pending ? "Taiyar thai rahyu..." : "Bill taiyar karo"}
    </Button>
  );
}

export default function GenerateBills({ month }) {
  const [state, formAction] = useActionState(generateBills, null);

  return (
    <Box>
      <Box component="form" action={formAction}>
        <input type="hidden" name="month" value={month} />
        <SubmitButton />
      </Box>

      {state?.error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {state.error}
        </Alert>
      )}
      {state?.ok && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {state.message}
        </Alert>
      )}
    </Box>
  );
}
