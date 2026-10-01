import { requireCustomerAccount, getBusinessSettings } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import ProfileView from "./ProfileView";

export const metadata = { title: "Profile" };

export default async function ProfilePage({ searchParams }) {
  const { user, customer } = await requireCustomerAccount();
  const settings = await getBusinessSettings();
  const params = await searchParams;
  const initialTab = String(params?.tab ?? "").toLowerCase();

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
        initialTab={initialTab}
      />
    </>
  );
}
