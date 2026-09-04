import type { Metadata } from "next";
import Image from "next/image";
import { TopNav } from "@/components/top-nav";

export const metadata: Metadata = {
  title: "Guide Tester spécial invité",
  description: "Guide illustré Visd AR pour installer gratuitement les applications Android en phase de test.",
  robots: { index: false, follow: false },
};

const apps = [
  ["Calendrier lunisolaire et signes astrologiques chinois", "com.visdar.calendrier", "https://play.google.com/store/apps/details?id=com.visdar.calendrier"],
  ["Reconnaissance des sinogrammes manuscrits", "com.visdar.manuscrits", "https://play.google.com/store/apps/details?id=com.visdar.manuscrits"],
  ["Pays en chinois : capitale, heure, monnaie, indicatif téléphonique", "com.visdar.heures", "https://play.google.com/store/apps/details?id=com.visdar.heures"],
  ["Dictionnaire contextuel français-chinois", "Lien Google Play à venir", null],
  ["Grands nombres en chinois", "com.visdar.chiffres", "https://play.google.com/store/apps/details?id=com.visdar.chiffres"],
  ["Roue des couleurs en chinois", "com.visdar.couleurs", "https://play.google.com/store/apps/details?id=com.visdar.couleurs"],
  ["Clés des sinogrammes (avec exemples)", "com.visdar.cles", "https://play.google.com/store/apps/details?id=com.visdar.cles"],
  ["Dialectes et langues régionales en Chine", "com.visdar.dialectes", "https://play.google.com/store/apps/details?id=com.visdar.dialectes"],
  ["Classificateurs chinois", "com.visdar.classificateur", "https://play.google.com/store/apps/details?id=com.visdar.classificateur"],
  ["Exprimer le temps en chinois", "com.visdar.temps", "https://play.google.com/store/apps/details?id=com.visdar.temps"],
  ["Locutions idiomatiques Chengyu", "com.visdar.expressions", "https://play.google.com/store/apps/details?id=com.visdar.expressions"],
  ["Liens de parenté", "com.visdar.famille", "https://play.google.com/store/apps/details?id=com.visdar.famille"],
] as const;

export default function GuideTesterPage() {
  return (
    <main className="page-shell guide-tester-page">
      <TopNav className="topbar-luxury" showAdmin showLogout />
      <article className="panel glass guide-tester-content">
        <div className="guide-tester-hero">
          <span className="badge">Tester spécial invité</span>
          <h1>Guide d’installation Android</h1>
          <p className="lead">Installez gratuitement une application Visd AR en phase de test. La commande Google Play est une commande de test : aucun montant ne sera débité.</p>
          <a className="pill-button" href="/guides/guide-tester-special-invite.pdf" target="_blank" rel="noopener noreferrer">Télécharger le PDF illustré</a>
        </div>

        <section className="guide-tester-notice" aria-labelledby="confidentialite-title">
          <h2 id="confidentialite-title">Avant de commencer</h2>
          <p>Pour recevoir l’accès à une application en phase de test, indiquez à Visd AR l’adresse e-mail du compte Google utilisé dans votre Play Store. Sans cette adresse, le téléchargement de l’application de test ne peut pas être activé.</p>
          <p>Écrivez à <a href="mailto:visdar@outlook.fr">visdar@outlook.fr</a> en précisant les applications souhaitées. Cette adresse est traitée de façon <strong>confidentielle</strong> et sert uniquement à gérer votre accès de test.</p>
          <p>Vous pouvez demander à tout moment le retrait de votre adresse du groupe de test en écrivant à la même adresse : indiquez simplement que vous ne souhaitez plus participer.</p>
        </section>

        <section className="guide-tester-steps" aria-labelledby="steps-title">
          <h2 id="steps-title">Le parcours en trois étapes</h2>
          <div className="guide-tester-step-grid">
            <div><span>1</span><h3>Signalez votre compte</h3><p>Envoyez votre adresse Google Play à Visd AR et dites quelles applications vous souhaitez tester.</p></div>
            <div><span>2</span><h3>Choisissez l’appareil</h3><p>Depuis un téléphone ou un ordinateur, sélectionnez le mobile cible puis appuyez sur « Install ».</p></div>
            <div><span>3</span><h3>Utilisez la carte de test</h3><p>Après l’écran de confirmation, dans « Payment methods », choisissez « Test card, always approves ». N’ajoutez pas de carte bancaire réelle.</p></div>
          </div>
        </section>

        <section className="guide-tester-illustrations" aria-labelledby="illustrations-title">
          <h2 id="illustrations-title">Les écrans à reconnaître</h2>
          <div className="guide-tester-illustration-grid">
            <figure>
              <Image src="/guides/tester-install-device.png" alt="Sélection d’un appareil Android à installer" width={1647} height={714} />
              <figcaption><strong>1. Appareil cible.</strong> Sélectionnez le téléphone souhaité, puis appuyez sur « Install ».</figcaption>
            </figure>
            <figure>
              <Image src="/guides/tester-checkout.png" alt="Fenêtre Google Play indiquant qu’il s’agit d’une commande de test sans débit" width={799} height={616} />
              <figcaption><strong>2. Commande de test.</strong> Vérifiez le message « This is a test order, you will not be charged » avant de continuer.</figcaption>
            </figure>
            <figure>
              <Image src="/guides/tester-payment-methods.png" alt="Modes de paiement Google Play avec carte de test approuvée" width={736} height={383} />
              <figcaption><strong>3. Moyen de paiement.</strong> Choisissez « Test card, always approves ». L’image est anonymisée.</figcaption>
            </figure>
          </div>
          <p className="guide-tester-warning"><strong>Si un prix reste dû, arrêtez-vous.</strong> Ne confirmez aucun achat et contactez <a href="mailto:visdar@outlook.fr">visdar@outlook.fr</a>.</p>
        </section>

        <section className="guide-tester-directory" aria-labelledby="directory-title">
          <h2 id="directory-title">Liens directs des applications à tester</h2>
          <p>Les adresses complètes sont affichées pour permettre leur vérification. Cliquez sur le titre ou copiez l’URL dans votre navigateur.</p>
          <div className="guide-tester-app-list">
            {apps.map(([title, packageName, url]) => (
              <article key={packageName}>
                <h3>{url ? <a href={url} target="_blank" rel="noopener noreferrer">{title}</a> : title}</h3>
                <p className={url ? "guide-tester-url" : "guide-tester-pending"}>{url || packageName}</p>
                {url ? <a className="guide-tester-copy-link" href={url} target="_blank" rel="noopener noreferrer">Ouvrir Google Play</a> : null}
              </article>
            ))}
          </div>
        </section>

        <footer className="guide-tester-footer">
          <p>Une question, une demande d’accès ou une demande de retrait ? <a href="mailto:visdar@outlook.fr">visdar@outlook.fr</a></p>
          <p>Les informations de compte Google Play restent confidentielles et ne sont utilisées que pour la gestion du test. Ce guide n’est pas une page publique du Catalogue.</p>
        </footer>
      </article>
    </main>
  );
}
