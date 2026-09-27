"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputAdornment from "@mui/material/InputAdornment";
import ListItemButton from "@mui/material/ListItemButton";
import Paper from "@mui/material/Paper";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PublicIcon from "@mui/icons-material/Public";
import SearchIcon from "@mui/icons-material/Search";
import { createChannel } from "@/lib/chat-actions";

/** The two visibility choices, each with the line that explains it. */
function VisibilityOption({ value, icon: Icon, title, note }) {
  return (
    <FormControlLabel
      value={value}
      control={<Radio sx={{ alignSelf: "flex-start", pt: 0.75 }} />}
      sx={{ alignItems: "flex-start", m: 0, py: 0.5 }}
      label={
        <Stack direction="row" sx={{ gap: 1, alignItems: "flex-start", pt: 1 }}>
          <Icon fontSize="small" sx={{ color: "text.secondary", mt: 0.2 }} />
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {note}
            </Typography>
          </Box>
        </Stack>
      }
    />
  );
}

export default function CreateChannelDialog({
  open,
  onClose,
  customers = [],
  onCreated,
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [announcementOnly, setAnnouncementOnly] = useState(true);
  const [members, setMembers] = useState(() => new Set());
  const [query, setQuery] = useState("");
  const [error, setError] = useState(null);
  const [saving, startSaving] = useTransition();

  const isPrivate = visibility === "private";

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.mobile ?? "").includes(q),
    );
  }, [customers, query]);

  const reset = () => {
    setName("");
    setDescription("");
    setVisibility("public");
    setAnnouncementOnly(true);
    setMembers(new Set());
    setQuery("");
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const toggle = (id) =>
    setMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const save = () => {
    if (!name.trim()) {
      setError("Give the channel a name.");
      return;
    }
    if (isPrivate && members.size === 0) {
      setError("Pick at least one customer for a private channel.");
      return;
    }

    startSaving(async () => {
      const res = await createChannel({
        name,
        description,
        isPrivate,
        announcementOnly,
        memberIds: [...members],
      });

      if (res.error) {
        setError(res.error);
        return;
      }

      onCreated?.(res.id);
      router.refresh();
      close();
    });
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>Create a channel</DialogTitle>

      <DialogContent dividers>
        <Stack sx={{ gap: 2.5 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Daily notices"
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
              Visibility
            </Typography>

            <RadioGroup
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
            >
              <VisibilityOption
                value="public"
                icon={PublicIcon}
                title="Public"
                note="Every customer is in it — including anyone you add later."
              />
              <VisibilityOption
                value="private"
                icon={LockOutlinedIcon}
                title="Private"
                note="Only the customers you pick below can see it."
              />
            </RadioGroup>
          </Box>

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
                    sx={{ color: "text.secondary", mt: 0.2 }}
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

          {isPrivate && (
            <Box>
              <Stack
                direction="row"
                sx={{ alignItems: "center", gap: 1, mb: 1 }}
              >
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 700, color: "text.secondary", flexGrow: 1 }}
                >
                  Who is in it
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {members.size} picked
                </Typography>
              </Stack>

              <TextField
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or mobile"
                size="small"
                fullWidth
                sx={{ mb: 1 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <Paper
                variant="outlined"
                sx={{ maxHeight: 220, overflowY: "auto", borderRadius: 2 }}
              >
                {rows.length === 0 && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ p: 2 }}
                  >
                    No customer matches this search.
                  </Typography>
                )}

                {rows.map((c) => (
                  <ListItemButton
                    key={c.id}
                    onClick={() => toggle(c.id)}
                    sx={{ py: 0.5 }}
                  >
                    <Checkbox
                      edge="start"
                      size="small"
                      checked={members.has(c.id)}
                      tabIndex={-1}
                      disableRipple
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" noWrap>
                        {c.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                      >
                        {c.mobile || "No mobile on file"}
                      </Typography>
                    </Box>
                  </ListItemButton>
                ))}
              </Paper>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={close} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={save} disabled={saving}>
          {saving ? "Creating..." : "Create channel"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
