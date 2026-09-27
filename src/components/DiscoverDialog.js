"use client";

import { useMemo, useState } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import ListItemButton from "@mui/material/ListItemButton";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";
import ExploreOutlinedIcon from "@mui/icons-material/ExploreOutlined";
import SearchIcon from "@mui/icons-material/Search";

/**
 * Every customer on the books, so the dairy can open a conversation with one
 * who has never written in. The header preview and the sidebar only know
 * about threads that already exist; this is the way a new one starts.
 */
export default function DiscoverDialog({
  open,
  onClose,
  customers = [],
  chattingWith = new Set(),
  onPick,
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");

  const counts = useMemo(
    () => ({
      all: customers.length,
      new: customers.filter((c) => !chattingWith.has(c.id)).length,
      open: customers.filter((c) => chattingWith.has(c.id)).length,
    }),
    [customers, chattingWith],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();

    return customers.filter((c) => {
      if (tab === "new" && chattingWith.has(c.id)) return false;
      if (tab === "open" && !chattingWith.has(c.id)) return false;
      if (!q) return true;
      return c.name.toLowerCase().includes(q) || (c.mobile ?? "").includes(q);
    });
  }, [customers, chattingWith, query, tab]);

  const close = () => {
    setQuery("");
    setTab("all");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3, height: 560 } } }}
    >
      <Stack
        direction="row"
        sx={{ gap: 2, alignItems: "flex-start", p: 2.5, pb: 1.5 }}
      >
        <Avatar sx={{ bgcolor: "grey.100", color: "text.secondary" }}>
          <ExploreOutlinedIcon />
        </Avatar>

        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Find a customer
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Pick anyone on the books to start a conversation
          </Typography>
        </Box>

        <IconButton onClick={close} size="small" aria-label="Close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Box sx={{ px: 2.5 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ minHeight: 40, "& .MuiTab-root": { minHeight: 40 } }}
        >
          <Tab value="all" label={`All · ${counts.all}`} />
          <Tab value="new" label={`Not yet · ${counts.new}`} />
          <Tab value="open" label={`Chatting · ${counts.open}`} />
        </Tabs>
      </Box>

      <Box sx={{ px: 2.5, py: 2 }}>
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or mobile"
          size="small"
          fullWidth
          autoFocus
          slotProps={{
            input: {
              sx: { borderRadius: 3 },
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      <Divider />

      <DialogContent sx={{ p: 0 }}>
        {rows.length === 0 && (
          <Stack sx={{ alignItems: "center", gap: 1, py: 8, px: 3 }}>
            <Avatar sx={{ bgcolor: "grey.100", color: "text.disabled" }}>
              <ExploreOutlinedIcon />
            </Avatar>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 1 }}>
              Nobody to show
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: "center" }}
            >
              {customers.length === 0
                ? "Add a customer first, then you can message them."
                : "No customer matches this search."}
            </Typography>
          </Stack>
        )}

        {rows.map((c) => (
          <ListItemButton
            key={c.id}
            onClick={() => {
              onPick(c);
              close();
            }}
            sx={{ gap: 1.5, py: 1.25 }}
          >
            <Avatar
              src={c.photo || undefined}
              sx={{
                width: 38,
                height: 38,
                bgcolor: "primary.main",
                fontSize: "0.9rem",
                fontWeight: 600,
              }}
            >
              {c.name?.[0]?.toUpperCase()}
            </Avatar>

            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                {c.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {c.mobile || "No mobile on file"}
              </Typography>
            </Box>
          </ListItemButton>
        ))}
      </DialogContent>

      <Divider />

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ px: 2.5, py: 1.5 }}
      >
        {rows.length} of {customers.length} customers
      </Typography>
    </Dialog>
  );
}
