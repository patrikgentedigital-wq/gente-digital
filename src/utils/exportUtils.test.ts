import { describe, it, expect } from 'vitest';
import { buildMembersCSVContent } from './exportUtils';
import { TeamMember } from '../types';

const mockMembers: TeamMember[] = [
  {
    id: 'emp-1',
    name: 'Patrik Teste',
    role: 'Analista',
    team: 'Djemerson',
    teamColor: '#3B6FE0',
    rank: 1,
    score: 154,
    maxScore: 155,
    status: 'Voando',
    avatarUrl: 'https://example.com/patrik.jpg',
    evaluationStatus: 'Concluído',
    email: 'patrik@gentedigital.com.br',
    pdiGoals: [
      { id: '1', title: 'Meta 1', deadline: '30 dias', status: 'completed' },
      { id: '2', title: 'Meta 2', deadline: '60 dias', status: 'pending' },
    ],
  },
  {
    id: 'emp-2',
    name: 'Mayson "NOC"',
    role: 'Técnico',
    team: 'Alexandre',
    teamColor: '#D9A02B',
    rank: 2,
    score: 148,
    maxScore: 155,
    status: 'Voando',
    avatarUrl: 'https://example.com/mayson.jpg',
    evaluationStatus: 'Forms Respondido',
    email: 'mayson@gentedigital.com.br',
  },
];

describe('exportUtils - buildMembersCSVContent', () => {
  it('returns empty string when members array is empty', () => {
    expect(buildMembersCSVContent([])).toBe('');
  });

  it('generates formatted CSV with correct headers and rows', () => {
    const csv = buildMembersCSVContent(mockMembers);
    const lines = csv.split('\r\n');

    expect(lines.length).toBe(3); // Header + 2 data lines
    expect(lines[0]).toContain('Posição (Rank);Nome;Cargo;Equipe / Líder;Pontuação Atual');

    // Line 1 checks
    expect(lines[1]).toContain('1;"Patrik Teste";"Analista";"Djemerson";154;155;"Voando";"Concluído";"patrik@gentedigital.com.br";1;2');

    // Line 2 checks (proper quotes escaping)
    expect(lines[2]).toContain('2;"Mayson ""NOC""";"Técnico";"Alexandre";148;155;"Voando";"Forms Respondido";"mayson@gentedigital.com.br";0;0');
  });

  it('neutralizes formula injection characters (=, +, -, @)', () => {
    const maliciousMember: TeamMember = {
      id: 'emp-malicious',
      name: '=cmd|’ /C calc’!A0',
      role: '+12345',
      team: 'Alexandre',
      teamColor: '#D9A02B',
      rank: 1,
      score: 100,
      maxScore: 155,
      status: 'Alarme',
      avatarUrl: 'https://example.com/avatar.jpg',
      evaluationStatus: 'Pendente',
      email: '@evil.com',
    };

    const csv = buildMembersCSVContent([maliciousMember]);
    const line = csv.split('\r\n')[1];

    expect(line).toContain(`"'=cmd|’ /C calc’!A0"`);
    expect(line).toContain(`"'+12345"`);
    expect(line).toContain(`"'@evil.com"`);
  });
});
