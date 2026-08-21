import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import type { TeamMember } from '../types';
import { subscribeToMembers } from '../lib/firebaseLoader';

export function useMembers(authUser: User | null, authRole: 'leader' | 'admin' | null) {
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
        setMembersError('Não foi possível carregar os dados do Firestore. Verifique sua autorização.');
        setMembersLoading(false);
      },
      (error) => {
        console.error('Invalid member document:', error);
        setMembersError(`Alguns dados foram ignorados por estarem inválidos (${error.documentId}).`);
      },
    );
  }, [authRole, authUser]);

  return { members, setMembers, membersError, membersLoading };
}
