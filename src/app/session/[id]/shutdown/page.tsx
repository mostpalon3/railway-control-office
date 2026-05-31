import { Suspense } from "react";
import { EntriesSection } from "../_components/entries-section";
import { EntriesSectionLoading } from "../_components/entries-section-loading";

interface ShutdownPageProps {
  params: Promise<{ id: string }>;
}

export default async function ShutdownPage({ params }: ShutdownPageProps) {
  const { id } = await params;
  return (
    <Suspense fallback={<EntriesSectionLoading />}>
      <EntriesSection sessionId={id} groupBy="shutdown" />
    </Suspense>
  );
}
