// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { ToastContainer } from './ToastContainer';
import { toast } from '../utils/toastUtils';

afterEach(() => {
  cleanup();
});

/** O texto precisa ter cor diferente do fundo: antes, "-pale" e "-soft" tinham o mesmo valor nos dois temas. */
function toastBox(message: string) {
  render(<ToastContainer />);
  act(() => {
    if (message.startsWith('erro')) toast.error(message);
    else if (message.startsWith('ok')) toast.success(message);
    else toast.warning(message);
  });
  return screen.getByText(message).closest('[role]') as HTMLElement;
}

describe('avisos na tela', () => {
  it('aviso de erro usa texto escuro sobre fundo claro (e não a mesma cor do fundo)', () => {
    const box = toastBox('erro: link expirado');
    expect(box.className).toContain('bg-danger-soft');
    expect(box.className).toContain('text-danger-ink');
    expect(box.className).not.toContain('text-danger-pale');
  });

  it('aviso de sucesso não usa a cor do fundo no texto', () => {
    const box = toastBox('ok: salvo');
    expect(box.className).toContain('bg-success-soft');
    expect(box.className).not.toContain('text-success-pale');
  });

  it('aviso de alerta não usa a cor do fundo no texto', () => {
    const box = toastBox('alerta: confira');
    expect(box.className).toContain('bg-gold-soft');
    expect(box.className).not.toContain('text-warn-pale');
  });
});
