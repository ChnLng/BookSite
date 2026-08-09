export function signedStorageTusEndpoint(configuredUrl: string) {
  if (!configuredUrl) throw new Error("URL Supabase manquante.");
  const url = new URL(configuredUrl);
  if (url.hostname.endsWith(".supabase.co") && !url.hostname.endsWith(".storage.supabase.co")) {
    url.hostname = url.hostname.replace(/\.supabase\.co$/, ".storage.supabase.co");
  }
  return `${url.origin}/storage/v1/upload/resumable/sign`;
}
