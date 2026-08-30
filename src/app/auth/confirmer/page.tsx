import { AuthEmailConfirmation } from "@/components/auth-email-confirmation";

export const metadata = { title: "Confirmer votre accès Visd AR", robots: { index: false, follow: false } };

export default function ConfirmationPage() {
  return <AuthEmailConfirmation />;
}
