import { PasswordResetPageClient } from "@/components/password-reset-page-client";

export const metadata = {
  title: "Réinitialiser le mot de passe",
  robots: { index: false, follow: false },
};

export default function PasswordResetPage() {
  return <PasswordResetPageClient />;
}
