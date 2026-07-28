import { ShieldCheck } from "lucide-react";

export function SecurePaymentNote({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`secure-payment-note${compact ? " secure-payment-note-compact" : ""}`}>
      <ShieldCheck aria-hidden="true" size={compact ? 15 : 17} strokeWidth={2.2} />
      <p>
        <strong>Paiement sécurisé par PayPal</strong>
        <span>Vos informations bancaires sont traitées par PayPal et ne sont jamais stockées sur ce site.</span>
      </p>
    </div>
  );
}
