// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const backend = vi.hoisted(() => ({ updatePassword: vi.fn() }));
vi.mock('../lib/backend', () => backend);
vi.mock('../utils/toastUtils', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { SetPasswordView } from './SetPasswordView';

beforeEach(() => {
  vi.clearAllMocks();
  backend.updatePassword.mockResolvedValue(undefined);
});
afterEach(() => cleanup());

function fill(password: string, confirmation: string) {
  fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Repita a nova senha'), { target: { value: confirmation } });
  fireEvent.click(screen.getByRole('button', { name: /Salvar senha/ }));
}

describe('SetPasswordView', () => {
  it('não salva senha curta nem senhas diferentes', async () => {
    render(<SetPasswordView onDone={vi.fn()} />);
    fill('abc12', 'abc12');
    expect(await screen.findByText('A senha precisa ter pelo menos 8 caracteres.')).toBeTruthy();
    fill('senha-forte-1', 'senha-forte-2');
    expect(await screen.findByText('As senhas não são iguais.')).toBeTruthy();
    expect(backend.updatePassword).not.toHaveBeenCalled();
  });

  it('salva a senha e avisa que terminou', async () => {
    const onDone = vi.fn();
    render(<SetPasswordView onDone={onDone} />);
    fill('senha-forte-1', 'senha-forte-1');
    await waitFor(() => expect(backend.updatePassword).toHaveBeenCalledWith('senha-forte-1'));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it('mostra o erro do servidor e não conclui', async () => {
    backend.updatePassword.mockRejectedValue(new Error('A nova senha precisa ser diferente da anterior.'));
    const onDone = vi.fn();
    render(<SetPasswordView onDone={onDone} />);
    fill('senha-forte-1', 'senha-forte-1');
    expect(await screen.findByText('A nova senha precisa ser diferente da anterior.')).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
  });
});
