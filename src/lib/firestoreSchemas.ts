import { z } from 'zod';
import type { EvaluationPayload } from './firebase';
import type { LeaderName, TeamMember } from '../types';
import { CRITERIA_SCORE_KEYS } from './evaluation';

const leaderNames = [
  'Djemerson',
  'Fernanda',
  'Brenda',
  'Alexandre',
  'Alfredo',
  'Vinicius',
  'Hellody',
  'Samile',
  'Diego',
] as const satisfies readonly LeaderName[];

const performanceStatuses = ['Voando', 'Caminho Certo', 'Atenção', 'Alarme'] as const;
const evaluationStatuses = ['Pendente', 'Forms Respondido', 'Concluído'] as const;
const documentIdSchema = z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/);

const pdiGoalSchema = z.object({
  id: documentIdSchema,
  title: z.string().min(1).max(200),
  deadline: z.string().max(100),
  status: z.enum(['pending', 'completed']),
  description: z.string().max(1000).optional(),
}).passthrough();

const historyEntrySchema = z.object({
  month: z.string().min(1).max(64),
  score: z.number().finite().min(0).max(155),
}).passthrough();

const evaluationHistoryEntrySchema = z.object({
  id: documentIdSchema,
  cycle: z.string().min(1).max(64),
  date: z.string().max(64),
  score: z.number().finite().min(0).max(155),
  status: z.enum(performanceStatuses),
  leaderName: z.string().max(100),
  comments: z.string().max(5000),
  criteriaScores: z.record(z.string(), z.number().finite().min(0).max(5)).optional(),
  selfScores: z.record(z.string(), z.number().finite().min(0).max(5)).optional(),
  pdiGoals: z.array(pdiGoalSchema).max(50).optional(),
}).passthrough();

const criteriaScoresSchema = z.record(
  z.string().regex(/^[1-6]-[0-5]$/),
  z.number().finite().min(0).max(5),
);

const completeCriteriaScoresSchema = criteriaScoresSchema.superRefine((scores, context) => {
  for (const key of Object.keys(scores)) {
    if (!CRITERIA_SCORE_KEYS.includes(key)) {
      context.addIssue({
        code: 'custom',
        path: [key],
        message: 'critério desconhecido',
      });
    }
  }
  for (const key of CRITERIA_SCORE_KEYS) {
    if (!(key in scores)) {
      context.addIssue({
        code: 'custom',
        path: [key],
        message: 'critério obrigatório ausente',
      });
    }
  }
});

const statusForScore = (score: number): (typeof performanceStatuses)[number] => {
  if (score > 140) return 'Voando';
  if (score > 130) return 'Caminho Certo';
  if (score >= 120) return 'Atenção';
  return 'Alarme';
};

const teamMemberSchema = z.object({
  id: documentIdSchema,
  name: z.string().min(1).max(100),
  role: z.string().min(1).max(120),
  team: z.enum(leaderNames),
  teamColor: z.string().max(32).default('#3B6FE0'),
  rank: z.number().finite().int().min(1).max(10000),
  previousRank: z.number().finite().int().min(1).max(10000).optional(),
  score: z.number().finite().min(0).max(155),
  maxScore: z.literal(155),
  status: z.enum(performanceStatuses),
  avatarUrl: z.string().max(2048).refine((value) => value === '' || value.startsWith('https://'), {
    message: 'avatarUrl deve usar HTTPS',
  }).default(''),
  evaluationStatus: z.enum(evaluationStatuses),
  email: z.string().max(254).default(''),
  currentRating: z.number().finite().min(0).max(5).optional(),
  history: z.array(historyEntrySchema).max(100).default([]),
  pdiGoals: z.array(pdiGoalSchema).max(50).default([]),
  selfEvaluationScores: criteriaScoresSchema.optional(),
  evaluationHistory: z.array(evaluationHistoryEntrySchema).max(100).default([]),
  updatedAt: z.unknown().optional(),
}).passthrough().superRefine((member, context) => {
  if (member.status !== statusForScore(member.score)) {
    context.addIssue({
      code: 'custom',
      path: ['status'],
      message: 'status não corresponde à pontuação armazenada',
    });
  }
});

const evaluationPayloadSchema = z.object({
  id: documentIdSchema,
  memberId: documentIdSchema,
  memberName: z.string().max(100).default(''),
  leaderName: z.string().max(100).default(''),
  score: z.number().finite().min(0).max(155),
  status: z.enum(performanceStatuses),
  cycle: z.string().min(1).max(64),
  comments: z.string().max(5000),
  pdiGoals: z.array(pdiGoalSchema).max(50).default([]),
  criteriaScores: completeCriteriaScoresSchema,
  selfScores: criteriaScoresSchema.optional(),
  revision: z.number().finite().int().min(0).max(1000000).default(0),
  createdAt: z.unknown().optional(),
  updatedAt: z.unknown().optional(),
}).passthrough().superRefine((evaluation, context) => {
  if (evaluation.status !== statusForScore(evaluation.score)) {
    context.addIssue({
      code: 'custom',
      path: ['status'],
      message: 'status não corresponde à pontuação armazenada',
    });
  }
});

export class FirestoreDataValidationError extends Error {
  constructor(
    public readonly collection: string,
    public readonly documentId: string,
    public readonly issues: z.ZodIssue[],
  ) {
    super(`Dados inválidos em ${collection}/${documentId}`);
    this.name = 'FirestoreDataValidationError';
  }
}

export function parseTeamMember(data: unknown, documentId: string): TeamMember {
  const result = teamMemberSchema.safeParse(data);
  if (!result.success || result.data.id !== documentId) {
    throw new FirestoreDataValidationError(
      'members',
      documentId,
      result.success
        ? [{ code: 'custom', path: ['id'], message: 'id do documento não corresponde ao campo id' }]
        : result.error.issues,
    );
  }

  return result.data as TeamMember;
}

export function parseEvaluationPayload(data: unknown, documentId: string): EvaluationPayload {
  const result = evaluationPayloadSchema.safeParse(data);
  if (!result.success || result.data.id !== documentId) {
    throw new FirestoreDataValidationError(
      'evaluations',
      documentId,
      result.success
        ? [{ code: 'custom', path: ['id'], message: 'id do documento não corresponde ao campo id' }]
        : result.error.issues,
    );
  }

  return result.data as EvaluationPayload;
}

export function validateTeamMember(data: TeamMember): TeamMember {
  return parseTeamMember(data, data.id);
}

export function validateEvaluationPayload(data: EvaluationPayload): EvaluationPayload {
  return parseEvaluationPayload(data, data.id);
}
