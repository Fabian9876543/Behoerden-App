import "server-only";

import { createClient } from "@supabase/supabase-js";
import { requirePublicEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/lib/types/database";

/**
 * Service-Role-Client. Umgeht RLS und wird ausschliesslich fuer Operationen
 * benutzt, die die Auth-Ebene betreffen (Account-Loeschung).
 *
 * Jeder Aufruf MUSS vorher die User-ID aus der Session verifiziert haben.
 */
export function createSupabaseAdminClient() {
  const { supabaseUrl } = requirePublicEnv();
  const { supabaseServiceRoleKey } = serverEnv();

  if (!supabaseServiceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ist nicht gesetzt. " +
        "Die vollstaendige Kontoloeschung steht ohne diesen Key nicht zur Verfuegung.",
    );
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function isAdminClientConfigured(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
