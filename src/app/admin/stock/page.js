import PageHeader from "@/components/PageHeader";
import ComingSoon from "@/components/ComingSoon";

export const metadata = { title: "Stock — Krishna Dairy" };

export default function StockPage() {
  return (
    <>
      <PageHeader title="Stock" subtitle="Roj no dudh no stock hisab" />
      <ComingSoon
        items={[
          "Opening stock",
          "Added stock",
          "Total delivered",
          "Remaining stock (jate)",
          "Stock history",
          "Low-stock warning",
        ]}
      />
    </>
  );
}
