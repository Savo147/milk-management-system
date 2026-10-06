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

  if (!name) return { error: "Enter a name." };
  if (mobile && !/^\d{10}$/.test(mobile)) {
    return { error: "The mobile number must be 10 digits." };
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

  if (error) return { error: `Could not save: ${error.message}` };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function changeMyPassword(prevState, formData) {
  await requireCustomer();

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { error: "The password must be at least 8 characters." };
  }
  if (password !== confirm) return { error: "The two passwords do not match." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error)
    return { error: `Could not change the password: ${error.message}` };

  return { ok: true };
}

/**
 * The customer's own contact details and how much milk they want.
 *
 * The dairy keeps its own copy of a customer's mobile and address on the
 * customers row — that is what the delivery round and the bills are built
 * from — so keeping it current is worth more than making them ring up.
 *
 * The rate is not here. It was for a while, by the dairy's choice, and it is
 * the one field a customer must not be able to write: it is what their milk
 * is billed at, so setting it is setting their own bill. It is shown on the
 * form, greyed, so they can see what they are paying and ask about it.
 *
 * The status and the name on the dairy's books are not here, and not merely
 * because this action leaves them out: migration 0007 puts a trigger on the
 * table that resets them for anyone who is not the dairy.
 */
export async function updateMyMilkPlan(prevState, formData) {
  const user = await requireCustomer();

  const mobile = String(formData.get("mobile") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const deliveryTime = String(formData.get("delivery_time") ?? "").trim();
  const dailyQuantity = Number(formData.get("daily_quantity"));

  if (mobile && !/^\d{10}$/.test(mobile)) {
    return { error: "The mobile number must be 10 digits." };
  }

  if (
    !Number.isFinite(dailyQuantity) ||
    dailyQuantity < 0.25 ||
    dailyQuantity > 99
  ) {
    return { error: "Daily milk must be between 0.25 and 99 liters." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("customers")
    .update({
      mobile,
      address: address || null,
      delivery_time: deliveryTime || null,
      daily_quantity: dailyQuantity,
      // rate_per_liter is deliberately absent. The rate is what the milk is
      // billed at, and it is the dairy's to set — a customer who could write
      // it would be writing their own bill. It is shown on the form, greyed,
      // and the form does not carry it. Naming it here is the guard that
      // matters: a Server Action is a public endpoint, so leaving it out of
      // the update is what actually stops it, not leaving it out of the page.
    })
    // Their own row. RLS says the same thing, but an action that names what
    // it means does not depend on the policy being right.
    .eq("user_id", user.id);

  if (error) {
    if (error.code === "42501") {
      return { error: "Editing your plan is not set up yet (migration 0007)." };
    }
    return { error: `Could not save: ${error.message}` };
  }

  revalidatePath("/customer/profile");
  revalidatePath("/customer");
  revalidatePath("/admin/customers");
  return { ok: true };
}
