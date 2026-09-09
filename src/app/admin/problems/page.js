import PageHeader from "@/components/PageHeader";
import ComingSoon from "@/components/ComingSoon";

export const metadata = { title: "Problems — Krishna Dairy" };

export default function ProblemsPage() {
  return (
    <>
      <PageHeader
        title="Problems"
        subtitle="Customer e nondhaveli delivery ni fariyado"
      />
      <ComingSoon
        items={[
          "Issue type",
          "Expected vs received quantity",
          "Customer no message",
          "Status: Pending / In Progress / Resolved / Rejected",
          "Admin no reply",
          "Resolve karvu",
        ]}
      />
    </>
  );
}
