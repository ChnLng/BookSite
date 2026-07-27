"use client";

import type { ComponentProps } from "react";
import { useMemo, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const minimumPasswordLength = 8;

type PasswordSettingsCardProps = {
  userEmail?: string | null;
};

type FormSubmitEvent = Parameters<NonNullable<ComponentProps<"form">["onSubmit"]>>[0];

export function PasswordSettingsCard({ userEmail }: PasswordSettingsCardProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusKind, setStatusKind] = useState<"idle" | "success" | "error">("idle");
  const [saving, setSaving] = useState(false);

  const helperText = useMemo(() => {
    if (userEmail?.trim()) {
      return `Connecte avec ${userEmail}. Vous pouvez definir ici un mot de passe meme si vous etes entre avec un Magic Link.`;
    }

    return "Definissez ici un mot de passe pour pouvoir vous reconnecter plus facilement ensuite.";
  }, [userEmail]);

  const handleSubmit = async (event: FormSubmitEvent) => {
    event.preventDefault();
    setStatusMessage("");
    setStatusKind("idle");

    if (newPassword.trim().length < minimumPasswordLength) {
      setStatusKind("error");
      setStatusMessage(`Le mot de passe doit contenir au moins ${minimumPasswordLength} caracteres.`);
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatusKind("error");
      setStatusMessage("Les deux mots de passe ne correspondent pas.");
      return;
    }

    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setStatusKind("error");
      setStatusMessage("Connexion Supabase indisponible pour le moment.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setStatusKind("error");
        setStatusMessage(error.message);
        return;
      }

      setStatusKind("success");
      setStatusMessage("Mot de passe mis a jour avec succes !");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="account-card password-settings-card">
      <div className="password-settings-header">
        <div className="badge">
          <LockKeyhole size={16} />
          Modifier le mot de passe
        </div>
      </div>

      <div className="password-settings-copy">
        <strong>Modifier le mot de passe</strong>
        <p className="tiny">{helperText}</p>
      </div>

      <form className="input-group" onSubmit={handleSubmit}>
        <label className="tiny" htmlFor="new-password">
          Nouveau mot de passe
        </label>
        <input
          id="new-password"
          className="input"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="Au moins 8 caracteres"
        />

        <label className="tiny" htmlFor="confirm-password">
          Confirmer le mot de passe
        </label>
        <input
          id="confirm-password"
          className="input"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Retapez le mot de passe"
        />

        <p className="tiny password-settings-hint">
          Conseil: utilisez au moins 8 caracteres avec lettres, chiffres et symbole si possible.
        </p>

        <div className="actions-row" style={{ marginTop: 0 }}>
          <button className="cta-button" type="submit" disabled={saving}>
            {saving ? "Mise a jour..." : "Enregistrer le nouveau mot de passe"}
          </button>
        </div>

        {statusMessage ? (
          <p className={statusKind === "success" ? "tiny password-settings-message success" : "tiny password-settings-message error"}>
            {statusMessage}
          </p>
        ) : null}
      </form>
    </div>
  );
}
