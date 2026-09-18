import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { requirePublicEnv } from "@/lib/env";
import type { Database } from "@/lib/types/database";

/**
 * Supabase-Client fuer Server Components, Server Actions und Route Handler.
 * Nutzt die Cookies der Session - damit greift RLS immer im Namen des
 * angemeldeten Nutzers.
 */
export async function createSupabaseServerClient() {
  const { supabaseUrl, supabaseAnonKey } = requirePublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // In Server Components ist das Setzen von Cookies nicht erlaubt.
          // Die Middleware refresht die Session, daher ist das unkritisch.
        }
      },
    },
  });
}
