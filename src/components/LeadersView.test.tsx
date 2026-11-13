// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const backend = vi.hoisted(() => ({
  listLeaderAccounts: vi.fn(),
  inviteLeader: vi.fn(),
  changeLeaderTeam: vi.fn(),
  removeLeaderAccess: vi.fn(),
}));
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }));

vi.mock('../lib/backend', () => backend);
vi.mock('../utils/toastUtils', () => ({ toast: toastMock }));

import { LeadersView } from './LeadersView';

const overview = {
  accounts: [
    { userId: 'u-admin', email: 'mariza@empresa.com', name: 'Mariza Leite', role: 'admin', teamId: null, lastSignInAt: '2026-11-13T12:00:00Z', confirmed: true },
    { userId: 'u-brenda', email: 'brenda@empresa.com', name: 'Brenda', role: 'leader', teamId: 'Brenda', lastSignInAt: null, confirmed: false },
  ],
  teams: ['Brenda', 'Danielle', 'Diego'],
  history: [{ id: 1, action: 'leader_invited', subject: 'Brenda · líder de Brenda', at: '2026-11-13T12:30:00Z', by: 'mariza@empresa.com' }],
};

beforeEach(() => {
  vi.clearAllMocks();
  backend.listLeaderAccounts.mockResolvedValue(overview);
  backend.inviteLeader.mockResolvedValue({ invited: true });
  backend.changeLeaderTeam.mockResolvedValue(undefined);
  backend.removeLeaderAccess.mockResolvedValue(undefined);
});

afterEach(() => cleanup());

describe('tela Líderes', () => {
  it('lista as contas com papel e equipe, e marca o convite que ainda não foi aceito', async () => {
    render(<LeadersView currentUserId="u-admin" />);
    expect(await screen.findByText('mariza@empresa.com')).toBeTruthy();
    expect(screen.getByText('brenda@empresa.com')).toBeTruthy();
    expect(screen.getByText('Convite pendente')).toBeTruthy();
    expect(screen.getByText(/Brenda · líder de Brenda/)).toBeTruthy();
    expect(screen.getByText('Convite enviado')).toBeTruthy();
  });

  it('convida um líder com e-mail, nome e equipe, e recarrega a lista', async () => {
    render(<LeadersView currentUserId="u-admin" />);
    await screen.findByText('mariza@empresa.com');

    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'Diego@Empresa.com' } });
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Diego Costa' } });
    fireEvent.change(screen.getByLabelText('Equipe do líder'), { target: { value: 'Diego' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar convite' }));

    await waitFor(() => expect(backend.inviteLeader).toHaveBeenCalledTimes(1));
    expect(backend.inviteLeader).toHaveBeenCalledWith({ email: 'Diego@Empresa.com', nome: 'Diego Costa', papel: 'leader', equipe: 'Diego' });
    await waitFor(() => expect(backend.listLeaderAccounts).toHaveBeenCalledTimes(2));
    expect(toastMock.success).toHaveBeenCalled();
  });

  it('não deixa enviar o convite de líder sem equipe', async () => {
    render(<LeadersView currentUserId="u-admin" />);
    await screen.findByText('mariza@empresa.com');
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'x@empresa.com' } });
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'X' } });
    expect((screen.getByRole('button', { name: 'Enviar convite' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('convite de admin não pede equipe', async () => {
    render(<LeadersView currentUserId="u-admin" />);
    await screen.findByText('mariza@empresa.com');
    fireEvent.change(screen.getByLabelText('Papel'), { target: { value: 'admin' } });
    expect(screen.queryByLabelText('Equipe do líder')).toBeNull();
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'novo@empresa.com' } });
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Novo Admin' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar convite' }));
    await waitFor(() => expect(backend.inviteLeader).toHaveBeenCalledWith({ email: 'novo@empresa.com', nome: 'Novo Admin', papel: 'admin', equipe: null }));
  });

  it('mostra a mensagem de erro que a função devolveu, sem recarregar a lista', async () => {
    backend.inviteLeader.mockRejectedValue(new Error('Esse e-mail já tem acesso ao quadro.'));
    render(<LeadersView currentUserId="u-admin" />);
    await screen.findByText('mariza@empresa.com');
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'brenda@empresa.com' } });
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Brenda' } });
    fireEvent.change(screen.getByLabelText('Equipe do líder'), { target: { value: 'Brenda' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar convite' }));
    expect(await screen.findByText('Esse e-mail já tem acesso ao quadro.')).toBeTruthy();
    expect(backend.listLeaderAccounts).toHaveBeenCalledTimes(1);
  });

  it('troca a equipe de um líder pela lista', async () => {
    render(<LeadersView currentUserId="u-admin" />);
    await screen.findByText('brenda@empresa.com');
    fireEvent.change(screen.getByLabelText('Equipe de Brenda'), { target: { value: 'Danielle' } });
    await waitFor(() => expect(backend.changeLeaderTeam).toHaveBeenCalledWith('u-brenda', 'Danielle'));
  });

  it('pede confirmação antes de tirar o acesso, e só então tira', async () => {
    render(<LeadersView currentUserId="u-admin" />);
    await screen.findByText('brenda@empresa.com');
    fireEvent.click(screen.getByRole('button', { name: 'Tirar acesso de Brenda' }));
    expect(backend.removeLeaderAccess).not.toHaveBeenCalled();

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tirar acesso' }));
    await waitFor(() => expect(backend.removeLeaderAccess).toHaveBeenCalledWith('u-brenda'));
  });

  it('não oferece tirar o próprio acesso', async () => {
    render(<LeadersView currentUserId="u-admin" />);
    await screen.findByText('mariza@empresa.com');
    expect(screen.queryByRole('button', { name: 'Tirar acesso de Mariza Leite' })).toBeNull();
  });
});
