import { EditDraftPage } from "@/components/board/EditDraftPage";

export default async function NewDraftPage(props: PageProps<"/g/[groupId]/[sub]/lagforslag/utkast/ny">) {
  return EditDraftPage({ params: props.params, id: null });
}
