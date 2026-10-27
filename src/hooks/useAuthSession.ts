import { useEffect, useState } from 'react';
import { getCurrentUserRole, subscribeToAuth } from '../lib/backend';
import type { AuthUser } from '../lib/backend';

export function useAuthSession() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authRole, setAuthRole] = useState<'leader' | 'admin' | null>(null);
  const [authRoleReady, setAuthRoleReady] = useState(false);

  useEffect(() => subscribeToAuth((user) => {
    setAuthUser(user);
    setAuthReady(true);
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
