"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Matches the rule every other password screen in the app enforces. */
const MIN_PASSWORD = 8;

/**
 * Sets the new password.
 *
 * The right to do this comes from the session the emailed link created, not
 * from anything in the form — there is no user id to pass, and nothing here
 * would be safe to trust if there were.
 */
export async function setNewPassword(prevState, formData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Link ni mudat puri thai gai. Navi link mangavi ne fari karo.",
    };
  }

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < MIN_PASSWORD) {
    return {
      error: `Password ochha ma ochho ${MIN_PASSWORD} akshar no hovo joiye.`,
    };
  }
  if (password !== confirm) return { error: "Bunne password sarkha nathi." };

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error("[reset] password update failed:", error);
    return { error: `Password badlai na shakyo: ${error.message}` };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  revalidatePath("/", "layout");

  // They are already signed in, so sending them back to the login screen to
  // type the password they just chose would be pointless.
  redirect(profile?.role === "admin" ? "/admin" : "/customer");
}
