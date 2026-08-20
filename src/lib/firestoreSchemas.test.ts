import { describe, expect, it } from 'vitest';
import { CRITERIA_SCORE_KEYS } from './evaluation';
import {
  FirestoreDataValidationError,
  parseEvaluationPayload,
  parseTeamMember,
} from './firestoreSchemas';

const validMember = {
  id: 'member-1',
  name: 'Patrik',
  role: 'Analista de Redes',
  team: 'Djemerson',
  teamColor: '#3B6FE0',
  rank: 1,
  score: 135,
  maxScore: 155,
  status: 'Caminho Certo',
  avatarUrl: 'https://example.com/avatar.jpg',
  evaluationStatus: 'Concluído',
  email: 'patrik@example.com',
};

describe('Firestore runtime schemas', () => {
  it('normalizes valid member defaults and rejects a document id mismatch', () => {
    const parsed = parseTeamMember(validMember, 'member-1');

    expect(parsed.history).toEqual([]);
    expect(parsed.pdiGoals).toEqual([]);
    expect(() => parseTeamMember(validMember, 'other-member')).toThrow(FirestoreDataValidationError);
  });

  it('rejects a member whose status does not match the score', () => {
    expect(() => parseTeamMember({ ...validMember, status: 'Voando' }, validMember.id))
      .toThrow(FirestoreDataValidationError);
  });

  it('requires complete criteria and defaults an old evaluation revision to zero', () => {
    const criteriaScores = Object.fromEntries(CRITERIA_SCORE_KEYS.map((key) => [key, 5]));
    const parsed = parseEvaluationPayload({
      id: 'evaluation_member-1_janeiro_2026',
      memberId: validMember.id,
      memberName: validMember.name,
      leaderName: 'Djemerson',
      score: 155,
      status: 'Voando',
      cycle: 'Janeiro/2026',
      comments: 'Ótimo ciclo.',
      pdiGoals: [],
      criteriaScores,
    }, 'evaluation_member-1_janeiro_2026');

    expect(parsed.revision).toBe(0);
  });

  it('rejects incomplete criteria maps before they reach the UI', () => {
    expect(() => parseEvaluationPayload({
      ...validMember,
      id: 'evaluation_member-1_janeiro_2026',
      memberId: validMember.id,
      memberName: validMember.name,
      leaderName: 'Djemerson',
      cycle: 'Janeiro/2026',
      comments: 'Parcial',
      pdiGoals: [],
      criteriaScores: { '1-0': 5 },
      revision: 1,
    }, 'evaluation_member-1_janeiro_2026')).toThrow(FirestoreDataValidationError);
  });
});
