"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloseIcon from "@mui/icons-material/Close";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import SendIcon from "@mui/icons-material/Send";
import { alpha } from "@mui/material/styles";
import { clock, dayLabel } from "@/lib/chat-format";
import Attachment from "@/components/Attachment";
import EmojiPicker from "@/components/EmojiPicker";
import VoiceRecorder from "@/components/VoiceRecorder";
import {
  loadMessages,
  sendMessage,
  markRead,
  setComplaintStatus,
} from "@/lib/chat-actions";
import { uploadAttachment, formatBytes } from "@/lib/chat-upload";

const AVATAR_SIZE = 28;

/** The initial in a message's circle: the sender's, falling back to "?". */
const initialOf = (name) => name?.trim()?.[0]?.toUpperCase() ?? "?";

function Bubble({ message, initial, photo, showAvatar, onToggleComplaint }) {
  const mine = message.mine;

  // The circle only appears once per run of messages from the same side, but
  // the space it takes is always there, so the bubbles above it stay in line.
  const circle = showAvatar ? (
    <Avatar
      src={photo || undefined}
      sx={{
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        fontSize: "0.75rem",
        fontWeight: 700,
        bgcolor: mine ? "primary.main" : "grey.300",
        color: mine ? "primary.contrastText" : "text.primary",
      }}
    >
      {initial}
    </Avatar>
  ) : (
    <Box sx={{ width: AVATAR_SIZE, flexShrink: 0 }} />
  );

  return (
    <Stack
      direction="row"
      sx={{
        gap: 1,
        px: 1.5,
        py: 0.4,
        alignItems: "flex-end",
        justifyContent: mine ? "flex-end" : "flex-start",
      }}
    >
      {!mine && circle}

      <Box
        sx={{
          maxWidth: "80%",
          px: 1.5,
          py: 1,
          borderRadius: 2,
          // The corner nearest the sender is squared off, the way a chat
          // bubble points back at whoever wrote it.
          borderBottomRightRadius: mine ? 4 : 16,
          borderBottomLeftRadius: mine ? 16 : 4,
          bgcolor: mine ? "primary.main" : "grey.100",
          color: mine ? "primary.contrastText" : "text.primary",
        }}
      >
        {/* In a channel there can be more than two people, so anything that
            is not yours carries the name of whoever wrote it. */}
        {/* A complaint raised on the Problems page, shown here so the whole
            exchange reads in one column. What it is about and where it has
            got to go on top of it — the text below is what was written. */}
        {message.complaint && (
          <Stack
            direction="row"
            sx={{ gap: 0.75, alignItems: "center", mb: 0.5 }}
          >
            <ReportProblemOutlinedIcon sx={{ fontSize: 15, opacity: 0.9 }} />
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, opacity: 0.9 }}
            >
              {message.complaint.issue}
            </Typography>
            <Tooltip
              title={
                onToggleComplaint
                  ? message.complaint.done
                    ? "Reopen this complaint"
                    : "Mark this complaint done"
                  : ""
              }
            >
              <Chip
                size="small"
                label={message.complaint.state}
                color={message.complaint.done ? "success" : "warning"}
                variant="outlined"
                // The dairy can settle a complaint without leaving the
                // conversation it is being discussed in.
                onClick={
                  onToggleComplaint
                    ? () =>
                        onToggleComplaint(
                          message.complaint.reportId,
                          message.complaint.done,
                        )
                    : undefined
                }
                sx={{
                  height: 17,
                  fontSize: "0.62rem",
                  // Inside a coloured bubble the chip's own palette would be
                  // unreadable, so it borrows the bubble's ink instead.
                  ...(mine && {
                    color: "inherit",
                    borderColor: "rgba(255, 255, 255, 0.5)",
                  }),
                }}
              />
            </Tooltip>
          </Stack>
        )}

        {/* The file first, then anything typed with it. */}
        <Attachment attachment={message.attachment} mine={mine} />

        {message.showSender && !mine && (
          <Typography
            variant="caption"
            sx={{ display: "block", fontWeight: 700, color: "primary.main" }}
          >
            {message.sender_name}
          </Typography>
        )}

        {message.message && (
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
            {message.message}
          </Typography>
        )}
        <Typography
          variant="caption"
          sx={{
            display: "block",
            mt: 0.25,
            textAlign: "right",
            fontSize: "0.65rem",
            opacity: 0.7,
          }}
        >
          {clock(message.created_at)}
        </Typography>
      </Box>

      {mine && circle}
    </Stack>
  );
}

