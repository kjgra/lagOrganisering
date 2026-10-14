"use client";

import { Download, Play, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { confirmArchiveAction, runMaintenanceAction } from "@/app/actions/admin";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";

/** Run the clean-up now, download the archive, and confirm deletion of what was archived. */
export function MaintenancePanel({ keys, nPending }: { keys: string[]; nPending: number }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const act = (f: () => Promise<{ ok: true; message?: string } | { ok: false; error: string }>) =>
    start(async () => {
      setError(null);
      const r = await f();
      if (!r.ok) return setError(r.error);
      if (r.message) toast(r.message);
      setConfirm(false);
    });
  return (
    <div className="nm-stack" style={{ gap: 12 }} aria-busy={pending}>
      {error ? (
        <div className="nm-alert" role="alert">
          {error}
        </div>
      ) : null}
      <div>
        <button type="button" className="nm-btn nm-btn--secondary" disabled={pending} onClick={() => act(runMaintenanceAction)}>
          <Icon icon={Play} />
          Kjør vedlikehold nå
        </button>
      </div>
      {nPending ? (
        <div className="nm-stack" style={{ gap: 8 }}>
          <div className="nm-row" style={{ gap: 8 }}>
            <a href="/api/arkiv" className="nm-btn nm-btn--primary" onClick={() => setDownloaded(true)}>
              <Icon icon={Download} />
              Last ned arkiv (ZIP)
            </a>
            {confirm ? (
              <>
                <button type="button" className="nm-btn nm-btn--danger" disabled={pending} onClick={() => act(() => confirmArchiveAction(keys))}>
                  Ja, slett {nPending} treninger
                </button>
                <button type="button" className="nm-btn nm-btn--ghost" onClick={() => setConfirm(false)}>
                  Avbryt
                </button>
              </>
            ) : (
              <button type="button" className="nm-btn nm-btn--ghost" disabled={!downloaded || pending} onClick={() => setConfirm(true)}>
                <Icon icon={Trash2} />
                Arkivet er lagret – slett fra databasen
              </button>
            )}
          </div>
          <p className="nm-hint" style={{ margin: 0 }}>
            Last ned arkivet og lagre det trygt før du sletter. Kommentarer og evalueringer slettes sammen med oppleggene.
          </p>
        </div>
      ) : null}
    </div>
  );
}
