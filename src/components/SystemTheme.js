"use client";

import { useEffect } from "react";
import { deviceLook, reportDeviceLook } from "@/lib/device-theme";
import { useThemeMode } from "@/components/AppTheme";

/**
 * Keeps the app on the device's setting, until somebody says otherwise.
 *
 * Vivo, Samsung, iPhone, Windows — they all have a dark mode switch, and if
 * the phone is in dark mode the app should open dark. Only the browser can
 * answer that, so it is answered here: the reading goes into a cookie for the
 * next server render, and the look is flipped straight away in context so
 * nothing has to wait for a round trip.
 *
 * It is rendered only while nobody has chosen Light or Dark in the app. Once
 * they have, the root layout leaves this out and the phone is not asked
 * again — their choice is the answer, on that phone and on every other.
 *
 * The cookie it writes is a reading, not a preference, so it never touches
 * the row on their account: the row would travel to their other phone, where
 * the reading would be wrong.
 */
export default function SystemTheme({ painted }) {
  const { setMode } = useThemeMode();

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    // Report on arrival. Usually the cookie already says this and the page is
    // already the right colour, so nothing else happens — that is the normal
    // case. It only has work to do on the very first visit from this browser,
    // when there was no cookie for the server to read.
    if (reportDeviceLook() !== painted) setMode(deviceLook());

    // And whenever the setting is changed while the app is open.
    const follow = () => setMode(reportDeviceLook());

    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
  }, [painted, setMode]);

  return null;
}
