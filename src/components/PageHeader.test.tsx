// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PageHeader } from './PageHeader';

afterEach(() => cleanup());

describe('PageHeader', () => {
  it('mostra o título da aba, o texto de apoio e as ações', () => {
    render(<PageHeader tab="ranking" meta="Últimas avaliações · Novembro/2026" actions={<button type="button">Exportar</button>} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Ranking' })).toBeTruthy();
    expect(screen.getByText('Últimas avaliações · Novembro/2026')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Exportar' })).toBeTruthy();
  });

  it('sem ações nem texto de apoio, mostra só o título', () => {
    render(<PageHeader tab="success" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Sucesso do Cliente' })).toBeTruthy();
  });
});

describe('PageActions', () => {
  it('leva os botões da tela para o cabeçalho', async () => {
    const { PageActions } = await import('./PageHeader');
    render(
      <>
        <PageHeader tab="ranking" />
        <PageActions>
          <button type="button">Exportar CSV</button>
        </PageActions>
      </>,
    );
    const header = screen.getByRole('heading', { level: 1 }).closest('.band') as HTMLElement;
    expect(header.contains(await screen.findByRole('button', { name: 'Exportar CSV' }))).toBe(true);
  });

  it('sem cabeçalho na página, mostra os botões no lugar', async () => {
    const { PageActions } = await import('./PageHeader');
    render(
      <PageActions>
        <button type="button">Exportar CSV</button>
      </PageActions>,
    );
    expect(screen.getByRole('button', { name: 'Exportar CSV' })).toBeTruthy();
  });
});
