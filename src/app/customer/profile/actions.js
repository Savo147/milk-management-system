"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCustomer } from "@/lib/auth";

/**
 * The customer's own name, mobile and photo.
 *
 * Deliberately not their daily quantity or rate: those belong to the dairy's
 * side of the arrangement. `authenticated` has no grant to write them either,
 * so there is nothing to stop here that the database would allow.
 */
export async function updateMyProfile(prevState, formData) {
  // A Server Action is a public endpoint; the page guard does not cover it.
  const user = await requireCustomer();

  const name = String(formData.get("name") ?? "").trim();
  const mobile = String(formData.get("mobile") ?? "").trim();
  const photo = String(formData.get("profile_photo") ?? "").trim();

  if (!name) return { error: "Naam nakho." };
  if (mobile && !/^\d{10}$/.test(mobile)) {
    return { error: "Mobile 10 aank no hovo joiye." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("users")
    .update({
      name,
      mobile: mobile || null,
      profile_photo: photo || null,
    })
    .eq("id", user.id);

  if (error) return { error: `Save na thai shakyu: ${error.message}` };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function changeMyPassword(prevState, formData) {
  await requireCustomer();

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { error: "Password ochha ma ochho 8 akshar no hovo joiye." };
  }
  if (password !== confirm) return { error: "Bunne password sarkha nathi." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: `Password badlai na shakyo: ${error.message}` };

  return { ok: true };
}
