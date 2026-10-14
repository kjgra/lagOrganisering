import { notFound } from "next/navigation";
import { EditDraftPage } from "@/components/board/EditDraftPage";

export default async function DraftPage(props: PageProps<"/g/[groupId]/[sub]/lagforslag/utkast/[id]">) {
  const id = Number((await props.params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return EditDraftPage({ params: props.params, id });
}
