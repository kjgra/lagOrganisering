import { notFound } from "next/navigation";
import { AppShell } from "@/components/shell/AppShell";
import { ExerciseImportForm } from "@/components/training/ExerciseImportForm";
import { ExerciseLicense } from "@/components/training/ExerciseLicense";
import { contextFromParams } from "@/lib/context";

/** «Importer øvelser»: add exercises from a JSON file to the bank (superadmin). */
export default async function ExerciseImportPage(props: PageProps<"/g/[groupId]/[sub]/trening/ovelser/import">) {
  const ctx = await contextFromParams(props.params);
  if (!ctx.user.rights.superadmin) notFound();
  const listHref = ctx.path("/trening/ovelser");
  return (
    <AppShell ctx={ctx} title="Importer øvelser" section="training" back={listHref}>
      <ExerciseImportForm groupId={ctx.group.id} listHref={listHref} />
      <ExerciseLicense />
    </AppShell>
  );
}
