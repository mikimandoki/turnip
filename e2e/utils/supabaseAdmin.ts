import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function ensureTestUserExistsVerified(email: string) {
  const devPassword = process.env.SUPABASE_TEST_PW;
  if (!devPassword) throw new Error('Missing test user credentials in env');

  // 1) Try to find existing
  const existing = await listUsersByEmail(email);
  if (existing.users.length) return existing.users[0].id;

  // 2) Create (may race with another test runner)
  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: devPassword,
      email_confirm: true,
    });

    if (error) throw error;
    if (!data.user?.id) throw new Error('User creation succeeded but no user id returned');
    return data.user.id;
  } catch (e) {
    // 3) If it failed, re-check and return the now-existing user
    const after = await listUsersByEmail(email);
    if (after.users.length) return after.users[0].id;

    // If still not found, rethrow with more detail for debugging
    throw new Error(
      `createUser failed and user still not found. Original message: ${e instanceof Error ? e.message : String(e)}`,
      { cause: e }
    );
  }
}

async function listUsersByEmail(email: string) {
  const perPage = 100;
  let page = 1;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const batch = data?.users ?? [];
    const matched = batch.filter(u => u.email?.toLowerCase() === email.toLowerCase());
    if (matched.length) return { users: matched.map(u => ({ id: u.id, email: u.email })) };

    if (batch.length < perPage) break;
    page++;
  }

  return { users: [] as Array<{ id: string; email: string | null }> };
}

export async function deleteUser(id: string) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw error;
    if (!data.user) throw new Error('Auth failed');
  } catch (e) {
    throw new Error(
      `deleteUser failed. Original message: ${e instanceof Error ? e.message : String(e)}`,
      { cause: e }
    );
  }
}
