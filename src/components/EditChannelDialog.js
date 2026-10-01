"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PublicIcon from "@mui/icons-material/Public";
import { updateChannel } from "@/lib/chat-actions";

/**
 * Changing a channel after it exists — its name, what it is for, and whether
 * customers may post in it.
 *
 * Public or private is shown but not editable. That setting is a promise
 * about who has already read what was said here, and turning it round would
 * either expose a private room's history or lock people out of their own
 * messages. Posting only decides what happens next, so it is free to change.
 */
export default function EditChannelDialog({ open, onClose, channel }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  // Keyed on the channel by the caller, so these open with the values of
  // whichever channel is showing rather than the first one ever opened.
  const [name, setName] = useState(channel?.name ?? "");
  const [description, setDescription] = useState(channel?.description ?? "");
  const [announcementOnly, setAnnouncementOnly] = useState(
    Boolean(channel?.announcementOnly),
  );

  const save = () =>
    startTransition(async () => {
      setError(null);
      const res = await updateChannel({
        id: channel.id,
        name,
        description,
        announcementOnly,
      });

      if (res?.error) setError(res.error);
      else {
        onClose();
        router.refresh();
      }
    });

  const isPrivate = Boolean(channel?.isPrivate);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Channel settings</DialogTitle>

      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            size="small"
            fullWidth
            autoFocus
          />

          <TextField
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this channel is for"
            size="small"
            fullWidth
          />

          <Box>
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, color: "text.secondary" }}
            >
              Posting
            </Typography>

            <FormControlLabel
              sx={{ alignItems: "flex-start", m: 0, mt: 0.5 }}
              control={
                <Switch
                  checked={announcementOnly}
                  onChange={(e) => setAnnouncementOnly(e.target.checked)}
                />
              }
              label={
                <Stack
                  direction="row"
                  sx={{ gap: 1, alignItems: "flex-start", pt: 1 }}
                >
                  <CampaignOutlinedIcon
                    fontSize="small"
                    sx={{ color: announcementOnly ? "var(--tile-amber-fg)" : "text.secondary", mt: 0.2 }} // prettier-ignore
                  />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      Announcements only
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {announcementOnly
                        ? "Only you can post. Customers read it."
                        : "Customers can reply in the channel too."}
                    </Typography>
                  </Box>
                </Stack>
              }
            />
          </Box>

          {/* Shown so the dialog does not look as though it forgot about it,
              greyed so it does not look like something that is broken. */}
          <Stack
            direction="row"
            sx={{
              gap: 1.25,
              alignItems: "center",
              p: 1.5,
              borderRadius: 2,
              bgcolor: "grey.50",
              border: 1,
              borderColor: "divider",
            }}
          >
            {isPrivate ? (
              <LockOutlinedIcon fontSize="small" sx={{ color: "text.secondary" }} /> // prettier-ignore
            ) : (
              <PublicIcon fontSize="small" sx={{ color: "text.secondary" }} />
            )}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {isPrivate ? "Private channel" : "Public channel"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isPrivate
                  ? "Only the customers you picked. This cannot be changed — what was said here was said in private."
                  : "Every customer is in it. This cannot be changed — make a new channel instead."}
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button variant="contained" onClick={save} disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
