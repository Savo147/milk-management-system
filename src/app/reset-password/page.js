import { redirect } from "next/navigation";
import { getCurrentUser, getPublicBranding } from "@/lib/auth";
import AuthCard from "@/components/AuthCard";
import ResetForm from "./ResetForm";

export const metadata = { title: "New password — Krishna Dairy" };

export default async function ResetPasswordPage() {
  // Reaching this page means /auth/reset has already turned the emailed link
  // into a session. Without one there is nothing to change, so send them back
  // to ask for a fresh link rather than showing a form that cannot work.
  const user = await getCurrentUser();
  if (!user) redirect("/forgot-password?error=link");

  const settings = await getPublicBranding();

  return (
    <AuthCard
      dairyName={settings.dairy_name}
      logoUrl={settings.logo_url}
      title="Set a new password"
      subtitle="You will be taken straight in once it is saved."
    >
      <ResetForm email={user.email} />
    </AuthCard>
  );
}
