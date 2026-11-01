"use client";

import { MessageSquarePlus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";

/** The speech bubble in the app bar: «Gi tilbakemelding», coming back to this page afterwards. */
export function FeedbackButton({ groupId }: { groupId: string }) {
  const path = usePathname() || "/";
  return (
    <Link
      href={`/innstillinger/tilbakemelding?fra=${encodeURIComponent(path)}&lag=${encodeURIComponent(groupId)}`}
      className="nm-iconbtn nm-iconbtn--chrome"
      aria-label="Gi tilbakemelding"
      title="Gi tilbakemelding"
    >
      <Icon icon={MessageSquarePlus} />
    </Link>
  );
}
