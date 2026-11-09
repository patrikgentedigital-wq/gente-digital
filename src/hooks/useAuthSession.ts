import { useEffect, useRef, useState } from 'react';
import { getCurrentUserRole, subscribeToAuth } from '../lib/backend';
import type { AuthUser } from '../lib/backend';

export function useAuthSession() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authRole, setAuthRole] = useState<'leader' | 'admin' | null>(null);
  const [authRoleReady, setAuthRoleReady] = useState(false);

  const currentUserId = useRef<string | null>(null);

  useEffect(() => subscribeToAuth((user) => {
    setAuthReady(true);
    // O Supabase avisa também na renovação do token e ao voltar para a aba, sempre com o mesmo usuário.
    // Só recomeça (e desmonta a tela) quando a pessoa realmente muda.
    if (user && user.id === currentUserId.current) return;
    currentUserId.current = user?.id ?? null;
    setAuthUser(user);
    setAuthRole(null);
    setAuthRoleReady(!user);
  }), []);

  useEffect(() => {
    if (!authUser) return undefined;

    let active = true;
    getCurrentUserRole(authUser)
      .then((role) => {
        if (active) setAuthRole(role);
      })
      .catch((error) => {
        console.error('Unable to resolve user role:', error);
        if (active) setAuthRole(null);
      })
      .finally(() => {
        if (active) setAuthRoleReady(true);
      });

    return () => {
      active = false;
    };
  }, [authUser]);

  return { authUser, authReady, authRole, authRoleReady };
}
