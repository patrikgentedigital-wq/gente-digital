import { describe, expect, it } from 'vitest';
import { rowToAuditLog, rowToTeam, rowToTeamMember, type AuditRow, type MemberRow, type TeamRow } from './mappers';

const row: MemberRow = {
  id: 'ana_ta',
  name: 'Ana',
  job_title: 'Analista de NOC',
  team_id: 'Mariza Leite',
  team_color: '#E11D48',
  avatar_url: '',
  email: 'ana@empresa.com',
  evaluation_status: 'Concluído',
  score: 132,
  max_score: 155,
  status: 'Caminho Certo',
  current_rating: 4.5,
  history: [{ month: 'Out', score: 132 }],
  pdi_goals: [],
  rank: 3,
};

describe('rowToTeamMember', () => {
  it('traduz os campos do banco para o formato do app', () => {
    expect(rowToTeamMember(row)).toEqual({
      id: 'ana_ta',
      name: 'Ana',
      role: 'Analista de NOC',
      team: 'Mariza Leite',
      teamColor: '#E11D48',
      rank: 3,
      score: 132,
      maxScore: 155,
      status: 'Caminho Certo',
      avatarUrl: '',
      evaluationStatus: 'Concluído',
      email: 'ana@empresa.com',
      currentRating: 4.5,
      history: [{ month: 'Out', score: 132 }],
      pdiGoals: [],
      evaluationHistory: [],
      deleted: false,
    });
  });

  it('usa a cor da equipe embutida e cai numa cor neutra quando não há nenhuma', () => {
    const { team_color: _ignored, ...withoutColor } = row;
    expect(rowToTeamMember({ ...withoutColor, teams: { color: '#16A34A' } }).teamColor).toBe('#16A34A');
    expect(rowToTeamMember(withoutColor).teamColor).toBe('#86868b');
  });

  it('marca arquivado, sem posição no ranking, e troca listas inválidas por vazias', () => {
    const archived = rowToTeamMember({ ...row, rank: undefined, deleted_at: '2026-10-27T10:00:00Z', history: null, pdi_goals: 'x', current_rating: null });
    expect(archived.deleted).toBe(true);
    expect(archived.rank).toBe(0);
    expect(archived.history).toEqual([]);
    expect(archived.pdiGoals).toEqual([]);
    expect(archived.currentRating).toBeUndefined();
  });
});

describe('rowToTeam', () => {
  it('usa o id da equipe como nome do líder e guarda a cor', () => {
    const team: TeamRow = { id: 'João Lucas', name: 'João Lucas', color: '#16A34A', active: true };
    expect(rowToTeam(team)).toEqual({ leader: 'João Lucas', color: '#16A34A', members: [] });
  });
});

describe('rowToAuditLog', () => {
  const log: AuditRow = {
    id: 7,
    action: 'evaluation_saved',
    evaluation_id: 'evaluation_ana_ta_out',
    member_id: 'ana_ta',
    member_name: 'Ana',
    cycle: 'Out',
    revision: 2,
    score: 130,
    max_score: 155,
    status: 'Atenção',
    previous_score: 120,
    previous_status: 'Atenção',
    actor_id: 'u1',
    created_at: '2026-10-27T10:00:00Z',
  };

  it('monta o registro de auditoria com o nome de quem salvou', () => {
    const mapped = rowToAuditLog(log, { u1: 'Brenda' });
    expect(mapped).toMatchObject({
      id: '7', action: 'evaluation_saved', evaluationId: 'evaluation_ana_ta_out', memberId: 'ana_ta',
      memberName: 'Ana', cycle: 'Out', revision: 2, score: 130, status: 'Atenção',
      previousScore: 120, previousStatus: 'Atenção', actorId: 'u1', actorName: 'Brenda', actorEmail: '',
      createdAt: '2026-10-27T10:00:00Z',
    });
  });

  it('aceita campos vazios e status desconhecido', () => {
    const mapped = rowToAuditLog({ ...log, evaluation_id: null, previous_score: null, previous_status: null, status: 'x', actor_id: null }, {});
    expect(mapped.evaluationId).toBe('');
    expect(mapped.previousScore).toBeUndefined();
    expect(mapped.previousStatus).toBeUndefined();
    expect(mapped.status).toBe('Atenção');
    expect(mapped.actorId).toBe('');
  });
});
