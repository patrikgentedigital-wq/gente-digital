import { getSupabase } from './client';

export type AppRole = 'leader' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
}

export interface AppProfile {
  role: AppRole;
  teamId: string | null;
  name: string;
}

interface ProfileRow {
  role: AppRole;
  team_id: string | null;
  name: string;
}

function toAuthUser(user: { id: string; email?: string | null }): AuthUser {
  return { id: user.id, email: user.email ?? '' };
}

async function fetchProfile(userId: string): Promise<AppProfile | null> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('role, team_id, name')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  const row = data as ProfileRow | null;
  return row ? { role: row.role, teamId: row.team_id, name: row.name } : null;
}

export function subscribeToAuth(onUserChange: (user: AuthUser | null) => void): () => void {
  const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
    onUserChange(session?.user ? toAuthUser(session.user) : null);
  });
  return () => data.subscription.unsubscribe();
}

/** Entra e confere que a conta tem perfil (papel); sem perfil a sessão é encerrada. */
export async function loginWithEmailAndPassword(
  email: string,
  password: string,
): Promise<{ user: AuthUser; leaderName: string }> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    const message = error?.message ?? '';
    if (/email not confirmed/i.test(message)) throw new Error('EMAIL_NOT_VERIFIED');
    if (/invalid login credentials/i.test(message)) throw new Error('INVALID_CREDENTIALS');
    throw new Error(message || 'LOGIN_FAILED');
  }

  const user = toAuthUser(data.user);
  const profile = await fetchProfile(user.id);
  if (!profile) {
    await supabase.auth.signOut();
    throw new Error('ROLE_NOT_AUTHORIZED');
  }
  return { user, leaderName: profile.name || user.email || 'Líder' };
}

export async function getCurrentUserRole(user: AuthUser): Promise<AppRole | null> {
  return (await fetchProfile(user.id))?.role ?? null;
}

export async function getCurrentProfile(): Promise<AppProfile | null> {
  const { data } = await getSupabase().auth.getSession();
  const userId = data.session?.user.id;
  return userId ? fetchProfile(userId) : null;
}

export async function logoutLeader(): Promise<void> {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw error;
}
