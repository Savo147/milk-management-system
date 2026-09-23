"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SendIcon from "@mui/icons-material/Send";
import {
  ISSUE_TYPE,
  PROBLEM_STATE,
  STATUS_COLOR,
  problemState,
} from "@/lib/constants";
import { formatDate, formatLiters } from "@/lib/format";
import { replyOnProblem } from "./actions";

function Field({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Box>
  );
}

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="contained"
      startIcon={<SendIcon sx={{ fontSize: 17 }} />}
      disabled={pending}
    >
      {pending ? "Mokali rahyu..." : "Message mokalo"}
    </Button>
  );
}

export default function ThreadDialog({ problem, replies, onClose }) {
  const [state, formAction] = useActionState(replyOnProblem, null);

  // Clear the box only once the message is actually in.
  useEffect(() => {
    if (state?.ok) {
      const el = document.getElementById("customer-reply");
      if (el) el.value = "";
    }
  }, [state]);

  const done = problem ? problemState(problem.status) === "done" : false;

  return (
    <Dialog
      open={Boolean(problem)}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      key={problem?.id ?? "none"}
    >
      {problem && (
        <>
          <DialogTitle sx={{ pb: 1 }}>
            {ISSUE_TYPE[problem.issue_type] ?? problem.issue_type}
            <Typography variant="body2" color="text.secondary">
              {formatDate(problem.created_at)}
            </Typography>
          </DialogTitle>

          <DialogContent sx={{ pt: 1 }}>
            <Stack
              direction="row"
              spacing={3}
              sx={{ flexWrap: "wrap", gap: 2, mb: 2, mt: 1 }}
            >
              <Field
                label="Joitu hatu"
                value={formatLiters(problem.expected_quantity)}
              />
              <Field
                label="Malyu"
                value={formatLiters(problem.received_quantity)}
              />
              <Box sx={{ flexGrow: 1 }} />
              <Box sx={{ mt: 1 }}>
                <Chip
                  size="small"
                  label={PROBLEM_STATE[problemState(problem.status)]}
                  color={STATUS_COLOR[problemState(problem.status)]}
                  variant={done ? "filled" : "outlined"}
                />
              </Box>
            </Stack>

            {problem.message && (
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mb: 2,
                  border: 1,
                  borderColor: "divider",
                  bgcolor: "grey.50",
                }}
              >
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Tame lakhyu hatu
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {problem.message}
                </Typography>
              </Paper>
            )}

            <Divider sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Vaatchit ({replies.length})
              </Typography>
            </Divider>

            <Stack spacing={1.5} sx={{ mb: 2 }}>
              {replies.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Dairy e hju jawab nathi aapyo.
                </Typography>
              )}

              {replies.map((r) => (
                <Paper
                  key={r.id}
                  elevation={0}
                  sx={{
                    p: 1.5,
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 2,
                  }}
                >
                  <Stack
                    direction="row"
                    sx={{ justifyContent: "space-between", mb: 0.5 }}
                  >
                    <Chip
                      size="small"
                      label={r.from_admin ? `${r.sender_name} (Dairy)` : "Tame"}
                      color={r.from_admin ? "primary" : "default"}
                      variant={r.from_admin ? "filled" : "outlined"}
                    />
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary" }}
                    >
                      {formatDate(r.created_at)}
                    </Typography>
                  </Stack>
                  <Typography variant="body2">{r.message}</Typography>
                </Paper>
              ))}
            </Stack>

            {done && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Dairy e aa fariyad solve thayeli gani chhe. Haju kai baki hoy to
                niche lakho.
              </Alert>
            )}

            <Box component="form" action={formAction} sx={{ pb: 1 }}>
              <input type="hidden" name="report_id" value={problem.id} />

              {state?.error && (
                <Alert severity="error" sx={{ mb: 1.5 }}>
                  {state.error}
                </Alert>
              )}

              <TextField
                id="customer-reply"
                name="message"
                label="Tamaro message"
                multiline
                rows={2}
                fullWidth
                required
                sx={{ mb: 1.5 }}
              />

              <Stack
                direction="row"
                spacing={1}
                sx={{ justifyContent: "flex-end" }}
              >
                <Button onClick={onClose}>Band karo</Button>
                <SendButton />
              </Stack>
            </Box>
          </DialogContent>
        </>
      )}
    </Dialog>
  );
}
