import type { Metadata } from "next";
import NextImage, { type ImageProps } from "next/image";
import { TopNav } from "@/components/top-nav";

function Image(props: ImageProps) {
  return <a className="guide-tester-original" href={String(props.src)} target="_blank" rel="noopener noreferrer" title="Ouvrir l’image en taille originale"><NextImage {...props} unoptimized /></a>;
}

export const metadata: Metadata = {
  title: "Guide Tester spécial invité",
  description: "Guide illustré Visd AR pour installer gratuitement les applications Android en phase de test.",
  robots: { index: false, follow: false },
};

const apps = [
  ["Calendrier lunisolaire et signes astrologiques chinois", "com.visdar.calendrier", "https://play.google.com/store/apps/details?id=com.visdar.calendrier"],
  ["Reconnaissance des sinogrammes manuscrits", "com.visdar.manuscrits", "https://play.google.com/store/apps/details?id=com.visdar.manuscrits"],
  ["Pays en chinois : capitale, heure, monnaie, indicatif téléphonique", "com.visdar.heures", "https://play.google.com/store/apps/details?id=com.visdar.heures"],
  ["Dictionnaire contextuel français-chinois", "com.visdar.contextes", "https://play.google.com/store/apps/details?id=com.visdar.contextes"],
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
          <h1>Pack Rentrée 2026</h1>
          <p className="guide-tester-subtitle">Applications Android de la langue et de la culture chinoises</p>
          <p className="guide-tester-guide-label">Guide d’installation Android</p>
          <p className="lead">Bienvenue dans le programme Tester spécial invité. Pendant la phase de test, vous pouvez obtenir gratuitement toute application Android Visd AR proposée au test, même si sa fiche Google Play affiche un prix.</p>
          <p>Le prix affiché sert uniquement à ouvrir le parcours Google Play : avec la carte de test, aucun montant ne sera débité.</p>
          <p className="guide-tester-warning"><strong>Google Play Pass : choisissez « Non merci ».</strong> Cette offre d’abonnement payant de Google est facultative et distincte du test Visd AR. Si elle apparaît après la carte de test, cliquez sur le bouton en bas à gauche du panneau, puis revenez installer l’application.</p>
          <a className="pill-button" href="/guides/guide-tester-special-invite.pdf?v=play-pass" target="_blank" rel="noopener noreferrer">Télécharger le PDF illustré</a>
        </div>

        <section className="guide-tester-notice" aria-labelledby="confidentialite-title">
          <h2 id="confidentialite-title">Avant de commencer</h2>
          <p>Pour recevoir l’accès à une application en phase de test, indiquez à Visd AR l’adresse e-mail du compte Google utilisé dans votre Play Store. Sans cette adresse, le téléchargement de l’application de test ne peut pas être activé.</p>
          <p>Écrivez à <a href="mailto:visdar@outlook.fr">visdar@outlook.fr</a> en précisant les applications souhaitées. Cette adresse est traitée de façon <strong>confidentielle</strong> et sert uniquement à gérer votre accès de test.</p>
          <p>Vous pouvez demander à tout moment le retrait de votre adresse du groupe de test en écrivant à la même adresse : indiquez simplement que vous ne souhaitez plus participer.</p>
        </section>

        <section className="guide-tester-steps" aria-labelledby="steps-title">
          <h2 id="steps-title">Le parcours complet</h2>
          <div className="guide-tester-step-grid">
            <div><span>1</span><h3>Compte Gmail et prix</h3><p>Connectez votre compte Google personnel au Play Store, puis cliquez sur le prix de l’application : pour les testeurs invités, ce prix n’est pas facturé.</p></div>
            <div><span>2</span><h3>Appareil et conditions</h3><p>Choisissez le téléphone à installer, cliquez sur « Install », puis acceptez les conditions Google Play si elles apparaissent.</p></div>
            <div><span>3</span><h3>Carte de test et sécurité</h3><p>Choisissez « Test card, always approves », cliquez sur « Buy », puis terminez une éventuelle double authentification.</p></div>
          </div>
        </section>

        <section className="guide-tester-illustrations" aria-labelledby="illustrations-title">
          <h2 id="illustrations-title">Les écrans à reconnaître</h2>
          <p>Cliquez sur une capture pour l’ouvrir en taille originale et agrandir les détails.</p>
          <div className="guide-tester-illustration-grid">
            <figure><Image src="/guides/tester-device-choice.png" alt="Choix anonymisé du téléphone Android à installer" width={1650} height={791} /><figcaption><strong>1. Choisissez l’appareil.</strong> Les modèles et dates ont été masqués.</figcaption></figure>
            <figure><Image src="/guides/tester-device-alternative.png" alt="Second exemple anonymisé de choix d’appareil Android" width={963} height={713} /><figcaption><strong>2. S’il y en a plusieurs.</strong> Sélectionnez le téléphone voulu, puis cliquez sur « Install ».</figcaption></figure>
            <figure><Image src="/guides/tester-agree.png" alt="Fenêtre Google Play Review and agree" width={1128} height={542} /><figcaption><strong>3. Conditions.</strong> Cliquez sur « Agree » lorsque cet écran apparaît.</figcaption></figure>
            <figure><Image src="/guides/tester-test-card-buy.png" alt="Commande de test Google Play avec Test card, always approves et bouton Buy" width={913} height={635} /><figcaption><strong>4 et 5. Paiement.</strong> La seule carte acceptée ici est « Test card, always approves », puis cliquez sur « Buy ». <strong>Avec cette carte de test, aucun débit réel n’est effectué.</strong></figcaption><p className="guide-tester-warning"><strong>Ne sélectionnez jamais votre carte bancaire personnelle.</strong> Si votre carte personnelle apparaît à la place de la carte de test, ne confirmez pas le paiement : contactez Visd AR à <a href="mailto:visdar@outlook.fr">visdar@outlook.fr</a> en indiquant l’adresse e-mail de votre compte Google Play, afin que l’administrateur puisse vous ajouter au groupe de test et vérifier votre accès.</p></figure>
            <figure><Image src="/guides/tester-two-factor.png" alt="Exemple de double authentification Google" width={598} height={487} /><figcaption><strong>6. Vérification Google.</strong> Une double authentification peut être demandée avant le téléchargement.</figcaption></figure>
            <figure><Image src="/guides/tester-test-receipt.png" alt="E-mail de confirmation Google Play avec la ligne Test card entourée en rouge" width={1272} height={730} /><figcaption><strong>Commande de test gratuite réussie.</strong> Google Play peut envoyer cet e-mail après la validation. La ligne « Test card, always approves » est entourée en rouge : cela signifie qu’aucun paiement réel ni débit bancaire n’a été effectué. Les informations personnelles ont été masquées.</figcaption></figure>
            <figure className="guide-play-pass"><div className="guide-play-pass-image"><Image src="/guides/tester-play-pass.jpg" alt="Offre Google Play Pass : refuser avec le bouton Non merci en bas à gauche du panneau" width={1080} height={2400} /><span aria-hidden="true" /></div><p className="guide-play-pass-callout">↑ Cliquez ici pour refuser :<br />« Non merci » 不用了. Cela n’empêche pas le téléchargement.</p><figcaption><strong>Refusez l’offre, puis revenez télécharger l’application.</strong> Cliquez sur le bouton entouré en rouge, à gauche du panneau Google Play Pass. Revenez ensuite à la fiche Visd AR et cliquez sur « Installer » si nécessaire. Cet abonnement payant facultatif est distinct du test Visd AR. Ne cliquez pas sur « Rembourser » dans la fiche de l’application.</figcaption></figure>
          </div>
        </section>

        <section className="guide-tester-directory" aria-labelledby="directory-title">
          <h2 id="directory-title">Liens directs des applications à tester</h2>
          <p>Les adresses complètes sont affichées pour permettre leur vérification. Cliquez sur le titre ou copiez l’URL dans votre navigateur.</p>
          <div className="guide-tester-app-list">
            {apps.map(([title, packageName, url]) => (
              <article key={packageName}>
                <h3>{url ? <a href={url} target="_blank" rel="noopener noreferrer">{title}</a> : title}</h3>
                <p className="guide-tester-url">{url}</p>
                <a className="guide-tester-copy-link" href={url} target="_blank" rel="noopener noreferrer">Ouvrir Google Play</a>
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
