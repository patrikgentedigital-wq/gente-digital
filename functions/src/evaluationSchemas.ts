import { z } from 'zod';

// Schemas de validação do payload do callable saveEvaluation.
// Esta é a camada autoritativa de validação (elemento a elemento) que as
// Firestore Rules não conseguem expressar (rules não possuem list.all()).

export const PERFORMANCE_STATUSES = ['Voando', 'Caminho Certo', 'Atenção', 'Alarme'] as const;
export const EVALUATION_STATUSES = ['Pendente', 'Forms Respondido', 'Concluído'] as const;

const documentIdSchema = z.string().min(1).max(128).regex(/^[a-zA-Z0-9_-]+$/);

const pdiGoalSchema = z.strictObject({
  id: documentIdSchema,
  title: z.string().min(1).max(200),
  deadline: z.string().max(100),
  status: z.enum(['pending', 'completed']),
  description: z.string().max(1000).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const historyEntrySchema = z.strictObject({
  month: z.string().min(1).max(64),
  score: z.number().finite().min(0).max(155),
});

const CRITERIA_KEYS = [
  '1-0', '1-1', '1-2', '1-3', '1-4',
  '2-0', '2-1', '2-2', '2-3', '2-4',
  '3-0', '3-1', '3-2', '3-3', '3-4',
  '4-0', '4-1', '4-2', '4-3', '4-4',
  '5-0', '5-1', '5-2', '5-3', '5-4',
  '6-0', '6-1', '6-2', '6-3', '6-4', '6-5',
] as const;

const criteriaValueSchema = z.number().finite().min(0).max(5);

const completeCriteriaScoresSchema = z
  .record(z.string().regex(/^[1-6]-[0-5]$/), criteriaValueSchema)
  .refine(
    (scores) => CRITERIA_KEYS.every((key) => key in scores),
    { message: 'criteriaScores incompleto: todos os 31 critérios são obrigatórios' },
  );

const partialCriteriaScoresSchema = z.record(
  z.string().regex(/^[1-6]-[0-5]$/),
  criteriaValueSchema,
);

export function statusForScore(score: number): (typeof PERFORMANCE_STATUSES)[number] {
  if (score > 140) return 'Voando';
  if (score > 130) return 'Caminho Certo';
  if (score >= 120) return 'Atenção';
  return 'Alarme';
}

const memberUpdateSchema = z
  .strictObject({
    id: documentIdSchema,
    score: z.number().finite().min(0).max(155),
    status: z.enum(PERFORMANCE_STATUSES),
    evaluationStatus: z.enum(EVALUATION_STATUSES),
    pdiGoals: z.array(pdiGoalSchema).max(50),
    history: z.array(historyEntrySchema).max(100),
  })
  .refine((member) => member.status === statusForScore(member.score), {
    message: 'status não corresponde ao score',
    path: ['status'],
  });

const evaluationInputSchema = z
  .strictObject({
    id: documentIdSchema,
    memberId: documentIdSchema,
    memberName: z.string().max(100).default(''),
    leaderName: z.string().max(100).default(''),
    score: z.number().finite().min(0).max(155),
    status: z.enum(PERFORMANCE_STATUSES),
    cycle: z.string().min(1).max(64),
    comments: z.string().max(5000),
    pdiGoals: z.array(pdiGoalSchema).max(50),
    criteriaScores: completeCriteriaScoresSchema,
    selfScores: partialCriteriaScoresSchema.optional(),
  })
  .refine((evaluation) => evaluation.status === statusForScore(evaluation.score), {
    message: 'status não corresponde ao score',
    path: ['status'],
  });

export const saveEvaluationInputSchema = z
  .strictObject({
    member: memberUpdateSchema,
    evaluation: evaluationInputSchema,
    expectedRevision: z.number().finite().int().min(0).max(1000000),
  })
  .refine((data) => data.evaluation.memberId === data.member.id, {
    message: 'evaluation.memberId deve ser igual a member.id',
    path: ['evaluation', 'memberId'],
  })
  .refine(
    (data) =>
      data.evaluation.score === data.member.score && data.evaluation.status === data.member.status,
    {
      message: 'score/status da avaliação divergem do membro',
      path: ['evaluation', 'score'],
    },
  );

export type SaveEvaluationInput = z.infer<typeof saveEvaluationInputSchema>;

export function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join('.') || '(raiz)'}: ${issue.message}`)
    .join('; ');
}