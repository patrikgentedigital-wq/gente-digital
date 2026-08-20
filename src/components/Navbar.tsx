import React from 'react';
import { Lock, Trophy, BarChart3, Users, Tv, UserPlus, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  activeTab: 'ranking' | 'dashboard' | 'teams' | 'leader' | 'audit';
  setActiveTab: (tab: 'ranking' | 'dashboard' | 'teams' | 'leader' | 'audit') => void;
  onOpenLeaderModal: () => void;
  onOpenKioskMode?: () => void;
  onOpenMemberForm?: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isAuthenticated?: boolean;
  role?: 'leader' | 'admin' | null;
  onLogout?: () => void;
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
}) => {
  return (
    <header className="border-b border-line bg-app relative overflow-hidden">
      {/* Subtle radial glow background */}
      <div className="absolute inset-0 bg-[radial-gradient(600px_200px_at_15%_-20%,rgba(227,167,59,0.12),transparent),radial-gradient(500px_200px_at_90%_0%,rgba(59,111,224,0.12),transparent)] pointer-events-none" />

      <div className="max-w-[1040px] mx-auto px-6 pt-7 pb-4 relative flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
        <div>
          {/* Eyebrow */}
          <div className="font-mono text-xs tracking-widest text-accent uppercase mb-2 flex items-center gap-2 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(227,167,59,0.5)]" />
            Gente Digital · Análise de Desempenho
          </div>

          {/* Title */}
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-ink tracking-tight">
            Quadro de Desempenho
          </h1>

          {/* Subtitle */}
          <p className="text-sm text-muted mt-1.5 font-sans">
            Ranking e análises de desempenho com base na avaliação validada pela liderança
          </p>
        </div>

        {/* Right Header Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenKioskMode && (
            <button
              type="button"
              onClick={onOpenKioskMode}
              className="bg-surface hover:bg-surface-2 hover:border-accent border border-line text-accent font-semibold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Abrir Modo Telão / TV para apresentações ao vivo"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Modo TV (Telão)</span>
            </button>
          )}

          {onOpenMemberForm && (
            <button
              type="button"
              onClick={onOpenMemberForm}
              className="bg-surface hover:bg-surface-2 hover:border-success border border-line text-success font-semibold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Cadastrar novo colaborador"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Novo Membro</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (isAuthenticated) setActiveTab('leader');
              else onOpenLeaderModal();
            }}
            className="bg-surface-2 hover:border-accent hover:text-accent border border-line text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-accent" />
            {isAuthenticated ? `Sessão do ${role === 'admin' ? 'Admin' : 'Líder'}` : 'Área do Líder'}
          </button>
          {isAuthenticated && onLogout && (
            <button
              type="button"
              onClick={onLogout}
              aria-label="Encerrar sessão"
              className="text-xs text-muted hover:text-white px-2 py-2 rounded-lg"
            >
              Sair
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="max-w-[1040px] mx-auto px-6 pb-2 relative">
        <nav className="flex items-center gap-2 border-t border-line/60 pt-3 overflow-x-auto">
          <button
            type="button"
            aria-current={activeTab === 'ranking' ? 'page' : undefined}
            onClick={() => setActiveTab('ranking')}
            className={`flex items-center gap-2 font-sans font-semibold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ranking'
                ? 'bg-accent text-accent-ink font-bold shadow-md'
                : 'text-muted hover:text-white hover:bg-surface'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Ranking Geral</span>
          </button>

          <button
            type="button"
            aria-current={activeTab === 'dashboard' ? 'page' : undefined}
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 font-sans font-semibold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-accent text-accent-ink font-bold shadow-md'
                : 'text-muted hover:text-white hover:bg-surface'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Dashboard Analytics</span>
          </button>

          <button
            type="button"
            aria-current={activeTab === 'teams' ? 'page' : undefined}
            onClick={() => setActiveTab('teams')}
            className={`flex items-center gap-2 font-sans font-semibold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'teams'
                ? 'bg-accent text-accent-ink font-bold shadow-md'
                : 'text-muted hover:text-white hover:bg-surface'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Organograma de Equipes</span>
          </button>

          <button
            type="button"
            aria-current={activeTab === 'leader' ? 'page' : undefined}
            onClick={() => {
              if (isAuthenticated) setActiveTab('leader');
              else onOpenLeaderModal();
            }}
            className={`flex items-center gap-2 font-sans font-semibold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'leader'
                ? 'bg-accent text-accent-ink font-bold shadow-md'
                : 'text-muted hover:text-white hover:bg-surface'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Avaliar Integrantes</span>
          </button>

          {role === 'admin' && (
            <button
              type="button"
              aria-current={activeTab === 'audit' ? 'page' : undefined}
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 font-sans font-semibold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'audit'
                  ? 'bg-accent text-accent-ink font-bold shadow-md'
                  : 'text-muted hover:text-white hover:bg-surface'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Trilha de Auditoria</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};
