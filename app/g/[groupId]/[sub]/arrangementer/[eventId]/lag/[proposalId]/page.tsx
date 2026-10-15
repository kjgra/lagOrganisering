import { notFound } from "next/navigation";
import { EditBoardPage } from "@/components/board/EditBoardPage";

export default async function EditTeamsPage(props: PageProps<"/g/[groupId]/[sub]/arrangementer/[eventId]/lag/[proposalId]">) {
  const id = Number((await props.params).proposalId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return EditBoardPage({ params: props.params, proposalId: id });
}
