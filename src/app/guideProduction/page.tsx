import type { Metadata } from "next";
import NextImage, { type ImageProps } from "next/image";
import { TopNav } from "@/components/top-nav";

function Image(props: ImageProps) {
  return (
    <a className="guide-tester-original" href={String(props.src)} target="_blank" rel="noopener noreferrer" title="Ouvrir l’image en taille originale">
      <NextImage {...props} unoptimized />
    </a>
  );
}

export const metadata: Metadata = {
  title: "Guide Google Play — applications publiées",
  description: "Guide illustré Visd AR pour installer gratuitement une application Android Google Play avec un code promotionnel personnel.",
  robots: { index: false, follow: false },
};

const apps = [
  ["Carte des dialectes en Chine 中国方言地图", "com.visdar.dialectes", "https://play.google.com/store/apps/details?id=com.visdar.dialectes"],
  ["Clés des sinogrammes 汉字部首", "com.visdar.cles", "https://play.google.com/store/apps/details?id=com.visdar.cles"],
  ["Reconnaissance des sinogrammes manuscrits 汉字手写识别", "com.visdar.manuscrits", "https://play.google.com/store/apps/details?id=com.visdar.manuscrits"],
  ["Roue chromatique 色盘", "com.visdar.couleurs", "https://play.google.com/store/apps/details?id=com.visdar.couleurs"],
  ["Heures du monde 全球时间", "com.visdar.heures", "https://play.google.com/store/apps/details?id=com.visdar.heures"],
  ["Grands nombres en chinois", "com.visdar.chiffres", "https://play.google.com/store/apps/details?id=com.visdar.chiffres"],
] as const;

const screenshots = [
  ["/guides/production-install/01-choisir-appareil.png", "Choisir le téléphone Android", "1. Cliquez sur le prix et choisissez l’appareil.", "Connectez-vous à votre compte Google, ouvrez la fiche de l’application, cliquez sur le bouton affichant son prix, puis sélectionnez le téléphone qui doit la recevoir."],
  ["/guides/production-install/02-choisir-utiliser-code.png", "Choix du mode de paiement Google Play", "2. Choisissez « Redeem code ».", "Lorsque Google Play propose les moyens de paiement, sélectionnez « Redeem code ». N’ajoutez pas de carte bancaire personnelle."],
  ["/guides/production-install/03-saisir-code.png", "Saisie d’un code promotionnel Google Play", "3. Saisissez votre code personnel.", "Copiez le code reçu par e-mail, collez-le ici, puis cliquez sur « Redeem ». Le code affiché dans cette illustration a été masqué."],
  ["/guides/production-install/04-confirmer-gratuite.png", "Application gratuite grâce au code promotionnel", "4. Vérifiez que le prix est à 0 €.", "Le prix d’origine est barré et Google Play affiche 0 €. Cliquez sur « Install » : aucun paiement bancaire n’est demandé."],
  ["/guides/production-install/05-installer.png", "Confirmation de l’installation Google Play", "5. Lancez l’installation.", "Après validation du code, choisissez à nouveau l’appareil si besoin puis cliquez sur « Install »."],
  ["/guides/production-install/06-verification-google.png", "Vérification de connexion Google", "6. Vérification Google, si demandée.", "Google peut demander une confirmation par QR code ou une autre méthode de sécurité. Validez-la avec votre appareil habituel. Le QR code et les informations de compte sont masqués."],
  ["/guides/production-install/07-installation-confirmee.png", "Message de confirmation Google Play", "7. Installation confirmée.", "Google Play confirme que l’application sera bientôt installée sur le téléphone choisi. Ouvrez-la ensuite depuis votre appareil Android."],
] as const;

