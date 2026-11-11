import { TeamMember, Badge } from '../types';
import { getDefaultEvaluationCycle } from '../lib/evaluation';
import { isEvaluated, percentOf, scaleScore } from '../lib/scoring';

const getCurrentCycleLabel = () => `Ciclo ${getDefaultEvaluationCycle()}`;

export function getMemberBadges(member: TeamMember, allMembers: TeamMember[] = []): Badge[] {
  // As metas dos selos foram definidas em pontos de 155. Cada pessoa pode usar um conjunto de perguntas com
  // outro máximo (150, 175...), então a pontuação é levada para a escala de 155 antes de comparar.
  const on155 = scaleScore(member.score, member.maxScore, 155);
  const myPercent = percentOf(member.score, member.maxScore);

  // Só quem foi avaliado disputa a coroa: sem isso, um empate em 0% dava a coroa a todos.
  const evaluated = isEvaluated(member);
  const evaluatedTeammates = allMembers.filter((m) => m.team === member.team && isEvaluated(m));
  const isTeamLeader =
    evaluated &&
    myPercent > 0 &&
    evaluatedTeammates.every((m) => percentOf(m.score, m.maxScore) <= myPercent);
  const onPodium = evaluated && member.rank <= 3;

  const previous = member.history && member.history.length >= 2 ? member.history[member.history.length - 2] : undefined;
  const prevScore = previous ? scaleScore(previous.score, previous.max, member.maxScore) : undefined;
  const isGrowth =
    (member.previousRank !== undefined && member.rank < member.previousRank) ||
    (prevScore !== undefined && member.score > prevScore);

  const historyConsistent =
    member.history && member.history.length >= 2
      ? member.history.every((h) => scaleScore(h.score, h.max, 155) >= 135)
      : on155 >= 135;

  const badges: Badge[] = [
    {
      id: 'top_performer',
      name: 'Top Performer',
      description: 'Pontuação extraordinária: 150 de 155 pontos ou o equivalente proporcional.',
      iconName: 'Trophy',
      category: 'performance',
      rarity: 'diamond',
      unlocked: on155 >= 150,
      unlockedAt: on155 >= 150 ? getCurrentCycleLabel() : undefined,
      progress: {
        current: Math.round(Math.min(on155, 150)),
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
      unlocked: onPodium,
      unlockedAt: onPodium ? getCurrentCycleLabel() : undefined,
      progress: {
        current: member.rank <= 3 ? 3 : Math.max(0, 4 - member.rank),
        max: 3,
      },
    },
    {
      id: 'flying',
      name: 'Nível Voando',
      description: 'Superou a meta máxima de desempenho (acima de 140 de 155 pontos, em proporção).',
      iconName: 'Rocket',
      category: 'performance',
      rarity: 'gold',
      unlocked: on155 > 140,
      unlockedAt: on155 > 140 ? getCurrentCycleLabel() : undefined,
      progress: {
        current: Math.round(Math.min(on155, 140)),
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
      description: 'Manteve desempenho elevado (acima de 135 de 155 pontos, em proporção) de forma contínua.',
      iconName: 'Star',
      category: 'performance',
      rarity: 'gold',
      unlocked: historyConsistent,
      unlockedAt: historyConsistent ? 'Últimos 3 meses' : undefined,
    },
    {
      id: 'excellence_path',
      name: 'Trilha da Excelência',
      description: 'Alcançou no mínimo 130 de 155 pontos (ou o equivalente proporcional) na avaliação do ciclo.',
      iconName: 'TrendingUp',
      category: 'growth',
      rarity: 'silver',
      unlocked: on155 >= 130,
      unlockedAt: on155 >= 130 ? getDefaultEvaluationCycle() : undefined,
      progress: {
        current: Math.round(Math.min(on155, 130)),
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
