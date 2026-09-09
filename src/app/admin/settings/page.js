import PageHeader from "@/components/PageHeader";
import ComingSoon from "@/components/ComingSoon";

export const metadata = { title: "Settings — Krishna Dairy" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Dairy, rates, staff ane audit logs" />
      <ComingSoon
        items={[
          "Dairy name, logo, sarnamu, phone",
          "Low-stock threshold",
          "Customer-wise rate ane rate history",
          "Users / staff",
          "Admin profile ane password",
          "Audit logs",
        ]}
      />
    </>
  );
}
