import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = vi.hoisted(() => ({
  rpc: vi.fn(),
  listResult: { data: [] as unknown, error: null as unknown },
  profilesResult: { data: [] as unknown, error: null as unknown },
  countResult: { count: 0 as number | null, error: null as unknown },
  updateResult: { error: null as unknown },
  updates: [] as unknown[],
}));

vi.mock('./client', () => ({
  getSupabase: () => ({
    rpc: fake.rpc,
    from: (table: string) => {
      if (table === 'profiles') return { select: () => ({ in: async () => fake.profilesResult }) };
      return {
        select: (_columns: string, options?: { head?: boolean }) => {
          if (options?.head) return { is: async () => fake.countResult };
          return { is: () => ({ order: () => ({ limit: async () => fake.listResult }) }) };
        },
        update: (values: unknown) => {
          fake.updates.push(values);
          return { eq: async () => fake.updateResult };
        },
      };
    },
  }),
}));

import { countOpenClientErrors, listOpenClientErrors, reportError, resolveClientError } from './errors';

beforeEach(() => {
  vi.clearAllMocks();
  fake.updates.length = 0;
  fake.listResult = { data: [], error: null };
  fake.profilesResult = { data: [], error: null };
  fake.countResult = { count: 0, error: null };
  fake.updateResult = { error: null };
});

describe('reportError', () => {
  it('envia o erro pela função do banco', async () => {
    fake.rpc.mockResolvedValue({ data: null, error: null });
    await reportError({ source: 'window', message: 'Quebrou', stack: 'pilha', url: 'https://x/y', userAgent: 'ua' });
    expect(fake.rpc).toHaveBeenCalledWith('report_client_error', {
      p_source: 'window', p_message: 'Quebrou', p_stack: 'pilha', p_url: 'https://x/y', p_user_agent: 'ua',
    });
  });

  it('propaga a falha do servidor para quem chamou decidir', async () => {
    fake.rpc.mockResolvedValue({ data: null, error: { message: 'falhou' } });
    await expect(reportError({ source: 'save', message: 'x', url: '', userAgent: '' })).rejects.toBeTruthy();
  });
});

describe('listOpenClientErrors', () => {
  it('lista os erros abertos com o nome de quem foi afetado', async () => {
    fake.listResult = {
      data: [{ id: 5, created_at: '2026-10-27T10:00:00Z', user_id: 'u1', source: 'boundary', message: 'Tela quebrou', stack: 's', url: 'https://x', user_agent: 'ua' }],
      error: null,
    };
    fake.profilesResult = { data: [{ user_id: 'u1', name: 'Brenda' }], error: null };
    expect(await listOpenClientErrors(50)).toEqual([
      { id: 5, createdAt: '2026-10-27T10:00:00Z', userName: 'Brenda', source: 'boundary', message: 'Tela quebrou', stack: 's', url: 'https://x', userAgent: 'ua' },
    ]);
  });

  it('mostra "Conta removida" quando o perfil não existe mais', async () => {
    fake.listResult = { data: [{ id: 6, created_at: '2026-10-27T10:00:00Z', user_id: null, source: 'window', message: 'm', stack: null, url: null, user_agent: null }], error: null };
    const [item] = await listOpenClientErrors(10);
    expect(item.userName).toBe('Conta removida');
    expect(item.stack).toBe('');
  });
});

describe('countOpenClientErrors e resolveClientError', () => {
  it('conta os abertos e devolve 0 se a contagem falhar', async () => {
    fake.countResult = { count: 4, error: null };
    expect(await countOpenClientErrors()).toBe(4);
    fake.countResult = { count: null, error: { message: 'x' } };
    expect(await countOpenClientErrors()).toBe(0);
  });

  it('marca como resolvido gravando só a data', async () => {
    await resolveClientError(5);
    expect(fake.updates).toHaveLength(1);
    expect(Object.keys(fake.updates[0] as object)).toEqual(['resolved_at']);
  });
});
