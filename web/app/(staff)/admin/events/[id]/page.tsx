import { redirect } from "next/navigation";

export default async function LegacyAdminEventEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/board/evenimente/${id}`);
}
