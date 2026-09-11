import VerdraResultView from "@/components/results/VerdraResultView";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DynamicResultPage({ params }: PageProps) {
  const { id } = await params;
  return <VerdraResultView scanId={id} />;
}
