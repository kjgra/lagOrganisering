import { EditBoardPage } from "@/components/board/EditBoardPage";

export default async function NewTeamsPage(props: PageProps<"/g/[groupId]/[sub]/arrangementer/[eventId]/lag">) {
  return EditBoardPage({ params: props.params, proposalId: null });
}
