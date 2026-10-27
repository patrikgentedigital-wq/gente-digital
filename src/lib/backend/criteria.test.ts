import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CriteriaCategory } from '../criteria';

const fake = vi.hoisted(() => ({
  rpc: vi.fn(),
  maybeSingleResult: { data: null as unknown, error: null as unknown },
  calls: [] as string[],
}));

vi.mock('./client', () => ({
  getSupabase: () => ({
    rpc: fake.rpc,
    from: (table: string) => {
      fake.calls.push(`from:${table}`);
      const chain = {
        select: () => chain,
        eq: (column: string, value: string) => {
          fake.calls.push(`eq:${column}=${value}`);
          return chain;
        },
        order: (column: string, options: { ascending: boolean }) => {
          fake.calls.push(`order:${column}:${options.ascending ? 'asc' : 'desc'}`);
          return chain;
        },
        limit: (count: number) => {
          fake.calls.push(`limit:${count}`);
          return chain;
        },
        maybeSingle: async () => fake.maybeSingleResult,
      };
      return chain;
    },
  }),
}));

import { getCriteriaSet, saveCriteriaSet } from './criteria';

const categories: CriteriaCategory[] = [
  { id: 'c1', name: 'Comunicação', items: [{ id: '1-0', text: 'Clareza' }, { id: '1-1', text: 'Escuta' }] },
  { id: 'c2', name: 'Qualidade', items: [{ id: '2-0', text: 'Prazo' }] },
];

beforeEach(() => {
  vi.clearAllMocks();
  fake.calls.length = 0;
  fake.maybeSingleResult = { data: null, error: null };
});

describe('getCriteriaSet', () => {
  it('pede a versão mais recente da equipe e devolve no formato do app', async () => {
    fake.maybeSingleResult = { data: { team_id: 'Brenda', version: 3, categories, max_score: 15 }, error: null };
    const set = await getCriteriaSet('Brenda');
    expect(set).toEqual({ teamId: 'Brenda', version: 3, categories, maxScore: 15 });
    expect(fake.calls).toEqual(['from:criteria_sets', 'eq:team_id=Brenda', 'order:version:desc', 'limit:1']);
  });

  it('devolve null quando a equipe ainda não tem perguntas', async () => {
    expect(await getCriteriaSet('Nova')).toBeNull();
  });

  it('propaga erro de consulta', async () => {
    fake.maybeSingleResult = { data: null, error: new Error('sem rede') };
    await expect(getCriteriaSet('Brenda')).rejects.toThrow('sem rede');
  });
});

describe('saveCriteriaSet', () => {
  it('não chama o servidor quando a validação falha e mostra as mensagens', async () => {
    await expect(saveCriteriaSet('Brenda', [])).rejects.toThrow('Inclua ao menos uma pergunta.');
    expect(fake.rpc).not.toHaveBeenCalled();
  });

  it('envia as categorias ao servidor e devolve a versão nova', async () => {
    fake.rpc.mockResolvedValue({ data: { team_id: 'Brenda', version: 4, max_score: 15 }, error: null });
    const set = await saveCriteriaSet('Brenda', categories);
    expect(fake.rpc).toHaveBeenCalledWith('save_criteria_set', { p_team_id: 'Brenda', p_categories: categories });
    expect(set).toEqual({ teamId: 'Brenda', version: 4, categories, maxScore: 15 });
  });

  it('traduz erro de permissão do servidor', async () => {
    fake.rpc.mockResolvedValue({ data: null, error: { message: 'sem_permissao', code: '42501' } });
    await expect(saveCriteriaSet('Outra', categories)).rejects.toThrow('Você não tem permissão para editar as perguntas desta equipe.');
  });
});
