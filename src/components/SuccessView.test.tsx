// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const getTechnicianRatings = vi.fn();
vi.mock('../lib/backend', () => ({ getTechnicianRatings: (...args: unknown[]) => getTechnicianRatings(...args) }));

import { SuccessView } from './SuccessView';

beforeAll(() => {
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
});

afterEach(() => {
  cleanup();
  getTechnicianRatings.mockReset();
});

const row = (over: Record<string, unknown>) => ({
  idOs: '1', idTecnico: '96', nomeTecnico: 'José Julio', dataOs: '2026-10-20 10:00:00',
  enviadaEm: '2026-10-21T12:00:00.000Z', respondidaEm: '', nota: 0, status: 'aguardando', ...over,
});

describe('SuccessView', () => {
  it('sem nenhuma nota mostra o aviso de que o painel ainda está começando', async () => {
    getTechnicianRatings.mockResolvedValue([row({ status: 'aguardando' }), row({ idOs: '2', status: 'sem_resposta' })]);
    render(<SuccessView />);
    await screen.findByText(/Ainda não há notas respondidas/);
    expect(screen.getByText('Pesquisas enviadas').nextElementSibling?.textContent).toBe('2');
  });

  it('mostra os técnicos com média e as notas baixas', async () => {
    getTechnicianRatings.mockResolvedValue([
      row({ idOs: '1', status: 'respondida', nota: 5, respondidaEm: '2026-10-22T10:00:00.000Z' }),
      row({ idOs: '2', status: 'respondida', nota: 2, respondidaEm: '2026-10-23T10:00:00.000Z' }),
    ]);
    render(<SuccessView />);
    await screen.findAllByText('José Julio');
    expect(screen.getAllByText('3,5').length).toBeGreaterThan(0);
    expect(screen.getByText(/OS 2/)).toBeTruthy();
  });

  it('mostra o erro em português e permite tentar de novo', async () => {
    getTechnicianRatings.mockRejectedValueOnce(new Error('Não foi possível ler as notas agora.'));
    render(<SuccessView />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Não foi possível ler as notas agora.'));
    getTechnicianRatings.mockResolvedValueOnce([]);
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
    await screen.findByText(/Ainda não há notas respondidas/);
  });
});
