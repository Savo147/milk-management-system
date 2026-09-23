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
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SendIcon from "@mui/icons-material/Send";
import { ISSUE_TYPE, PROBLEM_STATE, problemState } from "@/lib/constants";
import { formatDate, formatLiters } from "@/lib/format";
import { replyToProblem, setProblemStatus } from "./actions";

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

function StatusPicker({ problem }) {
  const [state, formAction] = useActionState(setProblemStatus, null);

  return (
    <Box component="form" action={formAction}>
      <input type="hidden" name="report_id" value={problem.id} />
      <TextField
        select
        size="small"
        name="status"
        label="Status"
        defaultValue={problemState(problem.status)}
        sx={{ minWidth: 170 }}
        // Submitting on change keeps this to one click; there is nothing else
        // to fill in.
        onChange={(e) => e.target.form.requestSubmit()}
      >
        {Object.entries(PROBLEM_STATE).map(([value, text]) => (
          <MenuItem key={value} value={value}>
            {text}
          </MenuItem>
        ))}
      </TextField>
      {state?.error && (
        <Typography variant="caption" color="error" sx={{ display: "block" }}>
          {state.error}
        </Typography>
      )}
    </Box>
  );
}

function ReplyButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="contained"
      startIcon={<SendIcon sx={{ fontSize: 17 }} />}
      disabled={pending}
    >
      {pending ? "Sending..." : "Send reply"}
    </Button>
  );
}

export default function ProblemDialog({ problem, replies, onClose }) {
  const [state, formAction] = useActionState(replyToProblem, null);

  // Clear the box only once the reply is actually in.
  useEffect(() => {
    if (state?.ok) {
      const el = document.getElementById("problem-reply");
      if (el) el.value = "";
    }
  }, [state]);

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
            {problem.customer_name}
            <Typography variant="body2" color="text.secondary">
              {ISSUE_TYPE[problem.issue_type] ?? problem.issue_type} ·{" "}
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
                label="Expected"
                value={formatLiters(problem.expected_quantity)}
              />
              <Field
                label="Got"
                value={formatLiters(problem.received_quantity)}
              />
              <Box sx={{ flexGrow: 1 }} />
              <StatusPicker problem={problem} />
            </Stack>

            {problem.message && (
              <Paper
                sx={{
                  p: 2,
                  mb: 2,
                  border: 1,
                  borderColor: "divider",
                  bgcolor: "grey.50",
                }}
              >
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Customer no message
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {problem.message}
                </Typography>
              </Paper>
            )}

            <Divider sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Conversation ({replies.length})
              </Typography>
            </Divider>

            <Stack spacing={1.5} sx={{ mb: 2 }}>
              {replies.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No reply has been sent yet.
                </Typography>
              )}

              {replies.map((r) => (
                <Paper
                  key={r.id}
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
                      label={r.sender_name}
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

            <Box component="form" action={formAction} sx={{ pb: 1 }}>
              <input type="hidden" name="report_id" value={problem.id} />

              {state?.error && (
                <Alert severity="error" sx={{ mb: 1.5 }}>
                  {state.error}
                </Alert>
              )}

              <TextField
                id="problem-reply"
                name="message"
                label="Replies"
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
                <Button onClick={onClose}>Close</Button>
                <ReplyButton />
              </Stack>
            </Box>
          </DialogContent>
        </>
      )}
    </Dialog>
  );
}
