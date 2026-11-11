import { describe, it, expect } from 'vitest';
import { getMemberBadges } from './badgeUtils';
import { TeamMember } from '../types';

const mockMember: TeamMember = {
  id: 'emp-1',
  name: 'Patrik',
  role: 'Analista de Redes',
  team: 'Djemerson',
  teamColor: '#3B6FE0',
  rank: 1,
  previousRank: 2,
  score: 152,
  maxScore: 155,
  status: 'Voando',
  avatarUrl: 'https://example.com/avatar.jpg',
  evaluationStatus: 'Concluído',
  email: 'patrik@example.com',
  history: [
    { month: 'Jul', score: 145 },
    { month: 'Ago', score: 152 },
  ],
};

const mockPeer: TeamMember = {
  id: 'emp-2',
  name: 'Colega',
  role: 'Técnico',
  team: 'Djemerson',
  teamColor: '#3B6FE0',
  rank: 5,
  score: 130,
  maxScore: 155,
  status: 'Caminho Certo',
  avatarUrl: 'https://example.com/avatar2.jpg',
  evaluationStatus: 'Pendente',
  email: 'colega@example.com',
};

describe('badgeUtils - getMemberBadges', () => {
  it('unlocks top_performer when score >= 150', () => {
    const badges = getMemberBadges(mockMember, [mockMember, mockPeer]);
    const topPerformer = badges.find((b) => b.id === 'top_performer');
    expect(topPerformer?.unlocked).toBe(true);
  });

  it('unlocks podium when rank <= 3', () => {
    const badges = getMemberBadges(mockMember, [mockMember, mockPeer]);
    const podium = badges.find((b) => b.id === 'podium');
    expect(podium?.unlocked).toBe(true);
  });

  it('unlocks team_leader when member has highest score in team', () => {
    const badges = getMemberBadges(mockMember, [mockMember, mockPeer]);
    const teamLeader = badges.find((b) => b.id === 'team_leader');
    expect(teamLeader?.unlocked).toBe(true);

    const peerBadges = getMemberBadges(mockPeer, [mockMember, mockPeer]);
    const peerTeamLeader = peerBadges.find((b) => b.id === 'team_leader');
    expect(peerTeamLeader?.unlocked).toBe(false);
  });

  it('unlocks forms_completed when evaluationStatus is Concluído', () => {
    const badges = getMemberBadges(mockMember, [mockMember, mockPeer]);
    const formsCompleted = badges.find((b) => b.id === 'forms_completed');
    expect(formsCompleted?.unlocked).toBe(true);

    const peerBadges = getMemberBadges(mockPeer, [mockMember, mockPeer]);
    const peerForms = peerBadges.find((b) => b.id === 'forms_completed');
    expect(peerForms?.unlocked).toBe(false);
  });
});

describe('badgeUtils - conjuntos com máximos diferentes', () => {
  const member = (over: Partial<TeamMember>): TeamMember => ({ ...mockMember, history: undefined, previousRank: undefined, ...over });

  it('compara a pontuação em proporção ao máximo, não em pontos brutos', () => {
    const big = member({ score: 150, maxScore: 175 }); // 85,7% ~ 132,9 de 155
    const badges = getMemberBadges(big, [big]);
    expect(badges.find((b) => b.id === 'top_performer')?.unlocked).toBe(false);
    expect(badges.find((b) => b.id === 'flying')?.unlocked).toBe(false);
    expect(badges.find((b) => b.id === 'excellence_path')?.unlocked).toBe(true);
  });

  it('quem tem máximo menor não é prejudicado', () => {
    const small = member({ score: 140, maxScore: 150 }); // 93,3% ~ 144,7 de 155
    const badges = getMemberBadges(small, [small]);
    expect(badges.find((b) => b.id === 'flying')?.unlocked).toBe(true);
    expect(badges.find((b) => b.id === 'top_performer')?.unlocked).toBe(false);
    const perfect = member({ score: 150, maxScore: 150 });
    expect(getMemberBadges(perfect, [perfect]).find((b) => b.id === 'top_performer')?.unlocked).toBe(true);
  });

  it('o destaque do time é quem tem o maior percentual', () => {
    const a = member({ id: 'a', score: 120, maxScore: 150 }); // 80%
    const b = member({ id: 'b', score: 125, maxScore: 175 }); // 71%
    expect(getMemberBadges(a, [a, b]).find((x) => x.id === 'team_leader')?.unlocked).toBe(true);
    expect(getMemberBadges(b, [a, b]).find((x) => x.id === 'team_leader')?.unlocked).toBe(false);
  });

  it('a evolução compara com o ciclo anterior na mesma escala', () => {
    const grew = member({ score: 140, maxScore: 150, history: [{ month: 'Out/2026', score: 160, max: 175 }, { month: 'Nov/2026', score: 140, max: 150 }] });
    // 160/175 = 91,4% ; 140/150 = 93,3% -> subiu
    expect(getMemberBadges(grew, [grew]).find((b) => b.id === 'rapid_growth')?.unlocked).toBe(true);
    const fell = member({ score: 130, maxScore: 150, history: [{ month: 'Out/2026', score: 160, max: 175 }, { month: 'Nov/2026', score: 130, max: 150 }] });
    expect(getMemberBadges(fell, [fell]).find((b) => b.id === 'rapid_growth')?.unlocked).toBe(false);
  });
});
