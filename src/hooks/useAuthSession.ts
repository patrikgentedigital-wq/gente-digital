import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { getCurrentUserRole, subscribeToAuth } from '../lib/firebaseLoader';

export function useAuthSession() {
  const [authUser, setAuthUser] = useState<User | null>(null);
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
        console.error('Unable to resolve Firebase role:', error);
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
