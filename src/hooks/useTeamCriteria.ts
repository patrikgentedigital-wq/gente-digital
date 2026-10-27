import { useEffect, useState } from 'react';
import { getCriteriaSet } from '../lib/backend';
import type { CriteriaCategory } from '../lib/criteria';

/** Perguntas vigentes da equipe. Devolve null sem equipe, enquanto carrega ou quando a equipe ainda não tem perguntas. */
export function useTeamCriteria(teamId: string | null): CriteriaCategory[] | null {
  const [categories, setCategories] = useState<CriteriaCategory[] | null>(null);

  useEffect(() => {
    setCategories(null);
    if (!teamId) return undefined;

    let active = true;
    getCriteriaSet(teamId)
      .then((set) => {
        if (active) setCategories(set?.categories ?? null);
      })
      .catch((error) => {
        console.error('Unable to load team criteria:', error);
        if (active) setCategories(null);
      });

    return () => {
      active = false;
    };
  }, [teamId]);

  return categories;
}
