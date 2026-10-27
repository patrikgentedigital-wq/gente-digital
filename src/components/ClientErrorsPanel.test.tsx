// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const backend = vi.hoisted(() => ({ listOpenClientErrors: vi.fn(), resolveClientError: vi.fn() }));
vi.mock('../lib/backend', () => backend);

import { ClientErrorsPanel } from './ClientErrorsPanel';

const error = {
  id: 7, createdAt: '2026-10-27T10:00:00Z', userName: 'Brenda', source: 'boundary' as const,
  message: 'Cannot read properties of undefined', stack: 'pilha', url: 'https://quadro-desempenho.vercel.app/?tab=teams', userAgent: 'ua',
};

beforeEach(() => {
  vi.clearAllMocks();
  backend.listOpenClientErrors.mockResolvedValue([error]);
  backend.resolveClientError.mockResolvedValue(undefined);
});
afterEach(() => cleanup());

describe('ClientErrorsPanel', () => {
  it('lista o erro com quem foi afetado e onde aconteceu', async () => {
    render(<ClientErrorsPanel onChange={vi.fn()} />);
    expect(await screen.findByText('Cannot read properties of undefined')).toBeTruthy();
    expect(screen.getByText(/Brenda/)).toBeTruthy();
    expect(screen.getByText(/tab=teams/)).toBeTruthy();
  });

  it('marca como resolvido, tira da lista e avisa quem mostra a contagem', async () => {
    const onChange = vi.fn();
    render(<ClientErrorsPanel onChange={onChange} />);
    fireEvent.click(await screen.findByRole('button', { name: /Marcar como resolvido/ }));
    await waitFor(() => expect(backend.resolveClientError).toHaveBeenCalledWith(7));
    await waitFor(() => expect(screen.queryByText('Cannot read properties of undefined')).toBeNull());
    expect(onChange).toHaveBeenCalled();
  });

  it('sem erros abertos, diz que está tudo certo', async () => {
    backend.listOpenClientErrors.mockResolvedValue([]);
    render(<ClientErrorsPanel onChange={vi.fn()} />);
    expect(await screen.findByText('Nenhum erro aberto.')).toBeTruthy();
  });
});
