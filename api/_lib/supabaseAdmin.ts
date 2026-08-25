import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

export function createSupabaseAdmin(
  url: string,
  serviceRoleKey: string
): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export async function authenticateSupabaseRequest(
  supabase: SupabaseClient,
  accessToken: string
): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return data.user;
}

export async function listAllHubUsers(
  supabase: SupabaseClient
): Promise<User[]> {
  const users: User[] = [];
  const perPage = 1000;
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Unable to list Hub users: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < perPage) break;
  }
  return users;
}

export function throwOnSupabaseError(
  operation: string,
  error: { message: string } | null
): void {
  if (error) throw new Error(`${operation}: ${error.message}`);
}
