import { redirect } from "next/navigation";
import { getCurrentUser, getPublicBranding } from "@/lib/auth";
import AuthCard from "@/components/AuthCard";
import ForgotForm from "./ForgotForm";

const ERRORS = {
  link: "This link has expired or has already been used. Request a new one.",
};

export const metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage({ searchParams }) {
  // Already signed in? Then the Profile page is the place to change it, and
  // an email round trip would be a strange way to get there.
  const user = await getCurrentUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/customer");

  const { error } = await searchParams;
  const settings = await getPublicBranding();

  return (
    <AuthCard
      dairyName={settings.dairy_name}
      logoUrl={settings.logo_url}
      title="Forgot your password?"
      subtitle="Enter your email — we will send a password reset link there."
    >
      <ForgotForm initialError={ERRORS[error] ?? null} />
    </AuthCard>
  );
}
