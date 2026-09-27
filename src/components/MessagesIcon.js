"use client";

import SvgIcon from "@mui/material/SvgIcon";

/**
 * Two round chat bubbles, one overlapping the other, drawn as strokes.
 *
 * MUI only ships square-cornered chat glyphs (Forum, QuestionAnswer,
 * ChatBubble), so the geometry is here rather than pulling in a whole icon
 * set for one button: a closed bubble up on the left with its tail at seven
 * o'clock, and behind it a second bubble, drawn only where the first does not
 * already cover it, with its tail at four o'clock.
 *
 * Colour follows currentColor and the size follows fontSize, the same as any
 * real MUI icon, so it sits in a button beside them without adjustment.
 */
export default function MessagesIcon({ sx, ...props }) {
  return (
    <SvgIcon
      {...props}
      viewBox="0 0 24 24"
      sx={{
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.7,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        ...sx,
      }}
    >
      <path d="M5.85 13.41L2.68 13.3L3.95 10.64A5.6 5.6 0 1 1 5.85 13.41Z" />
      <path d="M14.89 9.4A5.4 5.4 0 0 1 20.01 16.82L20.82 19.69L18.1 19.22A5.4 5.4 0 0 1 9.6 14.59" />
    </SvgIcon>
  );
}
