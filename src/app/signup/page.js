import { redirect } from "next/navigation";
import { getCurrentUser, getPublicBranding } from "@/lib/auth";
import AuthCard from "@/components/AuthCard";
import SignupForm from "./SignupForm";

export const metadata = { title: "Create account" };

export default async function SignupPage() {
  // Already signed in: there is nothing to create.
  const user = await getCurrentUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/customer");

  const settings = await getPublicBranding();

  return (
    <AuthCard
      dairyName={settings.dairy_name}
      logoUrl={settings.logo_url}
      title="Create your account"
    >
      <SignupForm />
    </AuthCard>
  );
}
