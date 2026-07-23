export const siteConfig = {
  brand: "Visd AR",
  adminInbox: "visdar@outlook.fr",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
};

export const hasSupabaseConfig =
  Boolean(siteConfig.supabaseUrl) && Boolean(siteConfig.supabaseAnonKey);

export const hasStripeConfig = Boolean(siteConfig.stripePublishableKey);
