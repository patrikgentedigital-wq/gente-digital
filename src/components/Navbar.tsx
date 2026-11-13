import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Moon, Sun, Tv, UserPlus } from 'lucide-react';
import logo from '../assets/gente-digital-logo.svg';
import logoEscuro from '../assets/gente-digital-logo-escuro.svg';
import type { Tab } from './PageHeader';

interface NavbarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  onOpenLeaderModal: () => void;
  onOpenKioskMode?: () => void;
  onOpenMemberForm?: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isAuthenticated?: boolean;
  role?: 'leader' | 'admin' | null;
  onLogout?: () => void;
  /** Erros do sistema ainda abertos; vira um aviso em Gestão e no item Auditoria (só para admin). */
  openErrorCount?: number;
  /** Tema atual e como alternar; sem eles o botão de tema não aparece. */
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenLeaderModal,
  onOpenKioskMode,
  onOpenMemberForm,
  isAuthenticated = false,
  role = null,
  onLogout,
  openErrorCount = 0,
  theme = 'light',
  onToggleTheme,
}) => {
  const primary: Array<{ tab: Tab; label: string; needsAuth?: boolean }> = [
    { tab: 'dashboard', label: 'Visão geral' },
    { tab: 'ranking', label: 'Ranking' },
    { tab: 'teams', label: 'Equipes' },
    { tab: 'leader', label: 'Avaliar', needsAuth: true },
  ];
  const management: Array<{ tab: Tab; label: string; needsAuth?: boolean }> = [
    ...(role === 'admin' ? [{ tab: 'audit' as Tab, label: 'Auditoria' }, { tab: 'leaders' as Tab, label: 'Líderes' }] : []),
    ...(isAuthenticated && role ? [{ tab: 'criteria' as Tab, label: 'Perguntas' }] : []),
    ...(role === 'admin'
      ? [{ tab: 'success' as Tab, label: 'Sucesso do Cliente' }, { tab: 'assistant' as Tab, label: 'Assistente' }]
      : []),
  ];
  // Com um item só (o líder vê só Perguntas), um menu não ajuda: o item fica direto na barra.
  const useMenu = management.length >= 2;
  const inline = useMenu ? primary : [...primary, ...management];
  const showErrors = role === 'admin' && openErrorCount > 0;
  const managementActive = management.some((item) => item.tab === activeTab);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    const onPointer = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [menuOpen]);

  const handleSelect = (tab: Tab, needsAuth?: boolean) => {
    setMenuOpen(false);
    if (needsAuth && !isAuthenticated) onOpenLeaderModal();
    else setActiveTab(tab);
  };

  const errorBadge = showErrors ? (
    <span
      aria-label={`${openErrorCount} ${openErrorCount === 1 ? 'erro aberto' : 'erros abertos'}`}
      className="ml-1.5 inline-flex min-w-4 h-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white"
    >
      {openErrorCount}
    </span>
  ) : null;

  const tabClass = (active: boolean) =>
    `whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-accent ${
      active ? 'bg-band-ink text-band' : 'text-ink hover:bg-surface-2'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b-2 border-block-edge bg-surface">
      <div className="max-w-[1040px] mx-auto px-6 min-h-14 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-1.5">
        <img src={theme === 'dark' ? logoEscuro : logo} alt="Gente Digital" className="h-9 w-auto" />

        <nav
          aria-label="Principal"
          className="order-3 md:order-none w-full md:w-auto flex items-center gap-1 -mx-2 md:mx-0 px-2 md:px-0"
        >
          <div className="flex items-center gap-1 overflow-x-auto">
            {inline.map(({ tab, label, needsAuth }) => (
              <button
                key={tab}
                type="button"
                aria-current={activeTab === tab ? 'page' : undefined}
                onClick={() => handleSelect(tab, needsAuth)}
                className={tabClass(activeTab === tab)}
              >
                {label}
                {tab === 'audit' && errorBadge}
              </button>
            ))}
          </div>

          {useMenu && (
            <div ref={menuRef} className="relative shrink-0">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
                className={`${tabClass(managementActive)} inline-flex items-center gap-1`}
              >
                Gestão
                {errorBadge}
                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
              {menuOpen && (
                <div role="menu" className="blk absolute right-0 md:left-0 md:right-auto mt-2 min-w-48 p-1.5 z-50">
                  {management.map(({ tab, label }) => (
                    <button
                      key={tab}
                      type="button"
                      role="menuitem"
                      aria-current={activeTab === tab ? 'page' : undefined}
                      onClick={() => handleSelect(tab)}
                      className={`${tabClass(activeTab === tab)} w-full text-left flex items-center`}
                    >
                      {label}
                      {tab === 'audit' && errorBadge}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="flex items-center gap-1.5">
          {onOpenMemberForm && (
            <button
              type="button"
              onClick={onOpenMemberForm}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Novo colaborador</span>
            </button>
          )}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              className="flex items-center rounded-full px-2.5 py-1.5 text-ink hover:bg-surface-2 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          )}
          {onOpenKioskMode && (
            <button
              type="button"
              onClick={onOpenKioskMode}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <Tv className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Modo TV</span>
            </button>
          )}
          {isAuthenticated && onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              aria-label="Encerrar sessão"
              className="rounded-lg border-2 border-block-edge px-3 py-1 text-xs font-bold text-ink hover:bg-surface-2 transition-colors cursor-pointer"
            >
              Sair{role ? ` · ${role === 'admin' ? 'Admin' : 'Líder'}` : ''}
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenLeaderModal}
              className="rounded-brand bg-band-ink px-3.5 py-1.5 text-xs font-bold text-band transition-colors cursor-pointer"
            >
              Entrar
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
