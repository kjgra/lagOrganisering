import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { Brand } from "@/components/Brand";
import { readSession } from "@/lib/auth/session";
import { env, envLabel } from "@/lib/env";
import { DEMO_ACCOUNTS } from "@/lib/spond/mock";

const NOTICES: Record<string, string> = {
  expired: "Økten i Spond er utløpt. Logg inn på nytt.",
  no_app: "Du har ikke lenger tilgang til appen. Spør en administrator.",
  no_role: "Du har ingen rolle i Spond som gir tilgang til appen.",
  logout: "Du er logget ut.",
};

export default async function LoginPage(props: PageProps<"/logg-inn">) {
  const sp = await props.searchParams;
  if (await readSession()) redirect("/");
  const reason = typeof sp.grunn === "string" ? sp.grunn : "";
  return (
    <div className="nm-login">
      <div className="nm-login__top nm-chrome">
        <Brand size="lg" env={envLabel()} />
      </div>
      <div className="nm-login__body">
        <LoginForm
          notice={NOTICES[reason]}
          demoAccounts={env().SPOND_MOCK ? DEMO_ACCOUNTS.map((a) => ({ email: a.email, note: a.note })) : undefined}
        />
      </div>
    </div>
  );
}
