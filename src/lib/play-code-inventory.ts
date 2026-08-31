export type PlayCodeStatus = {
  status: "available" | "unavailable" | "assigned" | "expired" | "paused" | "blocked";
  code?: string | null;
  hasClaim: boolean;
  validUntil?: string;
  repeated?: boolean;
};

// Reject unexpected columns instead of accidentally importing dates or URLs.
export function parsePlayCodesCsv(source: string): string[] {
  if (source.length > 750_000) throw new Error("Le fichier est trop volumineux.");
  const rows = source.replace(/^\uFEFF/, "").split(/\r?\n/).map(row => row.trim()).filter(Boolean);
  if (/^"?(promotion[ _-]*)?codes?"?$/i.test(rows[0] || "")) rows.shift();
  const codes = rows.map(row => /^"[A-Za-z0-9]+"$/.test(row) ? row.slice(1, -1).toUpperCase() : row.toUpperCase());
  if (!codes.length || codes.length > 5000 || codes.some(code => !/^[A-Z0-9]{8,128}$/.test(code))) {
    throw new Error("Utilisez le CSV Google Play à une seule colonne, avec 1 à 5 000 codes. Aucun code n’a été importé.");
  }
  return [...new Set(codes)];
}

export function playCodeMessage(status: PlayCodeStatus): string {
  switch (status.status) {
    case "available": return "Un code peut vous être attribué après les confirmations ci-dessous.";
    case "assigned": return status.repeated ? "Voici le code déjà attribué à votre compte pour cette application." : "Votre code personnel est prêt. Copiez-le et utilisez-le dans Google Play.";
    case "expired": return "La date de validité de votre code est dépassée. Contactez Visd AR ; aucun nouveau code n’a été consommé.";
    case "paused": return "La campagne de votre code est momentanément indisponible. Contactez Visd AR.";
    case "blocked": return "Ce code a été retiré de la distribution. Contactez Visd AR pour vérifier votre accès.";
    default: return "Aucun code n’est disponible actuellement pour cette application. N’effectuez aucun achat pour participer au test.";
  }
}

export function playCodeError(error: { code?: string; message?: string }): { status: number; message: string } {
  const messages: Record<string, string> = {
    AUTH_REQUIRED: "Connectez-vous pour obtenir votre code.",
    ADMIN_REQUIRED: "Accès réservé à l’administrateur.",
    VERIFIED_EMAIL_REQUIRED: "Confirmez d’abord l’adresse e-mail de votre compte Visd AR.",
    PLAY_EMAIL_MUST_MATCH: "Pour recevoir un code automatiquement, connectez-vous à Visd AR avec l’adresse de votre compte Google Play, après l’avoir confirmée.",
    EMAIL_ALREADY_ASSIGNED: "Un accès a déjà été attribué à cette adresse pour cette application. Reconnectez-vous au compte Visd AR d’origine ou contactez l’administrateur.",
    CONFIRMATIONS_REQUIRED: "Confirmez votre adhésion au groupe, votre inscription au test et votre autorisation.",
    INVALID_IMPORT: "Vérifiez le CSV, les dates, le nom du lot et la confirmation des codes non utilisés.",
    CODE_APP_CONFLICT: "Un code de ce fichier est déjà associé à une autre application. Aucun import effectué.",
    GOOGLE_ACTIVE_CONFIRMATION_REQUIRED: "Confirmez que la promotion est active dans Google Play avant d’activer ce lot.",
    BATCH_MISSING_OR_EXPIRED: "Ce lot est introuvable ou sa date de validité est dépassée.",
  };
  if (error.message && messages[error.message]) return { status: error.code === "42501" ? 403 : 400, message: messages[error.message] };
  if (error.code === "PGRST202" || error.code === "42883" || error.code === "42P01") {
    return { status: 503, message: "L’attribution automatique est en cours de configuration. Aucun code n’a été distribué. Le guide d’installation reste accessible ci-dessous." };
  }
  return { status: 503, message: "Le service de codes est momentanément indisponible. Réessayez : un éventuel code déjà attribué sera conservé." };
}
