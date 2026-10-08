"use client";

import { useMemo, useState } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PublicIcon from "@mui/icons-material/Public";
import usePhone from "@/components/usePhone";

/**
 * Who is in this channel.
 *
 * The header says how many; this says which. The number alone is enough to
 * trust a channel with a notice, but not enough to check one — "6 customers"
 * does not tell you whether the one you are thinking of is among them.
 *
 * The two kinds are answered from different places, and the dialog says which
 * it is looking at:
 *
 *   public  — everybody on the books. There are no member rows to read, so
 *             the customer list the page already holds is the answer, and a
 *             customer added tomorrow is in it tomorrow without anybody
 *             touching the channel.
 *   private — the ids written down when it was made, resolved to names
 *             against that same list.
 */
export default function ChannelMembersDialog({ open, onClose, channel, customers = [] }) {
  const phone = usePhone();
  const [query, setQuery] = useState("");

  const isPrivate = Boolean(channel?.isPrivate);

  const people = useMemo(() => {
    if (!channel) return [];

    const inChannel = isPrivate
      ? ((ids) => customers.filter((c) => ids.has(c.id)))(
          new Set(channel.memberIds ?? []),
        )
      : // Closed accounts are not in it: they are not taking milk, and the
        // count beside the channel's name leaves them out too.
        customers.filter((c) => c.status === "active");

    return [...inChannel].sort((a, b) => a.name.localeCompare(b.name));
  }, [channel, customers, isPrivate]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;

    return people.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.mobile ?? "").includes(q),
    );
  }, [people, query]);

  const close = () => {
    setQuery("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth fullScreen={phone}>
      <DialogTitle sx={{ pb: 1, pr: 6 }}>
        <Stack direction="row" sx={{ gap: 1, alignItems: "center" }}>
          {isPrivate ? (
            <LockOutlinedIcon fontSize="small" sx={{ color: "text.secondary" }} />
          ) : (
            <PublicIcon fontSize="small" sx={{ color: "text.secondary" }} />
          )}
          {channel?.name}
        </Stack>

        <Typography variant="body2" color="text.secondary">
          {people.length} customer{people.length === 1 ? "" : "s"} ·{" "}
          {isPrivate ? "the ones you picked" : "everybody on the books"}
        </Typography>

        <IconButton
          onClick={close}
          aria-label="Close"
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 0 }}>
        {/* Only worth a search box once the list is long enough to lose
            somebody in. */}
        {people.length > 7 && (
          <Box sx={{ px: 3, pb: 1.5 }}>
            <TextField
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              size="small"
              fullWidth
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
          </Box>
        )}

        {rows.length === 0 && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ px: 3, py: 4, textAlign: "center" }}
          >
            {people.length === 0
              ? "Nobody is in this channel yet."
              : "Nobody matches that."}
          </Typography>
        )}

        <Stack divider={<Divider />}>
          {rows.map((c) => (
            <Stack
              key={c.id}
              direction="row"
              sx={{ gap: 1.5, alignItems: "center", px: 3, py: 1.25 }}
            >
              <Avatar
                src={c.photo || undefined}
                sx={{ width: 34, height: 34, fontSize: "0.85rem" }}
              >
                {c.name?.[0]?.toUpperCase()}
              </Avatar>

              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                  {c.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {c.mobile || "No mobile"}
                </Typography>
              </Box>

              {/* A closed account can still be sitting in a private channel's
                  member list, so it is named rather than quietly dropped. */}
              {c.status !== "active" && (
                <Chip size="small" label="Closed" variant="outlined" />
              )}
            </Stack>
          ))}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
