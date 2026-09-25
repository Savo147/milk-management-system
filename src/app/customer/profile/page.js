import { requireCustomerAccount, getBusinessSettings } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import ProfileView from "./ProfileView";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { user, customer } = await requireCustomerAccount();
  const settings = await getBusinessSettings();

  return (
    <>
      <PageHeader
        title="Profile"
        subtitle="Your details, your milk plan and your password"
      />
      <ProfileView user={user} customer={customer} settings={settings} />
    </>
  );
}
