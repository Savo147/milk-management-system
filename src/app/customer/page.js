import PageHeader from "@/components/PageHeader";
import ComingSoon from "@/components/ComingSoon";

export default function CustomerDashboard() {
  return (
    <>
      <PageHeader title="Dashboard" />
      <ComingSoon
        items={[
          "Aaj nu dudh ane rakam",
          "Aa mahina nu total",
          "Potano milk rate",
          "Hisab status",
          "Payment request status",
          "Chhelli notification",
        ]}
      />
    </>
  );
}
