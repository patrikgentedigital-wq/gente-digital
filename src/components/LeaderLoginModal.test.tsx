// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const backend = vi.hoisted(() => ({ loginWithEmailAndPassword: vi.fn(), sendPasswordReset: vi.fn() }));
vi.mock('../lib/backend', () => backend);

import { LeaderLoginModal } from './LeaderLoginModal';

beforeEach(() => {
  vi.clearAllMocks();
  backend.sendPasswordReset.mockResolvedValue(undefined);
});
afterEach(() => cleanup());

const renderModal = () => render(<LeaderLoginModal isOpen onClose={vi.fn()} onLoginSuccess={vi.fn()} />);

describe('Esqueci minha senha', () => {
  it('pede o e-mail antes de enviar o link', async () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: /Esqueci minha senha/ }));
    expect(await screen.findByText('Digite o seu e-mail acima para receber o link.')).toBeTruthy();
    expect(backend.sendPasswordReset).not.toHaveBeenCalled();
  });

  it('envia o link e responde sem revelar se o e-mail existe', async () => {
    renderModal();
    fireEvent.change(screen.getByLabelText('E-mail corporativo'), { target: { value: 'lider@empresa.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Esqueci minha senha/ }));
    await waitFor(() => expect(backend.sendPasswordReset).toHaveBeenCalledWith('lider@empresa.com'));
    expect(await screen.findByText(/Se este e-mail estiver cadastrado, enviamos um link/)).toBeTruthy();
  });

  it('mostra o aviso quando há pedidos demais', async () => {
    backend.sendPasswordReset.mockRejectedValue(new Error('Aguarde um pouco antes de pedir outro link.'));
    renderModal();
    fireEvent.change(screen.getByLabelText('E-mail corporativo'), { target: { value: 'lider@empresa.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Esqueci minha senha/ }));
    expect(await screen.findByText('Aguarde um pouco antes de pedir outro link.')).toBeTruthy();
  });
});
