export const siteConfig = {
  brand: "Visd AR",
  adminInbox: "visdar@outlook.fr",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  paypalClientId:
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ||
    "BAAQOWw6DVBBenlHrUo5xWPqO1hOT3ukzJi5t1TWfXKaqjuAfo6E4VOzai2aXku4al_2GmAFDcowjxqLNw",
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
};

export const hasSupabaseConfig =
  Boolean(siteConfig.supabaseUrl) && Boolean(siteConfig.supabaseAnonKey);

export const hasStripeConfig = Boolean(siteConfig.stripePublishableKey);
