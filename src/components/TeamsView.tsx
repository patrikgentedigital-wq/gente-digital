import React, { useMemo } from 'react';
import { TeamMember } from '../types';
import { TEAMS } from '../data/catalogData';
import { Avatar } from './Avatar';
import { Users, Award, ChevronRight, Image as ImageIcon } from 'lucide-react';

interface TeamsViewProps {
  members: TeamMember[];
  onOpenImageModal?: (member: TeamMember) => void;
  onSelectTeamFilter: (team: string) => void;
  onSelectMemberForDetail?: (member: TeamMember) => void;
}

export const TeamsView: React.FC<TeamsViewProps> = ({
  members,
  onOpenImageModal,
  onSelectTeamFilter,
  onSelectMemberForDetail,
}) => {
  const activeTeams = useMemo(() => {
    return TEAMS.map((teamStruct) => {
      const teamMembers = members.filter((m) => m.team === teamStruct.leader);
      if (teamMembers.length === 0) return null;

      const avgScore = Math.round(
        teamMembers.reduce((acc, m) => acc + m.score, 0) / teamMembers.length
      );

      const topPerformer = [...teamMembers].sort((a, b) => b.score - a.score)[0];

      return {
        ...teamStruct,
        teamMembers,
        avgScore,
        topPerformer,
      };
    }).filter((t): t is NonNullable<typeof t> => t !== null);
  }, [members]);

  return (
    <div className="w-full max-w-[1040px] mx-auto pb-16 font-sans">
      {/* Header */}
      <div className="border-b border-line pb-5 mb-7">
        <h2 className="text-2xl font-display font-bold text-white tracking-tight">Desempenho por Equipes</h2>
        <p className="text-xs text-muted mt-1">
          Visão consolidada de performance, lideranças e destaques individuais por time.
        </p>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {activeTeams.map((teamStruct) => {
          const { leader, color, teamMembers, avgScore, topPerformer } = teamStruct;

          return (
            <div
              key={leader}
              className="bg-surface border border-line rounded-2xl p-5 flex flex-col justify-between gap-5 hover:border-accent/50 transition-all shadow-xl group"
            >
              <div>
                {/* Title & Leader */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-display font-bold text-white group-hover:text-accent transition-colors">
                      Time {leader}
                    </h3>
                    <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                      <Users className="w-3.5 h-3.5 text-accent" />
                      {teamMembers.length} {teamMembers.length === 1 ? 'Membro' : 'Membros'}
                    </p>
                  </div>

                  <div className="bg-app border border-line px-3 py-1.5 rounded-xl text-right">
                    <span className="text-[10px] font-mono text-faint block">MÉDIA</span>
                    <span className="text-base font-bold font-mono text-accent">{avgScore}</span>
                  </div>
                </div>

                {/* Top Performer Card */}
                {topPerformer && (
                  <div className="bg-app border border-line rounded-xl p-3 flex items-center gap-3">
                    <div className="relative group/avatar shrink-0">
                      <Avatar
                        name={topPerformer.name}
                        src={topPerformer.avatarUrl}
                        teamColor={topPerformer.teamColor || color}
                        size="md"
                        shape="circle"
                        className="border-2 border-accent bg-surface-2"
                      />
                      {onOpenImageModal && (
                        <button
                          type="button"
                          onClick={() => onOpenImageModal(topPerformer)}
                          className="absolute -bottom-1 -right-1 bg-accent text-accent-ink p-1 rounded-full shadow hover:scale-110 transition-all font-bold cursor-pointer"
                          title="Link da Foto"
                        >
                          <ImageIcon className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-accent uppercase font-mono">
                        <Award className="w-3 h-3" /> Destaque
                      </div>
                      <button
                        onClick={() => onSelectMemberForDetail?.(topPerformer)}
                        className="text-xs font-bold text-white truncate hover:text-accent hover:underline cursor-pointer block text-left"
                        title="Ver Gráfico de Desempenho"
                      >
                        {topPerformer.name}
                      </button>
                      <div className="text-[11px] text-faint font-mono">{topPerformer.score} pts</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Members Avatars Row */}
              <div className="flex items-center justify-between border-t border-line pt-3.5">
                <div className="flex -space-x-2">
                  {teamMembers.map((m) => (
                    <span
                      key={m.id}
                      className="inline-block"
                      title={`${m.name} (${m.score} pts) - Clique para ver o gráfico`}
                      onClick={() => onSelectMemberForDetail?.(m)}
                    >
                      <Avatar
                        name={m.name}
                        src={m.avatarUrl}
                        teamColor={m.teamColor || color}
                        size="xs"
                        shape="circle"
                        className="border-2 border-surface bg-app hover:scale-110 hover:z-10 transition-transform cursor-pointer"
                      />
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => onSelectTeamFilter(leader)}
                  className="text-xs font-bold font-mono text-accent hover:underline flex items-center gap-1 cursor-pointer"
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
