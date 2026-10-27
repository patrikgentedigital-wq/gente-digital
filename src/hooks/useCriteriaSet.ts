import { useCallback, useEffect, useState } from 'react';
import { getCriteriaSet, type CriteriaSet } from '../lib/backend';

/** Perguntas vigentes de uma equipe, com recarga manual (depois de salvar uma versão nova). */
export function useCriteriaSet(teamId: string | null) {
  const [set, setSet] = useState<CriteriaSet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    setSet(null);
    setError(null);
    if (!teamId) return undefined;

    let active = true;
    setLoading(true);
    getCriteriaSet(teamId)
      .then((loaded) => {
        if (active) setSet(loaded);
      })
      .catch((err: unknown) => {
        console.error('Unable to load criteria set:', err);
        if (active) setError('Não foi possível carregar as perguntas desta equipe.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [teamId, version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  return { set, loading, error, reload };
}
