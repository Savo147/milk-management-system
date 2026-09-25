"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import { ACCOUNT_STATUS, STATUS_COLOR } from "@/lib/constants";
import { tableOnly, cardsOnly } from "@/lib/responsive";
import DataCards from "@/components/DataCards";
import { formatDate } from "@/lib/format";
import { updateStaff, addStaff } from "./actions";
import DeleteStaffDialog from "./DeleteStaffDialog";

/** Role and status for one row, saved the moment either dropdown changes. */
function StaffControls({ member, isSelf }) {
  const [state, formAction] = useActionState(updateStaff, null);

  if (isSelf) {
    return (
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        You
      </Typography>
    );
  }

  return (
    <Box component="form" action={formAction}>
      <input type="hidden" name="user_id" value={member.id} />
      <Stack direction="row" spacing={1} sx={{ justifyContent: "center" }}>
        <TextField
          select
          size="small"
          name="role"
          defaultValue={member.role}
          onChange={(e) => e.target.form.requestSubmit()}
          sx={{ minWidth: 118 }}
        >
          <MenuItem value="admin">Admin</MenuItem>
          <MenuItem value="customer">Customer</MenuItem>
        </TextField>

        <TextField
          select
          size="small"
          name="status"
          defaultValue={member.status}
          onChange={(e) => e.target.form.requestSubmit()}
          sx={{ minWidth: 118 }}
        >
          {Object.entries(ACCOUNT_STATUS).map(([value, text]) => (
            <MenuItem key={value} value={value}>
              {text}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {state?.error && (
        <Typography
          variant="caption"
          color="error"
          sx={{ display: "block", mt: 0.5 }}
        >
          {state.error}
        </Typography>
      )}
    </Box>
  );
}

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="contained" disabled={pending}>
      {pending ? "Creating..." : "Create"}
    </Button>
  );
}

function AddStaffDialog({ open, onClose }) {
  const [state, formAction] = useActionState(addStaff, null);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <form action={formAction}>
        <DialogTitle>New admin</DialogTitle>

        <DialogContent>
          {state?.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {state.error}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid size={12}>
              <TextField
                name="name"
                label="Name"
                required
                fullWidth
                autoFocus
              />
            </Grid>
            <Grid size={12}>
              <TextField
                name="email"
                type="email"
                label="Email"
                required
                fullWidth
              />
            </Grid>
            <Grid size={12}>
              <TextField
                name="mobile"
                label="Mobile"
                fullWidth
                slotProps={{
                  htmlInput: { inputMode: "numeric", maxLength: 10 },
                }}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                name="password"
                type="password"
                label="Password"
                required
                fullWidth
                helperText="At least 8 characters"
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose}>Cancel</Button>
          <AddButton />
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default function StaffSection({ staff, currentUserId }) {
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);

  return (
    <>
      <Stack direction="row" sx={{ justifyContent: "flex-end", mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon sx={{ fontSize: 18 }} />}
          onClick={() => setAdding(true)}
        >
          New admin
        </Button>
      </Stack>

      <DataCards
        sx={cardsOnly}
        items={staff}
        getKey={(m) => m.id}
        title={(m) => m.name}
        subtitle={(m) => m.email}
        badge={(m) => (
          <Chip
            size="small"
            label={ACCOUNT_STATUS[m.status]}
            color={STATUS_COLOR[m.status]}
            variant={m.status === "active" ? "filled" : "outlined"}
          />
        )}
        fields={(m) => [
          m.mobile && ["Mobile", m.mobile],
          ["Joined", formatDate(m.created_at)],
        ]}
        actions={(m) => (
          <>
            <StaffControls member={m} isSelf={m.id === currentUserId} />
            {m.id !== currentUserId && (
              <Button
                size="small"
                color="error"
                startIcon={<DeleteOutlineIcon sx={{ fontSize: 17 }} />}
                onClick={() => setDeleting(m)}
              >
                Delete
              </Button>
            )}
          </>
        )}
        empty="No users."
      />

      <TableContainer
        component={Paper}
        sx={{ border: 1, borderColor: "divider", ...tableOnly }}
      >
        <Table size="small" sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell align="center" sx={{ width: "14%" }}>
                Mobile
              </TableCell>
              <TableCell align="center" sx={{ width: "14%" }}>
                Joined
              </TableCell>
              <TableCell align="center" sx={{ width: "12%" }}>
                Status
              </TableCell>
              <TableCell align="center" sx={{ width: "28%" }}>
                Role and status
              </TableCell>
              <TableCell align="right" sx={{ width: "8%" }}>
                Action
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {staff.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    No users.
                  </Typography>
                </TableCell>
              </TableRow>
            )}

            {staff.map((m) => (
              <TableRow key={m.id} hover>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {m.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {m.email}
                  </Typography>
                </TableCell>

                <TableCell align="center">{m.mobile ?? "—"}</TableCell>

                <TableCell align="center">{formatDate(m.created_at)}</TableCell>

                <TableCell align="center">
                  <Chip
                    size="small"
                    label={ACCOUNT_STATUS[m.status]}
                    color={STATUS_COLOR[m.status]}
                    variant={m.status === "active" ? "filled" : "outlined"}
                  />
                </TableCell>

                <TableCell align="center">
                  <StaffControls member={m} isSelf={m.id === currentUserId} />
                </TableCell>

                <TableCell align="right">
                  {/* Not on your own row: deleting the login you are sitting
                      in would leave nobody holding the door. */}
                  {m.id !== currentUserId && (
                    <Tooltip title="Delete this login">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleting(m)}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <AddStaffDialog open={adding} onClose={() => setAdding(false)} />

      <DeleteStaffDialog member={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}