export default function GuideProductionPage() {
  return (
    <main className="page-shell guide-tester-page">
      <TopNav className="topbar-luxury" showAdmin showLogout />
      <article className="panel glass guide-tester-content guide-production-content">
        <div className="guide-tester-hero">
          <span className="badge">Applications Google Play publiées</span>
          <h1>Installation gratuite avec un code</h1>
          <p className="guide-tester-subtitle">Applications Android Visd AR disponibles sur Google Play</p>
          <p className="guide-tester-guide-label">Guide d’installation · production</p>
          <p className="lead">Bienvenue. Ces applications sont déjà publiées sur Google Play. Leur prix officiel peut apparaître sur la fiche, mais votre code promotionnel personnel permet de les obtenir gratuitement.</p>
        </div>

        <section className="guide-tester-notice" aria-labelledby="production-before-title">
          <h2 id="production-before-title">Avant de commencer</h2>
          <p>Consultez l’e-mail envoyé par Visd AR : il contient un <strong>code promotionnel personnel</strong> pour l’application demandée. Chaque code est <strong>limité à une seule utilisation</strong>.</p>
          <p>Connectez-vous au Play Store avec votre compte Google, puis utilisez le code au moment du paiement. Le parcours est gratuit : <strong>n’ajoutez pas de carte bancaire personnelle</strong>.</p>
          <p>Besoin d’un autre code ou d’une autre application ? Écrivez de nouveau à <a href="mailto:visdar@outlook.fr">visdar@outlook.fr</a> en indiquant l’application souhaitée.</p>
        </section>

        <section className="guide-tester-steps" aria-labelledby="production-steps-title">
          <h2 id="production-steps-title">Le parcours complet</h2>
          <div className="guide-tester-step-grid guide-production-step-grid">
            <div><span>1</span><h3>Ouvrez la fiche</h3><p>Connectez votre compte Google, ouvrez le lien de l’application choisie ci-dessous et cliquez sur le bouton affichant son prix.</p></div>
            <div><span>2</span><h3>Utilisez votre code</h3><p>Au moment du paiement, choisissez « Redeem code », collez le code reçu puis validez.</p></div>
            <div><span>3</span><h3>Installez gratuitement</h3><p>Vérifiez que le prix affiché est 0 €, cliquez sur « Install » et acceptez une éventuelle vérification Google.</p></div>
          </div>
        </section>

        <section className="guide-tester-illustrations guide-production-illustrations" aria-labelledby="production-illustrations-title">
          <h2 id="production-illustrations-title">Les écrans à reconnaître</h2>
          <p>Cliquez sur une capture pour l’ouvrir en taille originale. Les informations personnelles, les codes et le QR code ont été masqués.</p>
          <div className="guide-tester-illustration-grid">
            {screenshots.map(([src, alt, title, description]) => (
              <figure key={src}>
                <Image src={src} alt={alt} width={1310} height={910} />
                <figcaption><strong>{title}</strong> {description}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="guide-tester-directory" aria-labelledby="production-directory-title">
          <h2 id="production-directory-title">Liens directs des applications publiées</h2>
          <p>Choisissez l’application pour laquelle vous avez reçu un code, puis ouvrez sa fiche Google Play.</p>
          <div className="guide-tester-app-list">
            {apps.map(([title, packageName, url]) => (
              <article key={packageName}>
                <h3><a href={url} target="_blank" rel="noopener noreferrer">{title}</a></h3>
                <p className="guide-tester-url">{url}</p>
                <a className="guide-tester-copy-link" href={url} target="_blank" rel="noopener noreferrer">Ouvrir Google Play Store</a>
              </article>
            ))}
          </div>
        </section>

        <footer className="guide-tester-footer">
          <p>Un code ne fonctionne plus, a déjà été utilisé ou vous avez besoin d’un autre code ? <a href="mailto:visdar@outlook.fr">Contactez Visd AR</a>.</p>
          <p>Ce guide concerne les applications déjà publiées. Pour les applications encore en test fermé, consultez le <a href="/guideTester">guide des testeurs invités</a>.</p>
        </footer>
      </article>
    </main>
  );
}
