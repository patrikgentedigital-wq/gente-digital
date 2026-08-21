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

function isKnownCriteriaKey(value: string): boolean {
  return (CRITERIA_KEYS as readonly string[]).includes(value);
}

const criteriaValueSchema = z.number().finite().min(0).max(5);

const completeCriteriaScoresSchema = z
  .record(z.string().regex(/^[1-6]-[0-5]$/), criteriaValueSchema)
  .superRefine((scores, context) => {
    for (const key of Object.keys(scores)) {
      if (!isKnownCriteriaKey(key)) {
        context.addIssue({
          code: 'custom',
          path: [key],
          message: 'critério desconhecido',
        });
      }
    }
    for (const key of CRITERIA_KEYS) {
      if (!(key in scores)) {
        context.addIssue({
          code: 'custom',
          path: [key],
          message: 'critério obrigatório ausente',
        });
      }
    }
  });

const partialCriteriaScoresSchema = z
  .record(z.string().regex(/^[1-6]-[0-5]$/), criteriaValueSchema)
  .superRefine((scores, context) => {
    for (const key of Object.keys(scores)) {
      if (!isKnownCriteriaKey(key)) {
        context.addIssue({
          code: 'custom',
          path: [key],
          message: 'critério desconhecido',
        });
      }
    }
  });

export function makeEvaluationId(memberId: string, cycle: string): string {
  const cycleId = cycle.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return `evaluation_${memberId}_${cycleId}`;
}

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
  .refine((data) => data.evaluation.id === makeEvaluationId(data.member.id, data.evaluation.cycle), {
    message: 'evaluation.id deve ser determinístico para o membro e ciclo informados',
    path: ['evaluation', 'id'],
  })
  .refine(
    (data) =>
      data.evaluation.score === data.member.score && data.evaluation.status === data.member.status,
    {
      message: 'score/status da avaliação divergem do membro',
      path: ['evaluation', 'score'],
    },
  )
  .refine((data) => data.member.evaluationStatus === 'Concluído', {
    message: 'uma avaliação salva deve concluir o status do membro',
    path: ['member', 'evaluationStatus'],
  })
  .refine(
    (data) => Math.abs(
      Object.values(data.evaluation.criteriaScores).reduce((total, score) => total + score, 0) - data.evaluation.score,
    ) < 1e-9,
    {
      message: 'a pontuação da avaliação deve ser a soma dos critérios',
      path: ['evaluation', 'score'],
    },
  )
  .refine(
    (data) => data.member.pdiGoals.length === data.evaluation.pdiGoals.length &&
      data.member.pdiGoals.every((goal, index) => JSON.stringify(goal) === JSON.stringify(data.evaluation.pdiGoals[index])),
    {
      message: 'as metas PDI do membro e da avaliação devem ser iguais',
      path: ['evaluation', 'pdiGoals'],
    },
  )
  .refine(
    (data) => data.member.history.filter((entry) => entry.month === data.evaluation.cycle).length === 1 &&
      data.member.history.some((entry) => entry.month === data.evaluation.cycle && entry.score === data.evaluation.score),
    {
      message: 'o histórico do membro deve conter uma entrada para o ciclo e score atuais',
      path: ['member', 'history'],
    },
  );

export type SaveEvaluationInput = z.infer<typeof saveEvaluationInputSchema>;

export function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join('.') || '(raiz)'}: ${issue.message}`)
    .join('; ');
}
