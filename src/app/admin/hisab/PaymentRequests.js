"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { PAYMENT_REQUEST_STATUS, STATUS_COLOR } from "@/lib/constants";
import { formatAmount, formatDate } from "@/lib/format";
import { reviewPaymentRequest } from "./actions";

function DecisionButtons({ requestId }) {
  const [state, formAction] = useActionState(reviewPaymentRequest, null);

  return (
    <Box component="form" action={formAction}>
      <input type="hidden" name="request_id" value={requestId} />
      {state?.error && (
        <Typography variant="caption" color="error" sx={{ display: "block", mb: 0.5 }}>
          {state.error}
        </Typography>
      )}
      <Stack direction="row" spacing={1}>
        <Submit
          decision="confirmed"
          label="Confirm"
          icon={<CheckIcon fontSize="small" />}
          variant="contained"
          color="success"
        />
        <Submit
          decision="rejected"
          label="Reject"
          icon={<CloseIcon fontSize="small" />}
          variant="outlined"
          color="error"
        />
      </Stack>
    </Box>
  );
}

function Submit({ decision, label, icon, variant, color }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      name="decision"
      value={decision}
      size="small"
      variant={variant}
      color={color}
      startIcon={icon}
      disabled={pending}
    >
      {label}
    </Button>
  );
}

export default function PaymentRequests({ requests }) {
  if (requests.length === 0) return null;

  const pending = requests.filter((r) => r.status === "pending_verification");

  return (
    <Box sx={{ mt: 4 }}>
      <Typography
        variant="overline"
        sx={{
          color: "text.secondary",
          fontWeight: 700,
          letterSpacing: "0.08em",
          display: "block",
          mb: 1.5,
        }}
      >
        Payment requests
      </Typography>

      {pending.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {pending.length} request tamara nirnay ni raah jue chhe. Customer nu
          request bill ne jate Done nathi karto — tame confirm karo tyare j thay
          chhe.
        </Alert>
      )}

      <Stack spacing={1.5}>
        {requests.map((r) => (
          <Paper
            key={r.id}
            sx={{
              p: 2,
              border: 1,
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {r.customer_name}
                </Typography>
                <Chip
                  size="small"
                  label={PAYMENT_REQUEST_STATUS[r.status]}
                  color={STATUS_COLOR[r.status]}
                  variant={r.status === "confirmed" ? "filled" : "outlined"}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {formatAmount(r.requested_amount)}
                {r.message ? ` — "${r.message}"` : ""}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatDate(r.created_at)}
              </Typography>
            </Box>

            {r.status === "pending_verification" && (
              <DecisionButtons requestId={r.id} />
            )}
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}
