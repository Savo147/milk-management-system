"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { BRANDING_TAG } from "@/lib/cache-tags";

function refresh() {
  revalidatePath("/", "layout");
}

/** Dairy name, logo, address, phone and the low-stock threshold. */
export async function saveBusinessSettings(prevState, formData) {
  // A Server Action is a public endpoint; the page guard does not cover it.
  await requireAdmin();

  const dairyName = String(formData.get("dairy_name") ?? "").trim();
  const logoUrl = String(formData.get("logo_url") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const threshold = Number(formData.get("low_stock_threshold"));

  if (!dairyName) return { error: "Dairy nu naam nakho." };
  if (!Number.isFinite(threshold) || threshold < 0) {
    return { error: "Low-stock threshold 0 ke tethi vadhu hovu joiye." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("business_settings")
    .update({
      dairy_name: dairyName,
      logo_url: logoUrl || null,
      address: address || null,
      phone: phone || null,
      low_stock_threshold: threshold,
    })
    .eq("id", true);

  if (error) return { error: `Save na thai shakyu: ${error.message}` };

  // The name and logo are cached for everyone, signed in or not. Without this
  // a rename would keep showing the old one for the next five minutes.
  revalidateTag(BRANDING_TAG);

  refresh();
  return { ok: true };
}

/** The signed-in admin's own name, mobile and photo. */
export async function updateProfile(prevState, formData) {
  const admin = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const mobile = String(formData.get("mobile") ?? "").trim();
  const photo = String(formData.get("profile_photo") ?? "").trim();

  if (!name) return { error: "Naam nakho." };
  if (mobile && !/^\d{10}$/.test(mobile)) {
    return { error: "Mobile 10 aank no hovo joiye." };
  }

  const supabase = await createClient();

  // Only these three columns are writable by `authenticated` — role and
  // status are not, by design.
  const { error } = await supabase
    .from("users")
    .update({
      name,
      mobile: mobile || null,
      profile_photo: photo || null,
    })
    .eq("id", admin.id);

  if (error) return { error: `Save na thai shakyu: ${error.message}` };

  refresh();
  return { ok: true };
}

export async function changePassword(prevState, formData) {
  await requireAdmin();

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

/**
 * Role or status for a staff member.
 *
 * Goes through the service-role client because `authenticated` has no grant on
 * those two columns. An admin cannot change their own — locking yourself out
 * of the only admin account is not a mistake worth allowing.
 */
export async function updateStaff(prevState, formData) {
  const admin = await requireAdmin();

  const id = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!id) return { error: "User malyo nahi." };
  if (id === admin.id) {
    return { error: "Tame tamaro potano role ke status badli na shako." };
  }
  if (!["admin", "customer"].includes(role)) {
    return { error: "Role barabar nathi." };
  }
  if (!["active", "inactive"].includes(status)) {
    return { error: "Status barabar nathi." };
  }

  const db = createAdminClient();
  const { error } = await db
    .from("users")
    .update({ role, status })
    .eq("id", id);

  if (error) return { error: `Save na thai shakyu: ${error.message}` };

  refresh();
  return { ok: true };
}

/**
 * Creates another admin login.
 *
 * Signup always produces a 'customer' — the handle_new_user trigger hard-codes
 * it so nobody can register themselves as an admin — so an admin has to be
 * made here, with the service key.
 */
export async function addStaff(prevState, formData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const mobile = String(formData.get("mobile") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name) return { error: "Naam nakho." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Email barabar nathi." };
  if (mobile && !/^\d{10}$/.test(mobile)) {
    return { error: "Mobile 10 aank no hovo joiye." };
  }
  if (password.length < 8) {
    return { error: "Password ochha ma ochho 8 akshar no hovo joiye." };
  }

  const db = createAdminClient();

  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, mobile },
  });

  if (error) return { error: `Banavi na shakayu: ${error.message}` };

  // The trigger has already inserted the profile as a customer; promote it.
  const { error: upErr } = await db
    .from("users")
    .update({ name, mobile: mobile || null, role: "admin", status: "active" })
    .eq("id", data.user.id);

  if (upErr) return { error: `Profile update na thayu: ${upErr.message}` };

  refresh();
  return { ok: true };
}
