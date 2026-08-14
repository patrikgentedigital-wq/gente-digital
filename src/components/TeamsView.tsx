import React from 'react';
import { TeamMember } from '../types';
import { TEAMS } from '../data/initialData';
import { Users, Award, ChevronRight, Image as ImageIcon } from 'lucide-react';

interface TeamsViewProps {
  members: TeamMember[];
  onOpenImageModal: (member: TeamMember) => void;
  onSelectTeamFilter: (team: string) => void;
  onSelectMemberForDetail?: (member: TeamMember) => void;
}

export const TeamsView: React.FC<TeamsViewProps> = ({
  members,
  onOpenImageModal,
  onSelectTeamFilter,
  onSelectMemberForDetail,
}) => {
  return (
    <div className="w-full max-w-[1040px] mx-auto pb-16 font-sans">
      {/* Header */}
      <div className="border-b border-[#22365C] pb-5 mb-7">
        <h2 className="text-2xl font-display font-bold text-white tracking-tight">Desempenho por Equipes</h2>
        <p className="text-xs text-[#A9B7CE] mt-1">
          Visão consolidada de performance, lideranças e destaques individuais por time.
        </p>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {TEAMS.map((teamStruct) => {
          const teamMembers = members.filter((m) => m.team === teamStruct.leader);
          if (teamMembers.length === 0) return null;

          const avgScore = Math.round(
            teamMembers.reduce((acc, m) => acc + m.score, 0) / teamMembers.length
          );

          const topPerformer = [...teamMembers].sort((a, b) => b.score - a.score)[0];

          return (
            <div
              key={teamStruct.leader}
              className="bg-[#0F1E38] border border-[#22365C] rounded-2xl p-5 flex flex-col justify-between gap-5 hover:border-[#E3A73B]/50 transition-all shadow-xl group"
            >
              <div>
                {/* Title & Leader */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-display font-bold text-white group-hover:text-[#E3A73B] transition-colors">
                      Time {teamStruct.leader}
                    </h3>
                    <p className="text-xs text-[#A9B7CE] flex items-center gap-1 mt-0.5">
                      <Users className="w-3.5 h-3.5 text-[#E3A73B]" />
                      {teamMembers.length} {teamMembers.length === 1 ? 'Membro' : 'Membros'}
                    </p>
                  </div>

                  <div className="bg-[#0A1424] border border-[#22365C] px-3 py-1.5 rounded-xl text-right">
                    <span className="text-[10px] font-mono text-[#6C7C99] block">MÉDIA</span>
                    <span className="text-base font-bold font-mono text-[#E3A73B]">{avgScore}</span>
                  </div>
                </div>

                {/* Top Performer Card */}
                {topPerformer && (
                  <div className="bg-[#0A1424] border border-[#22365C] rounded-xl p-3 flex items-center gap-3">
                    <div className="relative group/avatar shrink-0">
                      <img
                        src={topPerformer.avatarUrl}
                        alt={topPerformer.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full object-cover border-2 border-[#E3A73B] bg-[#14294A]"
                      />
                      <button
                        onClick={() => onOpenImageModal(topPerformer)}
                        className="absolute -bottom-1 -right-1 bg-[#E3A73B] text-[#1a1200] p-1 rounded-full shadow hover:scale-110 transition-all font-bold"
                        title="Link da Foto"
                      >
                        <ImageIcon className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-[#E3A73B] uppercase font-mono">
                        <Award className="w-3 h-3" /> Destaque
                      </div>
                      <button
                        onClick={() => onSelectMemberForDetail?.(topPerformer)}
                        className="text-xs font-bold text-white truncate hover:text-[#E3A73B] hover:underline cursor-pointer block text-left"
                        title="Ver Gráfico de Desempenho"
                      >
                        {topPerformer.name}
                      </button>
                      <div className="text-[11px] text-[#6C7C99] font-mono">{topPerformer.score} pts</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Members Avatars Row */}
              <div className="flex items-center justify-between border-t border-[#22365C] pt-3.5">
                <div className="flex -space-x-2">
                  {teamMembers.map((m) => (
                    <img
                      key={m.id}
                      src={m.avatarUrl}
                      alt={m.name}
                      referrerPolicy="no-referrer"
                      title={`${m.name} (${m.score} pts) - Clique para ver o gráfico`}
                      onClick={() => onSelectMemberForDetail?.(m)}
                      className="w-7 h-7 rounded-full border-2 border-[#0F1E38] object-cover bg-[#0A1424] hover:scale-110 hover:z-10 transition-transform cursor-pointer"
                    />
                  ))}
                </div>

                <button
                  onClick={() => onSelectTeamFilter(teamStruct.leader)}
                  className="text-xs font-bold font-mono text-[#E3A73B] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Filtrar <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
