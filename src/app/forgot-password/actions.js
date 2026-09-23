"use server";

import { createClient } from "@/lib/supabase/server";
import { siteOrigin } from "@/lib/site";

/**
 * Emails a one-time link that signs the person in just long enough to set a
 * new password.
 *
 * Supabase answers the same way whether or not the address is registered, and
 * this keeps that: saying "no such email" would hand anyone a way to find out
 * which of your customers have accounts. So the screen always reports that a
 * mail has been sent.
 */
export async function sendResetLink(prevState, formData) {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) return { error: "Enter an email." };
  if (!/^\S+@\S+\.\S+$/.test(email))
    return { error: "That email is not valid." };

  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    // Its own route, not /auth/callback — Supabase checks this whole URL
    // against the allow list, so a plain path is one less thing to get wrong.
    redirectTo: `${await siteOrigin()}/auth/reset`,
  });

  if (error) {
    console.error("[forgot] reset email failed:", error);

    // Worth naming: the built-in mail service allows only a few an hour, and
    // "try again later" is the one useful thing to say about it.
    if (error.status === 429) {
      // Supabase throttles twice over: a short cooldown per address, and a
      // cap per hour for the whole project. Telling somebody to wait an hour
      // when the real answer is "half a minute" makes them give up for
      // nothing, so its own wait time is used when it gives one.
      const wait = /after (\d+) seconds?/i.exec(error.message)?.[1];

      return {
        error: wait
          ? `Hold on — try again in ${wait} seconds.`
          : "This hour's email limit is used up. Try again in an hour.",
      };
    }

    // status 0 means the request never reached Supabase at all — "email na
    // mokli shakai (fetch failed)" sends you hunting through mail settings
    // for a problem that is not there.
    if (error.status === 0 || /fetch failed/i.test(error.message)) {
      return {
        error:
          "Could not reach the server. Check your connection and try again.",
      };
    }

    return { error: `Could not send the email. (${error.message})` };
  }

  return { ok: true, email };
}
