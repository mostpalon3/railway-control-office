import { Suspense } from "react";
import { EntriesSection } from "../_components/entries-section";
import { EntriesSectionLoading } from "../_components/entries-section-loading";

interface ChartPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChartPage({ params }: ChartPageProps) {
  const { id } = await params;
  return (
    <Suspense fallback={<EntriesSectionLoading />}>
      <EntriesSection sessionId={id} groupBy="chart_no" />
    </Suspense>
  );
}
