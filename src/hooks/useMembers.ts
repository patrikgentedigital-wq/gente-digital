import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import type { TeamMember } from '../types';
import { subscribeToMembers } from '../lib/firebaseLoader';

export function useMembers(authUser: User | null, authRole: 'leader' | 'admin' | null) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [membersError, setMembersError] = useState<string | null>(null);

  useEffect(() => {
    if (!authUser || !authRole) {
      setMembers([]);
      setMembersError(null);
      return undefined;
    }

    setMembersError(null);
    return subscribeToMembers(
      (updatedMembers) => setMembers(updatedMembers),
      (error) => {
        console.error('Members subscription failed:', error);
        setMembers([]);
        setMembersError('Não foi possível carregar os dados do Firestore. Verifique sua autorização.');
      },
      (error) => {
        console.error('Invalid member document:', error);
        setMembersError(`Alguns dados foram ignorados por estarem inválidos (${error.documentId}).`);
      },
    );
  }, [authRole, authUser]);

  return { members, setMembers, membersError };
}
