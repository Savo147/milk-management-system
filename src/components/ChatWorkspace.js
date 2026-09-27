"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import ListItemButton from "@mui/material/ListItemButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import ExploreOutlinedIcon from "@mui/icons-material/ExploreOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PublicIcon from "@mui/icons-material/Public";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import SearchIcon from "@mui/icons-material/Search";
import ChatThread from "@/components/ChatThread";
import MessagesIcon from "@/components/MessagesIcon";
import DiscoverDialog from "@/components/DiscoverDialog";
import CreateChannelDialog from "@/components/CreateChannelDialog";
import { ago, preview } from "@/lib/chat-format";

const SIDEBAR_WIDTH = 300;

/** The grey heading over each block of the sidebar. */
const sectionSx = {
  display: "block",
  px: 2,
  pt: 2,
  pb: 0.5,
  color: "text.secondary",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontSize: "0.68rem",
};

/** The little red count on the right of a row. */
function UnreadDot({ count }) {
  if (!count) return null;

  return (
    <Box
      sx={{
        minWidth: 18,
        height: 18,
        px: 0.5,
        borderRadius: 9,
        bgcolor: "error.main",
        color: "common.white",
        fontSize: "0.65rem",
        fontWeight: 700,
        lineHeight: "18px",
        textAlign: "center",
      }}
    >
      {count}
    </Box>
  );
}

/** One row in either list: an avatar or icon, a name, its last line and age. */
function Row({ item, selected, onClick, avatar }) {
  return (
    <ListItemButton
      selected={selected}
      onClick={onClick}
      sx={{ gap: 1.25, borderRadius: 2, py: 1, mb: 0.25 }}
    >
      {avatar}

      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography
          variant="body2"
          noWrap
          sx={{ fontWeight: item.unread ? 700 : 600 }}
        >
          {item.name}
        </Typography>
        <Typography
          variant="caption"
          noWrap
          sx={{
            display: "block",
            color: item.unread ? "text.primary" : "text.secondary",
          }}
        >
          {preview(item)}
        </Typography>
      </Box>

      <Stack sx={{ alignItems: "flex-end", gap: 0.5, flexShrink: 0 }}>
        <Typography variant="caption" color="text.disabled">
          {ago(item.lastAt)}
        </Typography>

        {item.problems > 0 && (
          <Stack direction="row" sx={{ alignItems: "center", gap: 0.25 }}>
            <ReportProblemOutlinedIcon
              sx={{
                fontSize: 13,
                // Amber while something is still open, grey once it is all
                // dealt with — the count alone would not say which.
                color: item.pending ? "warning.main" : "text.disabled",
              }}
            />
            <Typography
              variant="caption"
              sx={{ color: item.pending ? "warning.main" : "text.disabled" }}
            >
              {item.problems}
            </Typography>
          </Stack>
        )}

        <UnreadDot count={item.unread} />
      </Stack>
    </ListItemButton>
  );
}

/**
 * The chat page: channels and direct conversations on the left, whichever one
 * is open on the right.
 *
 * The same component serves the dairy and a customer. A customer has no list
 * to manage — one direct thread with the dairy plus whatever channels they
 * are in — so the buttons that create things are simply left out for them.
 */
