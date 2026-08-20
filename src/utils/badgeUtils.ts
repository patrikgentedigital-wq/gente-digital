import { TeamMember, Badge } from '../types';
import { getDefaultEvaluationCycle } from '../lib/evaluation';

const getCurrentCycleLabel = () => `Ciclo ${getDefaultEvaluationCycle()}`;

export function getMemberBadges(member: TeamMember, allMembers: TeamMember[] = []): Badge[] {
  const teamMembers = allMembers.filter((m) => m.team === member.team);
  const isTeamLeader =
    teamMembers.length > 0 &&
    teamMembers.every((m) => m.score <= member.score);

  const prevScore =
    member.history && member.history.length >= 2
      ? member.history[member.history.length - 2]?.score ?? member.score
      : member.score - 5;
  const isGrowth =
    (member.previousRank !== undefined && member.rank < member.previousRank) ||
    member.score > prevScore;

  const historyConsistent =
    member.history && member.history.length >= 2
      ? member.history.every((h) => h.score >= 135)
      : member.score >= 135;

  const badges: Badge[] = [
    {
      id: 'top_performer',
      name: 'Top Performer',
      description: 'Pontuação extraordinária igual ou superior a 150 pontos.',
      iconName: 'Trophy',
      category: 'performance',
      rarity: 'diamond',
      unlocked: member.score >= 150,
      unlockedAt: member.score >= 150 ? getCurrentCycleLabel() : undefined,
      progress: {
        current: Math.min(member.score, 150),
        max: 150,
      },
    },
    {
      id: 'podium',
      name: 'Pódio de Honra',
      description: 'Conquistou uma das 3 primeiras posições no Ranking Geral.',
      iconName: 'Award',
      category: 'performance',
      rarity: 'gold',
      unlocked: member.rank <= 3,
      unlockedAt: member.rank <= 3 ? getCurrentCycleLabel() : undefined,
      progress: {
        current: member.rank <= 3 ? 3 : Math.max(0, 4 - member.rank),
        max: 3,
      },
    },
    {
      id: 'flying',
      name: 'Nível Voando',
      description: 'Superou a meta máxima de desempenho (>140 pontos).',
      iconName: 'Rocket',
      category: 'performance',
      rarity: 'gold',
      unlocked: member.score > 140,
      unlockedAt: member.score > 140 ? getCurrentCycleLabel() : undefined,
      progress: {
        current: Math.min(member.score, 140),
        max: 140,
      },
    },
    {
      id: 'team_leader',
      name: 'Destaque do Time',
      description: 'Alcançou a maior pontuação individual dentro da sua equipe.',
      iconName: 'Crown',
      category: 'leadership',
      rarity: 'diamond',
      unlocked: isTeamLeader,
      unlockedAt: isTeamLeader ? getCurrentCycleLabel() : undefined,
    },
    {
      id: 'rapid_growth',
      name: 'Evolução Rápida',
      description: 'Subiu de posição no ranking ou aumentou a pontuação no último mês.',
      iconName: 'Zap',
      category: 'growth',
      rarity: 'gold',
      unlocked: isGrowth,
      unlockedAt: isGrowth ? getDefaultEvaluationCycle() : undefined,
    },
    {
      id: 'gold_consistency',
      name: 'Consistência Ouro',
      description: 'Manteve desempenho elevado (>135 pts) de forma contínua.',
      iconName: 'Star',
      category: 'performance',
      rarity: 'gold',
      unlocked: historyConsistent,
      unlockedAt: historyConsistent ? 'Últimos 3 meses' : undefined,
    },
    {
      id: 'excellence_path',
      name: 'Trilha da Excelência',
      description: 'Alcançou no mínimo 130 pontos na avaliação do ciclo.',
      iconName: 'TrendingUp',
      category: 'growth',
      rarity: 'silver',
      unlocked: member.score >= 130,
      unlockedAt: member.score >= 130 ? getDefaultEvaluationCycle() : undefined,
      progress: {
        current: Math.min(member.score, 130),
        max: 130,
      },
    },
    {
      id: 'forms_completed',
      name: 'Avaliador Ativo',
      description: 'Formulário de avaliação de competências validado e concluído.',
      iconName: 'CheckSquare',
      category: 'engagement',
      rarity: 'bronze',
      unlocked:
        member.evaluationStatus === 'Forms Respondido' ||
        member.evaluationStatus === 'Concluído',
      unlockedAt:
        member.evaluationStatus === 'Forms Respondido' ||
        member.evaluationStatus === 'Concluído'
          ? 'Validação Concluída'
          : undefined,
    },
  ];

  return badges;
}
