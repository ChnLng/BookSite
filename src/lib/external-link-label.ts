const GOOGLE_PLAY_STORE_HOST = "play.google.com";

function hostnameFor(url: string) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function getExternalLinkLabel(url: string, fallback = "Lien externe") {
  const hostname = hostnameFor(url);

  if (hostname === GOOGLE_PLAY_STORE_HOST) {
    return "Google Play Store";
  }

  if (hostname === "amzn.to" || hostname === "a.co" || hostname === "amazon.com" || hostname.startsWith("amazon.") || hostname.includes(".amazon.")) {
    return "Amazon";
  }

  return fallback;
}