export default function ChatWorkspace({
  isAdmin,
  dairyName,
  meName,
  mePhoto,
  logoUrl,
  threads = [],
  problemThreads = [],
  channels = [],
  customers = [],
  initialSelection = null,
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(initialSelection);
  const [query, setQuery] = useState("");
  const [discovering, setDiscovering] = useState(false);
  // On, the customer list narrows to whoever has raised a complaint —
  // including those who have never sent a chat message.
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [creating, setCreating] = useState(false);

  const chattingWith = useMemo(
    () => new Set(threads.map((t) => t.customerId)),
    [threads],
  );

  const q = query.trim().toLowerCase();
  const matches = (item) =>
    !q ||
    (item.name ?? "").toLowerCase().includes(q) ||
    (item.last ?? "").toLowerCase().includes(q);

  // A customer's own thread has no name of its own; it is the dairy.
  const dms = useMemo(
    () =>
      (onlyProblems ? problemThreads : threads)
        .map((t) => ({ ...t, name: t.name ?? dairyName }))
        .filter(matches),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [threads, problemThreads, onlyProblems, dairyName, q],
  );

  const rooms = useMemo(
    () => channels.filter(matches),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [channels, q],
  );

  const unread =
    threads.reduce((n, t) => n + t.unread, 0) +
    channels.reduce((n, c) => n + c.unread, 0);

  // Picking someone out of the Find dialog has to work even when there is no
  // thread yet, so the selection carries its own name rather than looking one
  // up in a list they are not in.
  const pickCustomer = (customer) =>
    setSelected({
      kind: "dm",
      id: customer.id,
      name: customer.name,
      sub: customer.mobile,
      photo: customer.photo ?? null,
      unread: 0,
    });

  const pickThread = (t) =>
    setSelected({
      kind: "dm",
      id: t.customerId,
      name: t.name,
      // A customer is only ever talking to the dairy, so the dairy's own
      // logo stands in for a face on that side.
      photo: isAdmin ? (t.photo ?? null) : logoUrl,
      sub: isAdmin ? t.mobile : "Your dairy",
      unread: t.unread,
    });

  const pickChannel = (c) =>
    setSelected({
      kind: "channel",
      id: c.id,
      name: c.name,
      sub:
        c.description ||
        `${c.isPrivate ? "Private" : "Public"} channel${c.announcementOnly ? " · announcements" : ""}`,
      unread: c.unread,
      isPrivate: c.isPrivate,
      announcementOnly: c.announcementOnly,
    });

  const sidebar = (
    <Stack sx={{ height: "100%", minHeight: 0 }}>
      <Stack
        direction="row"
        sx={{ gap: 1.5, alignItems: "center", p: 2, flexShrink: 0 }}
      >
        <Avatar
          variant="rounded"
          sx={{ bgcolor: "primary.main", width: 40, height: 40 }}
        >
          <MessagesIcon sx={{ fontSize: 22, color: "common.white" }} />
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
            {dairyName} Chat
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {unread > 0 ? `${unread} unread` : "All caught up"}
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ px: 2, pb: 1, flexShrink: 0 }}>
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          size="small"
          fullWidth
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

      <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: "auto", px: 1, pb: 1 }}>
        <Stack direction="row" sx={{ alignItems: "center", pr: 0.5 }}>
          <Typography variant="caption" sx={{ ...sectionSx, flexGrow: 1 }}>
            Channels
          </Typography>
          {isAdmin && (
            <Tooltip title="Create a channel">
              <IconButton size="small" onClick={() => setCreating(true)}>
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>

        {rooms.length === 0 && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ px: 1, py: 1 }}
          >
            {isAdmin
              ? "No channels yet. Make one to tell every customer something at once."
              : "No channels yet."}
          </Typography>
        )}

        {rooms.map((c) => (
          <Row
            key={c.id}
            item={c}
            selected={selected?.kind === "channel" && selected.id === c.id}
            onClick={() => pickChannel(c)}
            avatar={
              <Avatar
                variant="rounded"
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: "grey.100",
                  color: "text.secondary",
                }}
              >
                {c.isPrivate ? (
                  <LockOutlinedIcon sx={{ fontSize: 18 }} />
                ) : c.announcementOnly ? (
                  <CampaignOutlinedIcon sx={{ fontSize: 18 }} />
                ) : (
                  <PublicIcon sx={{ fontSize: 18 }} />
                )}
              </Avatar>
            }
          />
        ))}

        <Stack direction="row" sx={{ alignItems: "center", pr: 0.5 }}>
          <Typography variant="caption" sx={{ ...sectionSx, flexGrow: 1 }}>
            {isAdmin
              ? onlyProblems
                ? "With complaints"
                : "Customers"
              : "The dairy"}
          </Typography>
          {isAdmin && (
            <Tooltip title="Find a customer">
              <IconButton size="small" onClick={() => setDiscovering(true)}>
                <ExploreOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>

        {/* Narrows the list to whoever has raised a complaint. They are shown
            whether or not there is a conversation with them yet — somebody
            who complained and has never been answered is exactly who this is
            meant to surface. */}
        {isAdmin && (
          <Stack
            direction="row"
            sx={{ alignItems: "center", gap: 1, pl: 2, pr: 1, py: 0.25 }}
          >
            <ReportProblemOutlinedIcon
              sx={{
                fontSize: 16,
                color: onlyProblems ? "warning.main" : "text.disabled",
              }}
            />
            <Typography variant="body2" sx={{ flexGrow: 1 }}>
              Only with complaints
            </Typography>
            <Switch
              size="small"
              checked={onlyProblems}
              onChange={(e) => setOnlyProblems(e.target.checked)}
              slotProps={{
                input: { "aria-label": "Show only customers who complained" },
              }}
            />
          </Stack>
        )}

        {isAdmin && (
          <ListItemButton
            onClick={() => setDiscovering(true)}
            sx={{ gap: 1.5, borderRadius: 2, py: 1 }}
          >
            <ExploreOutlinedIcon
              fontSize="small"
              sx={{ color: "text.secondary" }}
            />
            <Typography variant="body2">Find a customer</Typography>
          </ListItemButton>
        )}

        {dms.length === 0 && isAdmin && onlyProblems && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ px: 1, py: 1 }}
          >
            Nobody has complained. Turn this off to see everyone.
          </Typography>
        )}

        {dms.length === 0 && !isAdmin && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ px: 1, py: 1 }}
          >
            No messages with the dairy yet.
          </Typography>
        )}

        {dms.map((t) => (
          <Row
            key={t.customerId}
            item={t}
            selected={selected?.kind === "dm" && selected.id === t.customerId}
            onClick={() => pickThread(t)}
            avatar={
              <Avatar
                src={(isAdmin ? t.photo : logoUrl) || undefined}
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: "primary.main",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              >
                {t.name?.[0]?.toUpperCase()}
              </Avatar>
            }
          />
        ))}
      </Box>
    </Stack>
  );

  const isChannel = selected?.kind === "channel";
  // In an announcement channel only the dairy writes; everywhere else both
  // sides can.
  const canPost = !isChannel || isAdmin || !selected.announcementOnly;

  const conversation = selected ? (
    <Stack sx={{ height: "100%", minHeight: 0 }}>
      <Stack
        direction="row"
        sx={{ gap: 1.5, alignItems: "center", p: 1.75, flexShrink: 0 }}
      >
        {/* On a phone the two panes take turns, so the thread needs its own
            way back to the list. */}
        <IconButton
          size="small"
          onClick={() => setSelected(null)}
          aria-label="Back to conversations"
          sx={{ display: { md: "none" } }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>

        <Avatar
          src={isChannel ? undefined : selected.photo || undefined}
          variant={isChannel ? "rounded" : "circular"}
          sx={{
            width: 38,
            height: 38,
            fontSize: "0.9rem",
            fontWeight: 600,
            bgcolor: isChannel ? "grey.100" : "primary.main",
            color: isChannel ? "text.secondary" : undefined,
          }}
        >
          {isChannel ? (
            selected.isPrivate ? (
              <LockOutlinedIcon sx={{ fontSize: 20 }} />
            ) : (
              <CampaignOutlinedIcon sx={{ fontSize: 20 }} />
            )
          ) : (
            selected.name?.[0]?.toUpperCase()
          )}
        </Avatar>

        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
            {selected.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {selected.sub || "Customer"}
          </Typography>
        </Box>

        {isChannel && selected.announcementOnly && (
          <Chip
            size="small"
            variant="outlined"
            icon={<CampaignOutlinedIcon sx={{ fontSize: 16 }} />}
            label="Announcements"
          />
        )}
      </Stack>

      <Divider />

      <ChatThread
        key={`${selected.kind}:${selected.id}:${onlyProblems}`}
        kind={selected.kind}
        targetId={selected.id}
        meName={meName}
        themName={selected.name}
        mePhoto={mePhoto}
        themPhoto={selected.photo}
        canManage={isAdmin}
        withComplaints={onlyProblems}
        hasUnread={selected.unread > 0}
        canPost={canPost}
        readOnlyNote={`Only ${dairyName} can post here.`}
        emptyText={
          isChannel
            ? `Nothing posted in ${selected.name} yet.`
            : `No messages with ${selected.name} yet. Say hello.`
        }
        // The sidebar's previews and unread counts come from the server, so
        // a sent message has to go back for them.
        onSent={() => router.refresh()}
      />
    </Stack>
  ) : (
    <Stack
      sx={{ height: "100%", alignItems: "center", justifyContent: "center", p: 4, gap: 1 }} // prettier-ignore
    >
      <Avatar
        sx={{
          bgcolor: "grey.100",
          color: "text.disabled",
          width: 56,
          height: 56,
        }}
      >
        {" "}
        {/* prettier-ignore */}
        <MessagesIcon sx={{ fontSize: 28 }} />
      </Avatar>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 1 }}>
        Pick a conversation
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ textAlign: "center" }}
      >
        {isAdmin
          ? "Choose a channel or a customer on the left, or find a customer to start a new one."
          : "Choose the dairy or a channel on the left."}
      </Typography>
    </Stack>
  );

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          display: "flex",
          overflow: "hidden",
          borderRadius: 0,
          // The page hands over its whole area, so the two panes fill it and
          // each scrolls inside itself.
          height: "100%",
        }}
      >
        <Box
          sx={{
            width: { xs: "100%", md: SIDEBAR_WIDTH },
            flexShrink: 0,
            borderRight: { md: 1 },
            borderColor: { md: "divider" },
            // One pane at a time on a phone: the list until something is
            // picked, then the thread.
            display: { xs: selected ? "none" : "block", md: "block" },
          }}
        >
          {sidebar}
        </Box>

        <Box
          sx={{
            flexGrow: 1,
            minWidth: 0,
            display: { xs: selected ? "block" : "none", md: "block" },
          }}
        >
          {conversation}
        </Box>
      </Paper>

      {isAdmin && (
        <>
          <DiscoverDialog
            open={discovering}
            onClose={() => setDiscovering(false)}
            customers={customers}
            chattingWith={chattingWith}
            onPick={pickCustomer}
          />

          <CreateChannelDialog
            open={creating}
            onClose={() => setCreating(false)}
            customers={customers}
          />
        </>
      )}
    </>
  );
}
