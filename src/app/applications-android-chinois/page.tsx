import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { TopNav } from "@/components/top-nav";
import { androidApps } from "@/lib/android-catalogue";
import { getPublicPlayStoreApp } from "@/lib/play-testing";
import { loadPublicResourcesForSeo } from "@/lib/resources-public-server";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Applications Android pour apprendre le chinois en français",
  description: "Découvrez les applications Android Visd AR pour apprendre le chinois : pinyin, sinogrammes, vocabulaire, calendrier et culture. Conseils pour choisir et offrir.",
  alternates: { canonical: "/applications-android-chinois" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "/applications-android-chinois",
    title: "Apprendre le chinois sur Android | Visd AR",
    description: "Des applications de chinois avec pinyin et explications en français, à découvrir selon vos envies.",
  },
};

const groups = [
  {
    title: "Lire et écrire les sinogrammes",
    description: "Pour reconnaître les caractères chinois, comprendre leurs composants et s’entraîner à les tracer.",
    packages: ["com.visdar.cles", "com.visdar.manuscrits"],
  },
  {
    title: "Comprendre la langue et la culture",
    description: "Des repères concrets pour les nombres, les classificateurs, les dialectes et le calendrier chinois.",
    packages: ["com.visdar.chiffres", "com.visdar.classificateur", "com.visdar.dialectes", "com.visdar.calendrier"],
  },
  {
    title: "Apprendre autrement",
    description: "Des activités visuelles ou à deux pour enrichir le vocabulaire et pratiquer hors des cours.",
    packages: ["com.visdar.couleurs", "com.visdar.heures", "com.visdar.binome"],
  },
] as const;

export default async function ApplicationsAndroidPage() {
  const resources = await loadPublicResourcesForSeo();
  const apps = androidApps.filter((app) => getPublicPlayStoreApp(app.packageName));
  const byPackage = new Map(apps.map((app) => [app.packageName, app]));

  const appUrl = (packageName: string) => {
    const publicApp = getPublicPlayStoreApp(packageName);
    const slug = publicApp?.resourceRefs.find((ref) => ref.includes("-android"));
    return slug ? `/outils/${slug}` : null;
  };

  const appImage = (packageName: string) => {
    const publicApp = getPublicPlayStoreApp(packageName);
    const resource = resources.find((item) => publicApp?.resourceRefs.includes(item.slug) || publicApp?.resourceRefs.includes(item.id));
    return resource?.coverImageUrl || "/images/logo.png";
  };

  return (
    <main className="page-shell">
      <TopNav className="topbar-luxury" showAdmin showLogout />
      <div className={styles.layout}>
        <section id="applications" className={styles.catalogueIntro}>
          <span className={styles.eyebrow}>Collection Android · Visd AR</span>
          <h1>Applications Android pour apprendre le chinois</h1>
          <p>Vous débutez ? Le calendrier, les couleurs et les nombres donnent des repères visuels. Pour travailler l’écriture, découvrez les clés des sinogrammes et la reconnaissance manuscrite. Chaque fiche présente les fonctions de l’application avant de vous diriger vers Google Play.</p>
        </section>

        <nav className={styles.quickNav} aria-label="Choisir un parcours">
          <a href="#sinogrammes">Sinogrammes</a>
          <a href="#langue-culture">Langue & culture</a>
          <a href="#autrement">Activités ludiques</a>
          <a href="#offrir">Offrir une découverte</a>
        </nav>

        {groups.map((group, index) => (
          <section className={styles.group} id={["sinogrammes", "langue-culture", "autrement"][index]} key={group.title}>
            <div className={styles.groupHeading}>
              <div>
                <span className={styles.groupNumber}>0{index + 1}</span>
                <h2>{group.title}</h2>
              </div>
              <p>{group.description}</p>
            </div>
            <div className={styles.cards}>
              {group.packages.map((packageName) => {
                const app = byPackage.get(packageName);
                const playApp = getPublicPlayStoreApp(packageName);
                const href = appUrl(packageName);
                if (!app || !playApp || !href) return null;
                return (
                  <article className={styles.card} key={packageName}>
                    <Link href={href} className={styles.cardImage} aria-label={`Découvrir ${app.title}`}>
                      <Image src={appImage(packageName)} alt={`Aperçu de ${app.title}`} width={480} height={360} sizes="(max-width: 650px) 100vw, (max-width: 1100px) 50vw, 33vw" />
                    </Link>
                    <div className={styles.cardBody}>
                      <h3><Link href={href}>{app.title}</Link></h3>
                      <p>{packageName === "com.visdar.classificateur" ? "Choisir le classificateur adapté à chaque phrase." : app.subtitle}</p>
                      <div className={styles.cardFooter}>
                        <span>Prix indicatif : {playApp.priceEur.toFixed(2).replace(".", ",")} €</span>
                        <Link href={href}>Découvrir <span aria-hidden="true">↗</span></Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}

        <section id="offrir" className={styles.gift}>
          <div>
            <span className={styles.eyebrow}>Pour les parents et les proches</span>
            <h2>Une idée cadeau pour apprendre le chinois</h2>
            <p>Vous souhaitez encourager un élève ou une personne curieuse du chinois ? Explorez ensemble les applications, puis laissez-la choisir celle qui correspond à son téléphone Android et à ses envies.</p>
            <p>En France, Google Play propose aussi des cartes cadeaux numériques. La personne qui reçoit la carte peut l’utiliser sur son propre compte Google Play, sous réserve des conditions et restrictions de pays de Google.</p>
            <a href="https://support.google.com/googleplay/answer/16585331?hl=fr" target="_blank" rel="noopener noreferrer">Comment fonctionnent les cartes cadeaux Google Play ↗</a>
          </div>
          <div className={styles.giftAside}>
            <strong>Comment choisir ?</strong>
            <ol>
              <li>Repérez un thème qui lui plairait.</li>
              <li>Vérifiez qu’elle utilise un appareil Android compatible.</li>
              <li>Consultez le prix final et la disponibilité sur Google Play.</li>
            </ol>
          </div>
        </section>

        <p className={styles.priceNote}>Les prix indiqués servent de repère et peuvent évoluer selon le pays ou le compte Google Play. Le prix confirmé au moment de l’achat est celui affiché par Google Play.</p>
      </div>
    </main>
  );
}
