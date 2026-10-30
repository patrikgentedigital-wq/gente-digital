// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Navbar } from './Navbar';

afterEach(() => cleanup());

const baseProps = {
  activeTab: 'ranking' as const,
  setActiveTab: vi.fn(),
  onOpenLeaderModal: vi.fn(),
  searchQuery: '',
  setSearchQuery: vi.fn(),
  isAuthenticated: true,
  onLogout: vi.fn(),
};

describe('Navbar tema', () => {
  it('mostra o botão de modo escuro e chama a troca ao clicar', () => {
    const onToggleTheme = vi.fn();
    render(<Navbar {...baseProps} role="admin" theme="light" onToggleTheme={onToggleTheme} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ativar modo escuro' }));
    expect(onToggleTheme).toHaveBeenCalledTimes(1);
  });

  it('no escuro o botão oferece voltar ao claro; sem a troca, o botão não aparece', () => {
    const { unmount } = render(<Navbar {...baseProps} role="admin" theme="dark" onToggleTheme={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Ativar modo claro' })).toBeTruthy();
    unmount();
    render(<Navbar {...baseProps} role="admin" />);
    expect(screen.queryByRole('button', { name: /modo (claro|escuro)/ })).toBeNull();
  });
});

describe('Navbar', () => {
  it('mostra no menu Auditoria quantos erros do sistema estão abertos (só para admin)', () => {
    render(<Navbar {...baseProps} role="admin" openErrorCount={3} />);
    expect(screen.getByLabelText('3 erros abertos')).toBeTruthy();
  });

  it('não mostra o aviso quando não há erros ou quando a pessoa não é admin', () => {
    const { unmount } = render(<Navbar {...baseProps} role="admin" openErrorCount={0} />);
    expect(screen.queryByLabelText(/erros? abertos?/)).toBeNull();
    unmount();
    render(<Navbar {...baseProps} role="leader" openErrorCount={5} />);
    expect(screen.queryByLabelText(/erros? abertos?/)).toBeNull();
  });
});
