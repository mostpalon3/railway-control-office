import { Suspense } from "react";
import { EntriesSection } from "../_components/entries-section";
import { EntriesSectionLoading } from "../_components/entries-section-loading";

interface StationPageProps {
  params: Promise<{ id: string }>;
}

export default async function StationPage({ params }: StationPageProps) {
  const { id } = await params;
  return (
    <Suspense fallback={<EntriesSectionLoading />}>
      <EntriesSection sessionId={id} groupBy="station" />
    </Suspense>
  );
}
