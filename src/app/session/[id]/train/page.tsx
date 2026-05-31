import { Suspense } from "react";
import { EntriesSection } from "../_components/entries-section";
import { EntriesSectionLoading } from "../_components/entries-section-loading";

interface TrainPageProps {
  params: Promise<{ id: string }>;
}

export default async function TrainPage({ params }: TrainPageProps) {
  const { id } = await params;
  return (
    <Suspense fallback={<EntriesSectionLoading />}>
      <EntriesSection sessionId={id} groupBy="train_no" />
    </Suspense>
  );
}
