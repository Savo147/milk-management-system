"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import MicNoneIcon from "@mui/icons-material/MicNone";
import SendIcon from "@mui/icons-material/Send";

/** Longest voice note, in seconds. Past this it stops itself and is ready. */
const MAX_SECONDS = 180;

/**
 * The browser records in whatever it has: Chrome and Firefox do Opus in a
 * WebM container, Safari only does AAC in MP4. Both play back everywhere
 * that matters, so it is enough to take the first one that is supported.
 */
function pickMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];

  if (typeof MediaRecorder === "undefined") return null;
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

/** "1:07" */
const mmss = (secs) =>
  `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

/**
 * Records a voice note and hands it over as a File.
 *
 * Idle it is one microphone button. While recording it takes over the whole
 * composer row — a red dot, the running time, a bin to throw it away and a
 * send arrow — because half a composer next to a running recorder only
 * invites someone to type into a box that is not going to be sent.
 */
export default function VoiceRecorder({
  disabled = false,
  onRecording,
  onDone,
  onError,
}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const keepRef = useRef(false);

  /**
   * Ends the recording. `keep` decides what the recorder's onstop does with
   * what it has: hand it over, or drop it.
   */
  const stop = useCallback(
    (keep) => {
      keepRef.current = keep;

      try {
        if (recorderRef.current?.state === "recording") {
          recorderRef.current.stop();
        }
      } catch {
        setRecording(false);
        onRecording?.(false);
      }
    },
    [onRecording],
  );

  // Whatever happens to this component, the microphone gets released — a tab
  // left with a live recording light on is nobody's idea of fine.
  useEffect(
    () => () => {
      try {
        if (recorderRef.current?.state === "recording") {
          recorderRef.current.stop();
        }
      } catch {
        // Already stopped.
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  // The clock, and the cap it runs into. Both live in the interval rather
  // than in an effect watching `seconds`, so stopping is something the tick
  // does, not something a render notices afterwards.
  useEffect(() => {
    if (!recording) return;

    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += 1;
      setSeconds(elapsed);
      // Long enough is long enough; it stops itself and keeps what it has.
      if (elapsed >= MAX_SECONDS) stop(true);
    }, 1000);

    return () => clearInterval(timer);
  }, [recording, stop]);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      onError?.("This browser cannot record audio.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      if (mimeType === null) {
        stream.getTracks().forEach((t) => t.stop());
        onError?.("This browser cannot record audio.");
        return;
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      chunksRef.current = [];
      keepRef.current = false;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setRecording(false);
        onRecording?.(false);

        if (!keepRef.current) return;

        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        if (blob.size === 0) return;

        // The extension only has to match the container for the player to
        // know what it is looking at.
        const ext = type.includes("mp4")
          ? "m4a"
          : type.includes("ogg")
            ? "ogg"
            : "webm";

        onDone?.(
          new File([blob], `voice-${Date.now()}.${ext}`, { type }),
          seconds,
        );
      };

      recorderRef.current = recorder;
      streamRef.current = stream;
      setSeconds(0);
      setRecording(true);
      onRecording?.(true);
      recorder.start();
    } catch (err) {
      onError?.(
        err?.name === "NotAllowedError"
          ? "Microphone blocked. Allow it in the browser and try again."
          : "Could not start recording.",
      );
    }
  };

  if (!recording) {
    return (
      <Tooltip title="Record a voice message">
        <span>
          <IconButton
            size="small"
            disabled={disabled}
            onClick={start}
            aria-label="Record a voice message"
            sx={{ color: "text.secondary" }}
          >
            <MicNoneIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    );
  }

  return (
    <Stack
      direction="row"
      sx={{ gap: 1, alignItems: "center", flexGrow: 1, px: 0.5 }}
    >
      <Tooltip title="Throw it away">
        <IconButton
          size="small"
          onClick={() => stop(false)}
          aria-label="Cancel the recording"
        >
          <DeleteOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          bgcolor: "error.main",
          flexShrink: 0,
          animation: "chatRecPulse 1.2s ease-in-out infinite",
          "@keyframes chatRecPulse": {
            "0%, 100%": { opacity: 1 },
            "50%": { opacity: 0.25 },
          },
        }}
      />

      <Typography
        variant="body2"
        sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}
      >
        {mmss(seconds)}
      </Typography>

      <Typography variant="caption" color="text.secondary" noWrap>
        Recording — up to {mmss(MAX_SECONDS)}
      </Typography>

      <Box sx={{ flexGrow: 1 }} />

      <Tooltip title="Send">
        <IconButton
          color="primary"
          onClick={() => stop(true)}
          aria-label="Send the recording"
        >
          <SendIcon />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
