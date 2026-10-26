import React from 'react';
import { Tv, UserPlus } from 'lucide-react';

type Tab = 'ranking' | 'dashboard' | 'teams' | 'leader' | 'audit';

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
}

const HERO: Record<Tab, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Visão geral',
    subtitle: 'Como o time está indo, em um só lugar.',
  },
  ranking: {
    title: 'Ranking',
    subtitle: 'Pontuação validada pela liderança, da maior para a menor.',
  },
  teams: {
    title: 'Equipes',
    subtitle: 'Quem faz parte de cada equipe e como cada uma está.',
  },
  leader: {
    title: 'Avaliar',
    subtitle: 'Registre a avaliação do ciclo e as metas de desenvolvimento.',
  },
  audit: {
    title: 'Auditoria',
    subtitle: 'Histórico de avaliações salvas e membros arquivados.',
  },
};

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenLeaderModal,
  onOpenKioskMode,
  onOpenMemberForm,
  isAuthenticated = false,
  role = null,
  onLogout,
}) => {
  const items: Array<{ tab: Tab; label: string; needsAuth?: boolean }> = [
    { tab: 'dashboard', label: 'Visão geral' },
    { tab: 'ranking', label: 'Ranking' },
    { tab: 'teams', label: 'Equipes' },
    { tab: 'leader', label: 'Avaliar', needsAuth: true },
    ...(role === 'admin' ? [{ tab: 'audit' as Tab, label: 'Auditoria' }] : []),
  ];

  const handleSelect = (tab: Tab, needsAuth?: boolean) => {
    if (needsAuth && !isAuthenticated) onOpenLeaderModal();
    else setActiveTab(tab);
  };

  const hero = HERO[activeTab];

  return (
    <header>
      <div className="sticky top-0 z-40 border-b border-line-soft bg-surface/75 backdrop-blur-xl backdrop-saturate-150">
        <div className="max-w-[1040px] mx-auto px-6 min-h-12 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-1.5">
          <span className="text-sm font-semibold tracking-tight text-ink">Gente Digital</span>

          <nav aria-label="Principal" className="order-3 md:order-none w-full md:w-auto flex items-center gap-1 overflow-x-auto -mx-2 md:mx-0 px-2 md:px-0">
            {items.map(({ tab, label, needsAuth }) => (
              <button
                key={tab}
                type="button"
                aria-current={activeTab === tab ? 'page' : undefined}
                onClick={() => handleSelect(tab, needsAuth)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-accent ${
                  activeTab === tab
                    ? 'bg-ink text-app font-semibold'
                    : 'text-muted hover:text-ink font-medium'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            {onOpenMemberForm && (
              <button
                type="button"
                onClick={onOpenMemberForm}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted hover:text-ink transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Novo membro</span>
              </button>
            )}
            {onOpenKioskMode && (
              <button
                type="button"
                onClick={onOpenKioskMode}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted hover:text-ink transition-colors cursor-pointer"
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
                className="rounded-full bg-surface-2 px-3.5 py-1.5 text-xs font-medium text-ink hover:bg-line-soft transition-colors cursor-pointer"
              >
                Sair{role ? ` · ${role === 'admin' ? 'Admin' : 'Líder'}` : ''}
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenLeaderModal}
                className="rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-accent-ink hover:bg-accent-hover transition-colors cursor-pointer"
              >
                Entrar
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1040px] mx-auto px-6 pt-14 pb-8 md:pt-20 md:pb-10">
        <h1 className="text-4xl md:text-6xl font-semibold tracking-[-0.03em] leading-[1.05] text-ink">
          {hero.title}
        </h1>
        <p className="mt-3 text-lg md:text-xl text-muted max-w-[34ch] leading-snug">
          {hero.subtitle}
        </p>
      </div>
    </header>
  );
};
