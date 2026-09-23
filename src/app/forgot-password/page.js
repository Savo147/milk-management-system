import { redirect } from "next/navigation";
import { getCurrentUser, getPublicBranding } from "@/lib/auth";
import AuthCard from "@/components/AuthCard";
import ForgotForm from "./ForgotForm";

const ERRORS = {
  link: "Aa link ni mudat puri thai gai chhe ke e vaparai chuki chhe. Navi link mangavo.",
};

export const metadata = { title: "Password bhulai gayo — Krishna Dairy" };

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
      title="Password bhulai gayo?"
      subtitle="Tamaru email nakho — password badalvani link tya mokalishu."
    >
      <ForgotForm initialError={ERRORS[error] ?? null} />
    </AuthCard>
  );
}
