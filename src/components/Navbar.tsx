import React from 'react';
import { Lock, Trophy, BarChart3, Users, Tv, UserPlus } from 'lucide-react';

interface NavbarProps {
  activeTab: 'ranking' | 'dashboard' | 'teams' | 'leader';
  setActiveTab: (tab: 'ranking' | 'dashboard' | 'teams' | 'leader') => void;
  onOpenLeaderModal: () => void;
  onOpenKioskMode?: () => void;
  onOpenMemberForm?: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenLeaderModal,
  onOpenKioskMode,
  onOpenMemberForm,
}) => {
  return (
    <header className="border-b border-[#22365C] bg-[#0A1424] relative overflow-hidden">
      {/* Subtle radial glow background */}
      <div className="absolute inset-0 bg-[radial-gradient(600px_200px_at_15%_-20%,rgba(227,167,59,0.12),transparent),radial-gradient(500px_200px_at_90%_0%,rgba(59,111,224,0.12),transparent)] pointer-events-none" />

      <div className="max-w-[1040px] mx-auto px-6 pt-7 pb-4 relative flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
        <div>
          {/* Eyebrow */}
          <div className="font-mono text-xs tracking-widest text-[#E3A73B] uppercase mb-2 flex items-center gap-2 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E3A73B] shadow-[0_0_8px_rgba(227,167,59,0.5)]" />
            Gente Digital · Análise de Desempenho
          </div>

          {/* Title */}
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-[#F2F5FA] tracking-tight">
            Quadro de Desempenho
          </h1>

          {/* Subtitle */}
          <p className="text-sm text-[#A9B7CE] mt-1.5 font-sans">
            Ranking e análises de desempenho com base na avaliação validada pela liderança
          </p>
        </div>

        {/* Right Header Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {onOpenKioskMode && (
            <button
              onClick={onOpenKioskMode}
              className="bg-[#0F1E38] hover:bg-[#14294A] hover:border-[#E3A73B] border border-[#22365C] text-[#E3A73B] font-semibold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Abrir Modo Telão / TV para apresentações ao vivo"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Modo TV (Telão)</span>
            </button>
          )}

          {onOpenMemberForm && (
            <button
              onClick={onOpenMemberForm}
              className="bg-[#0F1E38] hover:bg-[#14294A] hover:border-[#4fb579] border border-[#22365C] text-[#4fb579] font-semibold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Cadastrar novo colaborador"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Novo Membro</span>
            </button>
          )}

          <button
            onClick={onOpenLeaderModal}
            className="bg-[#14294A] hover:border-[#E3A73B] hover:text-[#E3A73B] border border-[#22365C] text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-[#E3A73B]" />
            Área do Líder
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="max-w-[1040px] mx-auto px-6 pb-2 relative">
        <nav className="flex items-center gap-2 border-t border-[#22365C]/60 pt-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('ranking')}
            className={`flex items-center gap-2 font-sans font-semibold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ranking'
                ? 'bg-[#E3A73B] text-[#1a1200] font-bold shadow-md'
                : 'text-[#A9B7CE] hover:text-white hover:bg-[#0F1E38]'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Ranking Geral</span>
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 font-sans font-semibold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-[#E3A73B] text-[#1a1200] font-bold shadow-md'
                : 'text-[#A9B7CE] hover:text-white hover:bg-[#0F1E38]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Dashboard Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('teams')}
            className={`flex items-center gap-2 font-sans font-semibold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'teams'
                ? 'bg-[#E3A73B] text-[#1a1200] font-bold shadow-md'
                : 'text-[#A9B7CE] hover:text-white hover:bg-[#0F1E38]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Organograma de Equipes</span>
          </button>

          <button
            onClick={() => setActiveTab('leader')}
            className={`flex items-center gap-2 font-sans font-semibold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'leader'
                ? 'bg-[#E3A73B] text-[#1a1200] font-bold shadow-md'
                : 'text-[#A9B7CE] hover:text-white hover:bg-[#0F1E38]'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Avaliar Integrantes</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
