export type Book = {
  id: string;
  asin: string;
  titleFr: string;
  titleZh: string;
  accent: string;
  animal: string;
  priceEur: number;
  publishDate: string;
  synopsisFr: string;
  synopsisZh?: string;
  teachingPointFr: string;
  amazonEbookUrl: string;
  amazonPaperbackUrl: string;
};

export const books: Book[] = [
  {
    id: "lumi",
    asin: "B0GVVWTB2N",
    titleFr: "Lumi trop gentil",
    titleZh: "Lumi 太善良",
    accent: "linear-gradient(135deg, #f8c28f 0%, #f5e6ca 45%, #fff8ef 100%)",
    animal: "petit renard",
    priceEur: 5.99,
    publishDate: "2 avril 2026",
    synopsisFr:
      "Lumi veut plaire a tout le monde, jusqu'au jour ou il comprend qu'il n'a plus d'energie pour lui-meme. Pas a pas, il apprend a dire non avec douceur et a suivre son propre chemin.",
    teachingPointFr:
      "Affirmation de soi, respect de ses limites et apprentissage d'un chinois facile HSK 1-2.",
    amazonEbookUrl:
      "https://www.amazon.fr/%E6%B1%89%E6%B3%95%E5%8F%8C%E8%AF%AD-Lumi-gentil-chinois-fran%C3%A7ais-ebook/dp/B0GVVWTB2N",
    amazonPaperbackUrl:
      "https://www.amazon.fr/Lumi-trop-gentil-Lhistoire-apprend/dp/B0GW2FFSQ5",
  },
  {
    id: "jiti",
    asin: "B0GWYHJWPZ",
    titleFr: "Jiti le faon credule",
    titleZh: "Jiti 轻信的小鹿",
    accent: "linear-gradient(135deg, #d6c6ff 0%, #f0e8ff 45%, #fff8ff 100%)",
    animal: "faon sensible",
    priceEur: 5.99,
    publishDate: "9 avril 2026",
    synopsisFr:
      "Jiti accepte trop facilement ce qu'on lui demande. En observant le monde autour de lui, il commence enfin a poser une question essentielle : pour le bien de qui fais-je cela ?",
    teachingPointFr:
      "Esprit critique, discernement emotionnel et lecture bilingue chinoise accessible.",
    amazonEbookUrl:
      "https://www.amazon.fr/%E6%B1%89%E6%B3%95%E5%8F%8C%E8%AF%AD-Jiti-cr%C3%A9dule-chinois-fran%C3%A7ais-ebook/dp/B0GWYHJWPZ",
    amazonPaperbackUrl:
      "https://www.amazon.fr/Jiti-faon-cr%C3%A9dule-Lhistoire-commence/dp/B0GWZTQLG3",
  },
  {
    id: "taogao",
    asin: "B0H1KBZ14K",
    titleFr: "Taogao au coeur lourd",
    titleZh: "Taogao 心事沉重",
    accent: "linear-gradient(135deg, #9ed2d5 0%, #d7f0ef 45%, #f4fffe 100%)",
    animal: "petit hippopotame",
    priceEur: 5.99,
    publishDate: "15 mai 2026",
    synopsisFr:
      "Taogao porte la tristesse des autres comme si elle lui appartenait. Ce recit tendre l'aide a rendre a chacun ce qui lui revient et a retrouver une respiration plus legere.",
    teachingPointFr:
      "Protection emotionnelle, empathie saine et vocabulaire bilingue autour des sentiments.",
    amazonEbookUrl:
      "https://www.amazon.fr/%E6%B1%89%E6%B3%95%E5%8F%8C%E8%AF%AD-Taogao-lourd-chinois-fran%C3%A7ais-ebook/dp/B0H1KBZ14K",
    amazonPaperbackUrl:
      "https://www.amazon.fr/Taogao-c%C5%93ur-lourd-Lhistoire-hippopotame/dp/B0H1MTP4KV",
  },
  {
    id: "fulbert",
    asin: "B0GXCWMM45",
    titleFr: "Fulbert le chaton qui musarde",
    titleZh: "Fulbert 爱拖延的小猫",
    accent: "linear-gradient(135deg, #f4b6bc 0%, #fde7ea 45%, #fff9fa 100%)",
    animal: "chaton reveur",
    priceEur: 5.99,
    publishDate: "26 avril 2026",
    synopsisFr:
      "Fulbert adore dessiner, mais son temps disparait a force d'aider tout le monde. Avec l'aide d'un grand chat, il apprend a proteger son temps et a terminer ce qui compte pour lui.",
    teachingPointFr:
      "Gestion du temps, priorites personnelles et apprentissage du chinois en douceur.",
    amazonEbookUrl:
      "https://www.amazon.fr/Fulbert-chaton-musarde-chinois-fran%C3%A7ais-ebook/dp/B0GXCWMM45",
    amazonPaperbackUrl:
      "https://www.amazon.fr/Fulbert-chaton-qui-musarde-Lhistoire/dp/B0GYL55RVW",
  },
];

export const donationOptions = [
  { id: "petit-nuage", label: "Petit Nuage", amount: 3 },
  { id: "coup-de-patte", label: "Coup de Patte", amount: 5 },
  { id: "etoile-douce", label: "Etoile Douce", amount: 10 },
];
