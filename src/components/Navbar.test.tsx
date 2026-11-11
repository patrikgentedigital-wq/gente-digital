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

  it('troca o logo para a versão de fundo escuro no tema escuro', () => {
    const { unmount } = render(<Navbar {...baseProps} role="admin" theme="light" onToggleTheme={vi.fn()} />);
    const claro = (screen.getByAltText('Gente Digital') as HTMLImageElement).getAttribute('src');
    unmount();
    render(<Navbar {...baseProps} role="admin" theme="dark" onToggleTheme={vi.fn()} />);
    const escuro = (screen.getByAltText('Gente Digital') as HTMLImageElement).getAttribute('src');
    expect(escuro).not.toBe(claro);
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

describe('Navbar menu Gestão', () => {
  it('admin: menu principal enxuto e as telas de gestão dentro de Gestão', () => {
    render(<Navbar {...baseProps} role="admin" />);
    for (const label of ['Visão geral', 'Ranking', 'Equipes', 'Avaliar']) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
    expect(screen.queryByRole('button', { name: 'Auditoria' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Gestão/ }));
    for (const label of ['Auditoria', 'Perguntas', 'Sucesso do Cliente', 'Assistente']) {
      expect(screen.getByRole('menuitem', { name: new RegExp(label) })).toBeTruthy();
    }
  });

  it('escolher um item de Gestão troca a aba e fecha o menu', () => {
    const setActiveTab = vi.fn();
    render(<Navbar {...baseProps} setActiveTab={setActiveTab} role="admin" />);
    fireEvent.click(screen.getByRole('button', { name: /Gestão/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Assistente' }));
    expect(setActiveTab).toHaveBeenCalledWith('assistant');
    expect(screen.queryByRole('menuitem')).toBeNull();
  });

  it('o aviso de erros aparece no botão Gestão e no item Auditoria', () => {
    render(<Navbar {...baseProps} role="admin" openErrorCount={2} />);
    fireEvent.click(screen.getByRole('button', { name: /Gestão/ }));
    expect(screen.getAllByLabelText('2 erros abertos')).toHaveLength(2);
  });

  it('líder: sem Gestão, Perguntas direto no menu', () => {
    render(<Navbar {...baseProps} role="leader" />);
    expect(screen.queryByRole('button', { name: /Gestão/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Perguntas' })).toBeTruthy();
  });

  it('o botão de cadastro diz Novo colaborador', () => {
    render(<Navbar {...baseProps} role="admin" onOpenMemberForm={vi.fn()} />);
    expect(screen.getByText('Novo colaborador')).toBeTruthy();
    expect(screen.queryByText('Novo membro')).toBeNull();
  });
});
