import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TeamMember } from '../../types';

const fake = vi.hoisted(() => ({
  rpc: vi.fn(),
  evaluationResult: { data: null as unknown, error: null as unknown },
  profileResult: { data: null as unknown, error: null as unknown },
}));

vi.mock('./client', () => ({
  getSupabase: () => ({
    rpc: fake.rpc,
    from: (table: string) => {
      const result = () => (table === 'evaluations' ? fake.evaluationResult : fake.profileResult);
      const chain = { select: () => chain, eq: () => chain, maybeSingle: async () => result() };
      return chain;
    },
  }),
}));

import {
  describeEvaluationError,
  getEvaluationFromFirestore,
  isEvaluationConflictError,
  isEvaluationCriteriaOutdatedError,
  saveEvaluationAndMemberInFirestore,
  type EvaluationPayload,
} from './evaluations';

const member = { id: 'ana_ta', name: 'Ana' } as TeamMember;
const evaluation: EvaluationPayload = {
  id: 'evaluation_ana_ta_out',
  memberId: 'ana_ta',
  memberName: 'Ana',
  leaderName: 'Brenda',
  score: 12,
  status: 'Atenção',
  cycle: 'Outubro/2026',
  comments: 'Bom ciclo',
  pdiGoals: [],
  criteriaScores: { '1-0': 5, '1-1': 4, '2-0': 3 },
};

beforeEach(() => {
  vi.clearAllMocks();
  fake.evaluationResult = { data: null, error: null };
  fake.profileResult = { data: null, error: null };
});

describe('saveEvaluationAndMemberInFirestore', () => {
  it('envia as notas ao servidor e devolve o resultado calculado por ele', async () => {
    fake.rpc.mockResolvedValue({ data: { id: 'x', revision: 2, score: 12, max_score: 15, status: 'Atenção' }, error: null });
    const saved = await saveEvaluationAndMemberInFirestore({ member, evaluation, expectedRevision: 1 });
    expect(fake.rpc).toHaveBeenCalledWith('save_evaluation', {
      p_member_id: 'ana_ta',
      p_cycle: 'Outubro/2026',
      p_scores: evaluation.criteriaScores,
      p_comments: 'Bom ciclo',
      p_pdi_goals: [],
      p_expected_revision: 1,
    });
    expect(saved).toEqual({ revision: 2, score: 12, maxScore: 15, status: 'Atenção' });
  });

  it('reconhece conflito de revisão', async () => {
    fake.rpc.mockResolvedValue({ data: null, error: { message: 'conflito_de_revisao' } });
    const failure = await saveEvaluationAndMemberInFirestore({ member, evaluation }).catch((error) => error);
    expect(isEvaluationConflictError(failure)).toBe(true);
    expect(isEvaluationCriteriaOutdatedError(failure)).toBe(false);
  });

  it('reconhece perguntas desatualizadas', async () => {
    fake.rpc.mockResolvedValue({ data: null, error: { message: 'perguntas_desatualizadas' } });
    const failure = await saveEvaluationAndMemberInFirestore({ member, evaluation }).catch((error) => error);
    expect(isEvaluationCriteriaOutdatedError(failure)).toBe(true);
    expect(isEvaluationConflictError(failure)).toBe(false);
    expect(describeEvaluationError(failure)).toBe('As perguntas da equipe mudaram. Recarregue a avaliação.');
  });
});

describe('describeEvaluationError', () => {
  it.each([
    ['sem_permissao', 'Você não tem permissão para avaliar este membro.'],
    ['membro_indisponivel', 'Este membro não está disponível para avaliação.'],
    ['equipe_sem_perguntas', 'Esta equipe ainda não tem perguntas.'],
    ['nota_invalida', 'Há uma nota inválida. Use números inteiros de 0 a 5.'],
  ])('traduz %s', (code, text) => {
    expect(describeEvaluationError(new Error(code))).toBe(text);
  });

  it('devolve null para erros desconhecidos', () => {
    expect(describeEvaluationError(new Error('algo estranho'))).toBeNull();
  });
});

describe('getEvaluationFromFirestore', () => {
  it('monta a avaliação com o nome do membro e do líder', async () => {
    fake.evaluationResult = {
      data: {
        id: 'evaluation_ana_ta_out', member_id: 'ana_ta', cycle: 'Outubro/2026', scores: { '1-0': 5 }, score: 12,
        status: 'Atenção', comments: 'ok', pdi_goals: [], leader_id: 'u1', revision: 2,
        created_at: '2026-10-27T10:00:00Z', updated_at: '2026-10-28T10:00:00Z', members: { name: 'Ana' },
      },
      error: null,
    };
    fake.profileResult = { data: { name: 'Brenda' }, error: null };
    expect(await getEvaluationFromFirestore('evaluation_ana_ta_out')).toEqual({
      id: 'evaluation_ana_ta_out', memberId: 'ana_ta', memberName: 'Ana', leaderName: 'Brenda', score: 12,
      status: 'Atenção', cycle: 'Outubro/2026', comments: 'ok', pdiGoals: [], criteriaScores: { '1-0': 5 },
      revision: 2, createdAt: '2026-10-27T10:00:00Z', updatedAt: '2026-10-28T10:00:00Z',
    });
  });

  it('devolve null quando a avaliação não existe', async () => {
    expect(await getEvaluationFromFirestore('nao-existe')).toBeNull();
  });
});
