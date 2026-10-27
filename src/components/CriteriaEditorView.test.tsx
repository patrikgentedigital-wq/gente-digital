// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const backend = vi.hoisted(() => ({
  listTeams: vi.fn(),
  getCurrentProfile: vi.fn(),
  getCriteriaSet: vi.fn(),
  saveCriteriaSet: vi.fn(),
}));

vi.mock('../lib/backend', () => backend);
vi.mock('../utils/toastUtils', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { CriteriaEditorView } from './CriteriaEditorView';

const savedCategories = [
  { id: 'c1', name: 'Comunicação', items: [{ id: '1-0', text: 'Clareza' }, { id: '1-1', text: 'Escuta' }] },
];

beforeEach(() => {
  vi.clearAllMocks();
  backend.listTeams.mockResolvedValue([{ leader: 'Brenda', color: '#7A4FCB', members: [] }, { leader: 'Alfredo', color: '#E0692A', members: [] }]);
  backend.getCurrentProfile.mockResolvedValue({ role: 'leader', teamId: 'Brenda', name: 'Brenda' });
  backend.getCriteriaSet.mockResolvedValue({ teamId: 'Brenda', version: 1, categories: savedCategories, maxScore: 10 });
  backend.saveCriteriaSet.mockResolvedValue({ teamId: 'Brenda', version: 2, categories: savedCategories, maxScore: 15 });
});

afterEach(() => cleanup());

describe('aba Perguntas', () => {
  it('admin escolhe a equipe, líder não vê o seletor', async () => {
    const { unmount } = render(<CriteriaEditorView role="admin" />);
    expect(await screen.findByLabelText('Equipe')).toBeTruthy();
    unmount();

    render(<CriteriaEditorView role="leader" />);
    await screen.findByText(/Time Brenda/);
    expect(screen.queryByLabelText('Equipe')).toBeNull();
  });

  it('mostra o máximo e atualiza ao adicionar uma pergunta (+5)', async () => {
    render(<CriteriaEditorView role="leader" />);
    expect(await screen.findByText(/máximo de 10 pontos/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Adicionar pergunta/ }));
    expect(await screen.findByText(/máximo de 15 pontos/)).toBeTruthy();
  });

  it('bloqueia pergunta com texto vazio e não chama o servidor', async () => {
    render(<CriteriaEditorView role="leader" />);
    await screen.findByText(/máximo de 10 pontos/);
    fireEvent.click(screen.getByRole('button', { name: /Adicionar pergunta/ }));
    fireEvent.click(screen.getByRole('button', { name: /Salvar perguntas/ }));
    expect(await screen.findByText('Toda pergunta precisa de texto.')).toBeTruthy();
    expect(backend.saveCriteriaSet).not.toHaveBeenCalled();
  });

  it('salva uma versão nova e mostra que avaliações antigas mantêm as perguntas', async () => {
    render(<CriteriaEditorView role="leader" />);
    await screen.findByText(/máximo de 10 pontos/);
    fireEvent.click(screen.getByRole('button', { name: /Adicionar pergunta/ }));
    fireEvent.change(screen.getByLabelText('Pergunta 1.3'), { target: { value: 'Responde no prazo' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar perguntas/ }));

    await waitFor(() => expect(backend.saveCriteriaSet).toHaveBeenCalledTimes(1));
    expect(backend.saveCriteriaSet.mock.calls[0][0]).toBe('Brenda');
    expect(await screen.findByText(/Perguntas salvas como versão 2/)).toBeTruthy();
    expect(screen.getByText(/Avaliações já feitas mantêm as perguntas antigas/)).toBeTruthy();
  });

  it('equipe sem perguntas mostra o convite para criar e bloqueia salvar vazio', async () => {
    backend.getCriteriaSet.mockResolvedValue(null);
    render(<CriteriaEditorView role="leader" />);
    expect(await screen.findByText(/ainda não tem perguntas/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Salvar perguntas/ }));
    expect(await screen.findByText('Inclua ao menos uma pergunta.')).toBeTruthy();
    expect(backend.saveCriteriaSet).not.toHaveBeenCalled();
  });

  it('líder sem equipe vê o aviso e nenhum editor', async () => {
    backend.getCurrentProfile.mockResolvedValue({ role: 'leader', teamId: null, name: 'X' });
    render(<CriteriaEditorView role="leader" />);
    expect(await screen.findByText(/não está ligada a uma equipe/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Salvar perguntas/ })).toBeNull();
    expect(backend.getCriteriaSet).not.toHaveBeenCalled();
  });
});
