import { Brand } from "@/components/Brand";
import { GroupPicker } from "@/components/groups/GroupPicker";
import { requireUser } from "@/lib/auth/current";
import { db } from "@/lib/db";
import { envLabel } from "@/lib/env";
import { pickerGroups } from "@/lib/groups";
import { getPreferences } from "@/lib/store/preferences";

export default async function PickGroupPage() {
  const user = await requireUser();
  const prefs = await getPreferences(await db(), user.session.profileId);
  return (
    <div className="nm-login">
      <div className="nm-login__top nm-chrome">
        <Brand env={envLabel()} />
        <span className="nm-desk-only" style={{ color: "var(--on-chrome-muted)", fontSize: "var(--fs-body)" }}>
          Innlogget som <strong style={{ color: "var(--on-chrome)" }}>{user.data.profile.firstName}</strong>
        </span>
      </div>
      <div className="nm-picker-body">
        <GroupPicker groups={pickerGroups(user.data.groups)} favorites={prefs.favorites} current={prefs.lastGroup} />
      </div>
    </div>
  );
}
