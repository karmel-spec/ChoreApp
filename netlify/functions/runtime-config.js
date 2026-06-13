const { json } = require("./_supabase");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });
  return json(200, {
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
    googleClientId: process.env.GOOGLE_CLIENT_ID || "",
    webPushVapidPublicKey: process.env.WEB_PUSH_VAPID_PUBLIC_KEY || "",
    siteUrl: process.env.TEAMWORK_CHORES_SITE_URL || "https://teamworkchores.com",
    backendReady: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
  });
};
