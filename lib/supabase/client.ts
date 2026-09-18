"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requirePublicEnv } from "@/lib/env";
import type { Database } from "@/lib/types/database";

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createSupabaseBrowserClient() {
  if (cached) return cached;
  const { supabaseUrl, supabaseAnonKey } = requirePublicEnv();
  cached = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  return cached;
}
