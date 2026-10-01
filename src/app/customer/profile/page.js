import { requireCustomerAccount, getBusinessSettings } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import ProfileView from "./ProfileView";
import { getThemeMode } from "@/lib/theme-mode";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { user, customer } = await requireCustomerAccount();
  const settings = await getBusinessSettings();
  const themeMode = await getThemeMode();

  return (
    <>
      <PageHeader
        title="Profile"
        subtitle="Your details, your milk plan and your password"
      />
      <ProfileView
        user={user}
        customer={customer}
        settings={settings}
        themeMode={themeMode}
      />
    </>
  );
}
