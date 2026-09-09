"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { MILK_QUANTITIES } from "@/lib/constants";

function parseForm(formData) {
  const name = String(formData.get("name") ?? "").trim();
  const mobile = String(formData.get("mobile") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const dailyQuantity = Number(formData.get("daily_quantity"));
  const rate = Number(formData.get("rate_per_liter"));
  const deliveryTime = String(formData.get("delivery_time") ?? "").trim();
  const status = formData.get("status") === "inactive" ? "inactive" : "active";

  if (!name) return { error: "Naam nakho." };
  if (!/^\d{10}$/.test(mobile)) return { error: "Mobile 10 aank no hovo joiye." };
  if (!MILK_QUANTITIES.includes(dailyQuantity)) {
    return { error: "Daily quantity 0.5 thi 5 L ni vachche, 0.5 na step ma." };
  }
  if (!Number.isFinite(rate) || rate <= 0) {
    return { error: "Rate 0 thi vadhare hovo joiye." };
  }

  return {
    values: {
      name,
      mobile,
      address: address || null,
      daily_quantity: dailyQuantity,
      rate_per_liter: rate,
      delivery_time: deliveryTime || null,
      status,
    },
  };
}

export async function saveCustomer(prevState, formData) {
  // Re-checked here on purpose: a Server Action is a public endpoint, so the
  // page's own guard is not enough.
  await requireAdmin();

  const { error: invalid, values } = parseForm(formData);
  if (invalid) return { error: invalid };

  const id = formData.get("id");
  const supabase = await createClient();

  const { error } = id
    ? await supabase.from("customers").update(values).eq("id", id)
    : await supabase.from("customers").insert(values);

  if (error) {
    return { error: `Save na thai shakyu: ${error.message}` };
  }

  revalidatePath("/admin/customers");
  return { ok: true };
}

export async function setCustomerStatus(id, status) {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({ status })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/customers");
  return { ok: true };
}
