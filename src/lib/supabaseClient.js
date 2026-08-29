import { createClient, FunctionsHttpError } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum di-set. Cek file .env di root project.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * supabase-js's FunctionsHttpError.message is ALWAYS the generic "Edge
 * Function returned a non-2xx status code" — the actual JSON error body our
 * functions return (e.g. "Server AI lagi sibuk...") only lives on
 * error.context, a Response the SDK never reads for you. Every caller of
 * an Edge Function should go through this helper so friendly-error mappers
 * (and the user) actually see that message instead of the useless generic one.
 */
export async function invokeFunction(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (!error) return data;

  if (error instanceof FunctionsHttpError) {
    let payload = null;
    try {
      payload = await error.context.json();
    } catch {
      // Body wasn't JSON (or already consumed) — fall through to the generic error.
    }
    if (payload?.error || payload?.message) {
      throw new Error(payload.error || payload.message);
    }
  }
  throw error;
}
