interface SessionPageProps {
  params: Promise<{ id: string }>;
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { id } = await params;
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-black mb-2">
        Session
      </h1>
      <p className="font-code text-sm text-neutral-500 mb-6">{id}</p>
      <p className="text-sm text-neutral-500">
        Use the sidebar to navigate trains, stations, or the working chart.
      </p>
    </div>
  );
}
