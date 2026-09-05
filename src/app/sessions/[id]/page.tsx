import { SessionStudio } from "@/components/session-studio";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SessionStudio id={id} />;
}
