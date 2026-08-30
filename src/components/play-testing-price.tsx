import Link from "next/link";
import { playTestingApplicationUrl, type PlayTestingApp } from "@/lib/play-testing";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export function PlayTestingPrice({ priceEur }: { priceEur: number }) {
  return <span className="play-testing-price"><del aria-label="Prix habituel">{euro.format(priceEur)}</del><strong>Gratuit</strong></span>;
}

export function PlayTestingNotice({ app, priceEur }: { app: PlayTestingApp; priceEur: number }) {
  return (
    <div className="play-testing-notice">
      <span className="badge">Test fermé · Android</span>
      <PlayTestingPrice priceEur={priceEur} />
      <p className="tiny">Accès gratuit sur demande pendant le test, dans la limite des codes disponibles. Aucun paiement sur ce site.</p>
      <Link className="cta-button" href={playTestingApplicationUrl(app)}>Demander à tester gratuitement</Link>
      <p className="tiny muted">Un compte Google, l’adhésion au groupe de test et l’inscription au test de cette application sont nécessaires.</p>
    </div>
  );
}
