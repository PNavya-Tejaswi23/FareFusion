
const { createClient } = require("@supabase/supabase-js");
const WebSocket = require("ws");

function createSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !url ||
    !key ||
    url.includes("YOUR-PROJECT-REF") ||
    key.includes("YOUR_SUPABASE")
  ) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    realtime: {
      transport: WebSocket
    }
  });
}

module.exports = { createSupabaseClient };
