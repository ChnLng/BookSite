export const siteConfig = {
  brand: "Visd AR",
  adminInbox: "visdar@outlook.fr",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  paypalClientId:
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
    "BAAAjG_eMcFuTZWbLVaucPb7Mt-fRc34Mp74pcWAcyhxMa7xug7dcAJF-KghS9svmEh6l0kNpmv5uNTHCQ",
  paypalHostedClientId:
    process.env.NEXT_PUBLIC_PAYPAL_HOSTED_CLIENT_ID ||
    "BAAAjG_eMcFuTZWbLVaucPb7Mt-fRc34Mp74pcWAcyhxMa7xug7dcAJF-KghS9svmEh6l0kNpmv5uNTHCQ",
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
};

export const hasSupabaseConfig =
  Boolean(siteConfig.supabaseUrl) && Boolean(siteConfig.supabaseAnonKey);

export const hasStripeConfig = Boolean(siteConfig.stripePublishableKey);
