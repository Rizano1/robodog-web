/**
 * Supabase browser client singleton.
 * Uses @supabase/ssr's createBrowserClient for SSR-safe cookie handling.
 * Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from env.
 */

import { createBrowserClient } from "@supabase/ssr";

export function getSupabaseBrowserClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
}
