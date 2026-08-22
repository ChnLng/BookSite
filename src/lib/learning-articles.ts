export type LearningArticle = {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  readingMinutes: number;
  sections: Array<{ heading: string; paragraphs: string[]; points?: string[] }>;
};

export const learningArticles: LearningArticle[] = [
  {
    slug: "apprendre-le-pinyin-debutant",
    title: "Apprendre le pinyin quand on débute : une méthode douce et efficace",
    description: "Une méthode simple pour apprendre le pinyin chinois, les tons et la prononciation sans se décourager.",
    keywords: ["apprendre le pinyin", "pinyin débutant", "prononciation chinois", "tons chinois"],
    readingMinutes: 5,
    sections: [
      { heading: "Le pinyin n'est pas une version française du chinois", paragraphs: ["Le pinyin est une transcription phonétique : il aide à entendre et à prononcer le mandarin, mais il ne remplace pas les sinogrammes. Le lire comme du français est donc le piège le plus courant.", "Au début, visez une prononciation compréhensible plutôt qu'une perfection immédiate. Écoutez une syllabe, répétez-la doucement, puis replacez-la dans un mot et dans une petite phrase."] },
      { heading: "Apprivoiser les quatre tons", paragraphs: ["Les tons changent le sens d'une syllabe. Ils deviennent beaucoup moins impressionnants quand on les travaille avec des gestes, une écoute attentive et de courtes répétitions.", "Choisissez trois ou quatre mots seulement par séance. L'objectif est de reconnaître leur mélodie avant de les réciter rapidement."], points: ["Associez chaque ton à un mouvement de main.", "Écoutez puis imitez avant de lire.", "Révisez les mêmes mots dans une histoire courte."] },
      { heading: "Passer vite du son à la lecture", paragraphs: ["Le pinyin est un appui, pas une béquille permanente. Dans un livre bilingue, regardez d'abord le sinogramme, utilisez ensuite le pinyin si nécessaire et terminez par la phrase entière.", "Cette alternance crée progressivement un lien entre la forme du caractère, son son et son sens français. C'est une manière calme et réaliste de commencer à lire chinois."] },
    ],
  },
  {
    slug: "erreurs-debutant-chinois",
    title: "7 erreurs fréquentes quand on commence le chinois — et comment les éviter",
    description: "Les erreurs les plus fréquentes chez les débutants en chinois et des solutions simples pour apprendre avec confiance.",
    keywords: ["débuter le chinois", "erreurs chinois débutant", "apprendre le mandarin", "conseils chinois"],
    readingMinutes: 6,
    sections: [
      { heading: "Vouloir tout mémoriser trop vite", paragraphs: ["Une longue liste de vocabulaire donne l'impression d'avancer, puis disparaît vite de la mémoire. Le mandarin se retient mieux en rencontrant souvent les mêmes mots dans des situations faciles à comprendre.", "Préférez cinq mots utiles, une image et une phrase complète. Une petite routine répétée vaut mieux qu'une séance épuisante."], points: ["Ne pas ignorer les tons.", "Ne pas attendre de connaître tous les caractères pour lire.", "Ne pas traduire chaque mot isolément."] },
      { heading: "Se comparer à des locuteurs déjà avancés", paragraphs: ["La lecture chinoise est un apprentissage progressif. Vous pouvez lire une histoire adaptée très tôt, même si vous ne savez pas encore écrire chaque caractère.", "Choisissez des textes avec pinyin et traduction française : ils offrent assez de sécurité pour rester curieux, sans transformer chaque page en examen."] },
      { heading: "Construire une habitude agréable", paragraphs: ["Gardez un rendez-vous court : dix minutes après le dîner, une page le matin ou une histoire par semaine. Le cerveau apprécie la régularité et le plaisir de reconnaître ce qu'il a déjà vu.", "Notez vos petites victoires : un mot reconnu sans aide, une phrase comprise, un ton mieux entendu. Elles sont le vrai moteur de la progression."] },
    ],
  },
  {
    slug: "choisir-premier-livre-chinois-bilingue",
    title: "Comment choisir son premier livre chinois bilingue ?",
    description: "Les critères simples pour choisir un premier livre chinois bilingue avec sinogrammes, pinyin et traduction française.",
    keywords: ["livre chinois débutant", "livre chinois bilingue", "histoire chinois français", "ebook chinois"],
    readingMinutes: 5,
    sections: [
      { heading: "Chercher une histoire, pas une fiche d'exercices", paragraphs: ["Pour débuter, une histoire courte donne un contexte aux mots. L'image, l'action et la répétition aident naturellement à deviner le sens avant même de regarder la traduction.", "Un bon premier livre n'est pas celui qui contient le plus de vocabulaire : c'est celui que vous aurez envie de rouvrir demain."] },
      { heading: "Trois repères très rassurants", paragraphs: ["Les sinogrammes vous familiarisent avec la langue écrite. Le pinyin soutient la prononciation. La traduction française évite de rester bloqué. Ensemble, ces trois éléments permettent de continuer à lire sans anxiété."], points: ["Une mise en page aérée et des illustrations utiles.", "Des phrases courtes, mais naturelles.", "Une traduction claire, proche du sens de la phrase."] },
      { heading: "Lire selon son propre rythme", paragraphs: ["Une première lecture peut être très libre : regarder les illustrations, écouter les sons dans sa tête, repérer un mot qui revient. La deuxième lecture sera déjà plus fluide.", "Les ebooks Visd AR sont pensés pour ce retour doux à la page : vous pouvez avancer, revenir en arrière et consulter la traduction quand vous en avez besoin."] },
    ],
  },
  {
    slug: "lire-sinogrammes-15-minutes",
    title: "Lire des sinogrammes en 15 minutes par jour : une routine réaliste",
    description: "Une routine quotidienne de 15 minutes pour lire des sinogrammes, développer la reconnaissance visuelle et progresser en chinois.",
    keywords: ["lire les sinogrammes", "routine chinois", "apprendre caractères chinois", "chinois 15 minutes"],
    readingMinutes: 5,
    sections: [
      { heading: "Cinq minutes pour observer", paragraphs: ["Choisissez une page très courte. Regardez d'abord la scène et les caractères sans chercher à tout traduire. Repérez les formes qui se répètent : votre œil commence déjà son travail.", "L'observation est utile parce qu'elle prépare la mémoire visuelle avant l'effort de rappel."] },
      { heading: "Cinq minutes pour relier son et sens", paragraphs: ["Lisez ensuite la phrase avec le pinyin, puis la traduction française. Essayez de relier un ou deux sinogrammes à leur son et à leur rôle dans la phrase.", "Ne copiez pas une page entière. La qualité de l'attention compte davantage que le nombre de caractères vus."], points: ["Un mot déjà connu.", "Un mot qui se répète.", "Une phrase que vous aimez prononcer."] },
      { heading: "Cinq minutes pour retrouver", paragraphs: ["Fermez les aides quelques secondes et cherchez ce que vous reconnaissez. Rouvrez-les sans vous juger. Cette petite tentative de rappel renforce la mémoire beaucoup plus qu'une relecture passive.", "Après quelques jours, relisez la même histoire. Constater que les caractères deviennent moins étrangers est extrêmement motivant."] },
    ],
  },
  {
    slug: "apprendre-chinois-enfant-jeux",
    title: "Apprendre le chinois avec un enfant : jeux, histoires et petites habitudes",
    description: "Des idées simples et bienveillantes pour apprendre le chinois avec un enfant grâce aux jeux, aux histoires illustrées et à la répétition.",
    keywords: ["apprendre chinois enfant", "jeu chinois enfant", "histoire chinoise enfant", "activité chinois famille"],
    readingMinutes: 6,
    sections: [
      { heading: "Commencer par le plaisir", paragraphs: ["Avec un enfant, le but n'est pas de faire une leçon longue. Une image amusante, un personnage attachant et un mot répété créent une expérience positive de la langue.", "On peut montrer, mimer, chercher un détail dans l'illustration et dire un seul mot chinois ensemble. Ces moments très courts ont beaucoup de valeur."] },
      { heading: "Faire revenir les mots naturellement", paragraphs: ["Choisissez un petit rituel : le mot du goûter, le personnage de la semaine ou une page avant de dormir. Les répétitions dans un contexte chaleureux sont plus efficaces que les quiz successifs.", "Les jeux imprimables et les cartes visuelles permettent aussi de revoir un mot sans donner l'impression de travailler."], points: ["Laisser l'enfant choisir la page.", "Accepter qu'il écoute sans répéter.", "Célébrer une reconnaissance, même minuscule."] },
      { heading: "Des histoires qui ouvrent la conversation", paragraphs: ["Une histoire bilingue peut parler d'émotions, de patience ou de courage. La traduction française vous aide à discuter du récit, tandis que le chinois reste présent dans la musique des phrases.", "Le plus beau signe de réussite est qu'un enfant demande de recommencer l'histoire. La curiosité précède toujours la mémorisation."] },
    ],
  },
  {
    slug: "plan-lecture-chinois-4-semaines",
    title: "Un plan de lecture chinois sur 4 semaines pour débuter sans pression",
    description: "Un programme de quatre semaines, léger et progressif, pour démarrer la lecture chinoise avec pinyin et traduction française.",
    keywords: ["plan apprendre chinois", "lecture chinois débutant", "programme chinois 4 semaines", "pinyin traduction française"],
    readingMinutes: 6,
    sections: [
      { heading: "Semaine 1 : rendre la page familière", paragraphs: ["Lisez cinq à dix minutes, trois fois dans la semaine. Regardez surtout les illustrations, les titres et les mots qui reviennent. Utilisez la traduction sans culpabilité.", "Le but est de découvrir que le chinois peut se lire comme une histoire et non seulement comme une suite de règles."] },
      { heading: "Semaines 2 et 3 : reconnaître et répéter", paragraphs: ["Choisissez deux mots récurrents par page. Dites-les avec le pinyin, retrouvez-les dans les sinogrammes, puis relisez la phrase entière. Gardez la même histoire plusieurs jours.", "Cette répétition tranquille fait passer les mots de la simple rencontre à la reconnaissance."], points: ["Semaine 2 : deux mots par page.", "Semaine 3 : une phrase lue sans regarder la traduction.", "Semaine 4 : relire l'histoire du début à la fin."] },
      { heading: "Semaine 4 : mesurer le chemin parcouru", paragraphs: ["Revenez à la première page. Vous ne comprendrez peut-être pas tout, et c'est normal. Mais vous verrez les caractères autrement : certains auront un visage, un son ou une place dans une phrase.", "Choisissez ensuite une nouvelle histoire de difficulté proche. Une progression durable est faite de retours, de plaisir et de petits défis accessibles."] },
    ],
  },
];

export function getLearningArticle(slug: string) {
  return learningArticles.find((article) => article.slug === slug) || null;
}
