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
