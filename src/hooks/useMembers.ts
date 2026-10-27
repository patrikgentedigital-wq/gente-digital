import { useEffect, useState } from 'react';
import { subscribeToMembers } from '../lib/backend';
import type { AuthUser } from '../lib/backend';
import type { TeamMember } from '../types';

export function useMembers(authUser: AuthUser | null, authRole: 'leader' | 'admin' | null) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [membersLoading, setMembersLoading] = useState(false);

  useEffect(() => {
    if (!authUser || !authRole) {
      setMembers([]);
      setMembersError(null);
      setMembersLoading(false);
      return undefined;
    }

    setMembersError(null);
    setMembersLoading(true);
    return subscribeToMembers(
      (updatedMembers) => {
        setMembers(updatedMembers);
        setMembersLoading(false);
      },
      (error) => {
        console.error('Members subscription failed:', error);
        setMembers([]);
        setMembersError('Não foi possível carregar os dados. Verifique sua autorização.');
        setMembersLoading(false);
      },
    );
  }, [authRole, authUser]);

  return { members, setMembers, membersError, membersLoading };
}
