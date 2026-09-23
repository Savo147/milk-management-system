import { redirect } from "next/navigation";
import { getCurrentUser, getPublicBranding } from "@/lib/auth";
import AuthCard from "@/components/AuthCard";
import LoginForm from "./LoginForm";

const ERRORS = {
  inactive: "Your account is disabled. Contact the admin.",
  google: "Could not sign in with Google. Please try again.",
  nosetup: "This account has not been set up. Contact the admin.",
};

export const metadata = { title: "Login — Krishna Dairy" };

export default async function LoginPage({ searchParams }) {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/customer");

  const { error } = await searchParams;
  const settings = await getPublicBranding();

  return (
    <AuthCard
      dairyName={settings.dairy_name}
      logoUrl={settings.logo_url}
      title="Milk Management System"
    >
      <LoginForm initialError={ERRORS[error] ?? null} />
    </AuthCard>
  );
}
