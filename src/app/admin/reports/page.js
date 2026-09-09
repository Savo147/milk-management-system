import PageHeader from "@/components/PageHeader";
import ComingSoon from "@/components/ComingSoon";

export const metadata = { title: "Reports — Krishna Dairy" };

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Reports" subtitle="Dudh ane rakam na report" />
      <ComingSoon
        items={[
          "Daily milk report",
          "Monthly milk report",
          "Customer-wise report",
          "Daily amount report",
          "Monthly amount report",
          "Delivery report",
          "Hisab report",
          "Date/month/customer/status filter",
          "PDF export",
          "Excel export",
        ]}
      />
    </>
  );
}
