"use client";

import { useState } from "react";
import TextField from "@mui/material/TextField";

/** Roughly how tall a menu line is, plus the paper's own padding. */
const ROW = 40;
const PADDING = 16;
/** Keep this much clear of the window edge before calling it "no room". */
const EDGE = 12;

/**
 * A dropdown that opens downwards when there is room below it and upwards
 * when there is not.
 *
 * Neither of MUI's two behaviours is right on its own. Its default lays the
 * menu *over* the field so the chosen line lands on the closed one; near the
 * bottom of a scrolled dialog that leaves the menu hanging outside with
 * nothing tying it to its field. Forcing it always downwards instead pins it
 * to the very bottom edge of the window, under whatever else is down there.
 *
 * So the space is measured at the moment of opening — the field's own
 * rectangle against the window — and the menu is told which way to go. The
 * measurement happens in the click handler, not during render, which is the
 * only place reading the layout is safe.
 */
export default function SelectField({ children, slotProps, ...rest }) {
  const [up, setUp] = useState(false);

  const decide = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    // One line per option, capped the same way the menu is capped.
    const wanted = Math.min(children.length * ROW + PADDING, 280);
    setUp(window.innerHeight - box.bottom - EDGE < wanted);
  };

  return (
    <TextField
      select
      {...rest}
      slotProps={{
        ...slotProps,
        select: {
          ...slotProps?.select,
          // The whole field is the anchor, so the rectangle measured here is
          // the one the menu will actually be placed against.
          onMouseDown: decide,
          onKeyDown: (e) => {
            if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
              decide(e);
            }
          },
          MenuProps: {
            anchorOrigin: {
              vertical: up ? "top" : "bottom",
              horizontal: "left",
            },
            transformOrigin: {
              vertical: up ? "bottom" : "top",
              horizontal: "left",
            },
            slotProps: {
              paper: { sx: { my: 0.5, maxHeight: 280 } },
            },
          },
        },
      }}
    >
      {children}
    </TextField>
  );
}