/**
 * One conversation: its messages and the box to answer in.
 *
 * Owns its own loading and sending, so the header popover, the chat page and
 * the customer's page all show the same thread without repeating any of it.
 */
export default function ChatThread({
  kind = "dm",
  targetId,
  meName,
  themName,
  mePhoto,
  themPhoto,
  canManage = false,
  hasUnread = false,
  canPost = true,
  readOnlyNote = "Only the dairy can post here.",
  emptyText = "No messages yet. Say hello.",
  onSent,
}) {
  const [messages, setMessages] = useState(null); // null = still loading
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sending, startSending] = useTransition();
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!targetId) return;

    // No state is reset here: every caller keys this component by the
    // customer, so switching conversation remounts it and the fields start
    // out empty again.
    let live = true;

    loadMessages(kind, targetId).then((res) => {
      if (!live) return;
      if (res.error) {
        setError(res.error);
        setMessages([]);
        return;
      }
      setMessages(res.messages);
      // Opening the thread is the same as having read it.
      if (hasUnread) markRead(kind, targetId);
    });

    // A fast switch between two customers must not let the slower reply
    // overwrite the thread that is now on screen.
    return () => {
      live = false;
    };
  }, [kind, targetId, hasUnread]);

  // Every new message drops the view to the bottom, where the talk is.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  /**
   * Drops an emoji in at the cursor rather than on the end, so one picked
   * halfway through a sentence lands where it was meant to. The caret is put
   * back after it, ready for the next word.
   */
  const insertEmoji = (emoji) => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? draft.length;
    const end = input?.selectionEnd ?? draft.length;

    setDraft(draft.slice(0, start) + emoji + draft.slice(end));

    requestAnimationFrame(() => {
      input?.focus();
      const at = start + emoji.length;
      input?.setSelectionRange(at, at);
    });
  };

  /**
   * Puts the chosen file in Storage straight away and holds on to what came
   * back. Uploading on pick rather than on send means the wait happens while
   * the message is still being typed, and by the time Send is pressed there
   * is nothing left to wait for.
   */
  /**
   * Settles a complaint, or reopens it, without leaving the thread. The
   * messages are reloaded afterwards so the chip shows where it has got to,
   * and the parent is told so the Problems page's counts catch up.
   */
  const toggleComplaint = (reportId, done) => {
    startSending(async () => {
      const res = await setComplaintStatus(reportId, done ? "pending" : "done");

      if (res?.error) {
        setError(res.error);
        return;
      }

      const fresh = await loadMessages(kind, targetId);
      setMessages(fresh.messages ?? []);
      onSent?.();
    });
  };

  /**
   * A voice note goes straight out. Unlike a picked file there is nothing to
   * caption and nothing to reconsider — the recorder's own bin button is
   * where second thoughts belong, and it has already been passed.
   */
  const sendVoice = (file) => {
    setUploading(true);
    setError(null);

    startSending(async () => {
      const up = await uploadAttachment(file, kind, targetId);
      setUploading(false);

      if (up.error) {
        setError(up.error);
        return;
      }

      const res = await sendMessage(kind, targetId, "", up.attachment);
      if (res.error) {
        setError(res.error);
        return;
      }

      const fresh = await loadMessages(kind, targetId);
      setMessages(fresh.messages ?? []);
      onSent?.();
    });
  };

  const attach = async (file) => {
    if (!file) return;

    setUploading(true);
    setError(null);

    const res = await uploadAttachment(file, kind, targetId);
    setUploading(false);

    if (res.error) {
      setError(res.error);
      return;
    }
    setPending(res.attachment);
  };

  const send = () => {
    const text = draft.trim();
    if ((!text && !pending) || !targetId) return;

    startSending(async () => {
      const res = await sendMessage(kind, targetId, text, pending);
      if (res.error) {
        setError(res.error);
        return;
      }

      setDraft("");
      setPending(null);
      setError(null);

      const fresh = await loadMessages(kind, targetId);
      setMessages(fresh.messages ?? []);
      onSent?.();
    });
  };

  let lastDay = null;

  return (
    <>
      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          overflowY: "auto",
          py: 1,
          bgcolor: (t) => alpha(t.palette.primary.main, 0.02),
        }}
      >
        {messages === null && (
          <Stack sx={{ alignItems: "center", py: 4 }}>
            <CircularProgress size={22} />
          </Stack>
        )}

        {messages?.length === 0 && (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              {emptyText}
            </Typography>
          </Box>
        )}

        {messages?.map((m, i, arr) => {
          const day = dayLabel(m.created_at);
          const newDay = day !== lastDay;
          lastDay = day;

          // In a channel the circle belongs to whoever wrote it; in a direct
          // thread there are only two sides, so it is either you or the name
          // at the top of the conversation.
          const initial = initialOf(
            m.mine ? meName : m.showSender ? m.sender_name : themName,
          );

          // A channel message carries its own sender's face; in a direct
          // thread there are only two, and they are known up front — which
          // also covers a complaint, whose row has no sender joined to it.
          const photo = m.showSender
            ? (m.photo ?? null)
            : (m.mine ? mePhoto : themPhoto) || m.photo || null;

          // The last message of a run carries the circle, so it sits level
          // with the bottom of the group the way it does in a phone's chat.
          const next = arr[i + 1];
          const showAvatar = !next || next.mine !== m.mine;

          return (
            <Box key={m.id}>
              {newDay && (
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    textAlign: "center",
                    my: 1,
                    color: "text.disabled",
                  }}
                >
                  {day}
                </Typography>
              )}
              <Bubble
                message={m}
                initial={initial}
                photo={photo}
                showAvatar={showAvatar}
                onToggleComplaint={
                  canManage && m.complaint ? toggleComplaint : undefined
                }
              />
            </Box>
          );
        })}

        <div ref={endRef} />
      </Box>

      <Divider />

      {/* An announcement channel: everyone reads, only the dairy writes. The
          composer is left out rather than disabled, so there is nothing to
          click at and be refused by. */}
      {!canPost && (
        <Typography
          variant="caption"
          sx={{ p: 2, textAlign: "center", color: "text.secondary" }}
        >
          {readOnlyNote}
        </Typography>
      )}

      {/* What is already uploaded and waiting to go with the next message. */}
      {canPost && pending && (
        <Stack
          direction="row"
          sx={{
            gap: 1,
            mx: 1.25,
            mt: 1.25,
            p: 1,
            alignItems: "center",
            borderRadius: 2,
            bgcolor: "action.hover",
            flexShrink: 0,
          }}
        >
          <AttachFileIcon fontSize="small" sx={{ color: "text.secondary" }} />

          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
              {pending.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatBytes(pending.size)} · ready to send
            </Typography>
          </Box>

          <IconButton
            size="small"
            onClick={() => setPending(null)}
            aria-label="Remove the file"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      )}

      {canPost && (
        <Stack
          direction="row"
          sx={{ gap: 0.5, p: 1.25, alignItems: "flex-end", flexShrink: 0 }}
        >
          {/* While the microphone is live it takes the whole row: the recorder
              renders its own timer, bin and send arrow in here. */}
          <Box sx={{ pb: 0.5, display: "flex", flexGrow: recording ? 1 : 0 }}>
            <VoiceRecorder
              disabled={uploading || sending}
              onRecording={setRecording}
              onDone={sendVoice}
              onError={setError}
            />
          </Box>

          <Box sx={{ pb: 0.5, display: recording ? "none" : "block" }}>
            <Tooltip title="Attach a file">
              <span>
                <IconButton
                  size="small"
                  disabled={uploading || sending}
                  onClick={() => fileRef.current?.click()}
                  aria-label="Attach a file"
                  sx={{ color: "text.secondary" }}
                >
                  {uploading ? (
                    <CircularProgress size={18} />
                  ) : (
                    <AttachFileIcon fontSize="small" />
                  )}
                </IconButton>
              </span>
            </Tooltip>

            <input
              ref={fileRef}
              type="file"
              hidden
              onChange={(e) => {
                attach(e.target.files?.[0]);
                // Cleared so picking the same file twice still fires.
                e.target.value = "";
              }}
            />
          </Box>

          <Box sx={{ pb: 0.5, display: recording ? "none" : "block" }}>
            <EmojiPicker onPick={insertEmoji} />
          </Box>

          {!recording && (
            <TextField
              inputRef={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends; Shift+Enter is how you get a second line.
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Write a message"
              size="small"
              fullWidth
              multiline
              maxRows={4}
              slotProps={{ input: { sx: { borderRadius: 3 } } }}
            />
          )}

          {!recording && (
            <IconButton
              color="primary"
              onClick={send}
              disabled={sending || uploading || (!draft.trim() && !pending)}
              aria-label="Send"
            >
              {sending ? <CircularProgress size={20} /> : <SendIcon />}
            </IconButton>
          )}
        </Stack>
      )}

      {error && (
        <Typography
          variant="caption"
          sx={{ px: 2, pb: 1, color: "error.main", flexShrink: 0 }}
        >
          {error}
        </Typography>
      )}
    </>
  );
}
