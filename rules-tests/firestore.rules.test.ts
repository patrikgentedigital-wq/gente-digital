import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import firebase from 'firebase/compat/app';

const RULES = readFileSync(join(process.cwd(), 'firestore.rules'), 'utf8');

const PROJECT_ID = 'demo-gente-digital';

let testEnv: RulesTestEnvironment;

const CRITERIA_KEYS = [
  '1-0', '1-1', '1-2', '1-3', '1-4',
  '2-0', '2-1', '2-2', '2-3', '2-4',
  '3-0', '3-1', '3-2', '3-3', '3-4',
  '4-0', '4-1', '4-2', '4-3', '4-4',
  '5-0', '5-1', '5-2', '5-3', '5-4',
  '6-0', '6-1', '6-2', '6-3', '6-4', '6-5',
];

function criteriaScores(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of CRITERIA_KEYS) out[key] = 3;
  return out;
}

function memberDoc(id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    name: 'Ana Souza',
    role: 'Líder Técnica',
    team: 'Djemerson',
    score: 145,
    rank: 1,
    maxScore: 155,
    status: 'Voando',
    evaluationStatus: 'Pendente',
    email: 'ana@example.com',
    currentRating: 4,
    history: [
      { month: '2026-01', score: 140 },
      { month: '2026-02', score: 145 },
    ],
    pdiGoals: [
      {
        id: 'goal1',
        title: 'Melhorar comunicação',
        deadline: '2026-03-01',
        status: 'pending',
        description: 'Curso de comunicação',
        dueDate: '2026-04-01',
      },
    ],
    updatedAt: new Date(),
    ...overrides,
  };
}

function evaluationDoc(
  id: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id,
    memberId: 'member1',
    memberName: 'Ana Souza',
    leaderName: 'Carlos Lima',
    score: 145,
    status: 'Voando',
    cycle: '2026-Q2',
    comments: 'Ótimo ciclo',
    criteriaScores: criteriaScores(),
    revision: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function auditLogDoc(
  id: string,
  actor: { uid: string; email: string },
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id,
    action: 'evaluation_saved',
    evaluationId: 'eval1',
    memberId: 'member1',
    memberName: 'Ana Souza',
    cycle: '2026-Q2',
    revision: 1,
    score: 145,
    status: 'Voando',
    actorId: actor.uid,
    actorEmail: actor.email,
    actorName: 'Carlos Lima',
    createdAt: new Date(),
    ...overrides,
  };
}

const ADMIN = { uid: 'admin1', email: 'admin@example.com' };
const LEADER = { uid: 'leader1', email: 'leader@example.com' };

function adminCtx() {
  return testEnv.authenticatedContext(ADMIN.uid, {
    email: ADMIN.email,
    email_verified: true,
    role: 'admin',
  });
}

function leaderCtx() {
  return testEnv.authenticatedContext(LEADER.uid, {
    email: LEADER.email,
    email_verified: true,
    role: 'leader',
  });
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: '127.0.0.1', port: 8080, rules: RULES },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

async function seedMembers(): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await db.collection('members').doc('member1').set(memberDoc('member1'));
  });
}

describe('autenticação e permissões de membros', () => {
  it('bloqueia leitura de membros sem login', async () => {
    await assertFails(testEnv.unauthenticatedContext().firestore().collection('members').get());
  });

  it('bloqueia leitura de membros para usuário verificado sem role', async () => {
    const ctx = testEnv.authenticatedContext('plain', {
      email: 'plain@example.com',
      email_verified: true,
    });
    await assertFails(ctx.firestore().collection('members').get());
  });

  it('bloqueia leitura de membros para usuário com role mas e-mail não verificado', async () => {
    const ctx = testEnv.authenticatedContext('leader1', {
      email: LEADER.email,
      email_verified: false,
      role: 'leader',
    });
    await assertFails(ctx.firestore().collection('members').get());
  });

  it('permite leitura de membros para líder verificado', async () => {
    await seedMembers();
    await assertSucceeds(leaderCtx().firestore().collection('members').get());
  });

  it('bloqueia criação de membro por líder', async () => {
    await assertFails(
      leaderCtx().firestore().collection('members').doc('member2').set(memberDoc('member2')),
    );
  });

  it('permite criação de membro válido por admin', async () => {
    await assertSucceeds(
      adminCtx().firestore().collection('members').doc('member2').set(memberDoc('member2')),
    );
  });

  it('bloqueia criação de membro com score fora da faixa por admin', async () => {
    await assertFails(
      adminCtx().firestore().collection('members').doc('member2').set(memberDoc('member2', { score: 200 })),
    );
  });

  it('bloqueia criação de membro com status inconsistente com o score', async () => {
    await assertFails(
      adminCtx().firestore().collection('members').doc('member2').set(memberDoc('member2', { score: 100, status: 'Voando' })),
    );
  });

  it('bloqueia criação de membro sem chaves obrigatórias', async () => {
    const doc = memberDoc('member2');
    delete doc.rank;
    await assertFails(adminCtx().firestore().collection('members').doc('member2').set(doc));
  });

  it('bloqueia update de membro por líder alterando campo fora da avaliação (name)', async () => {
    await seedMembers();
    await assertFails(leaderCtx().firestore().collection('members').doc('member1').update({ name: 'Hack' }));
  });

  it('bloqueia update de membro por líder alterando team', async () => {
    await seedMembers();
    await assertFails(
      leaderCtx().firestore().collection('members').doc('member1').update({ team: 'Diego' }),
    );
  });

  it('permite update de avaliação válido por líder (score/status/evaluationStatus)', async () => {
    await seedMembers();
    await assertSucceeds(
      leaderCtx().firestore().collection('members').doc('member1').update({
        score: 100,
        status: 'Alarme',
        evaluationStatus: 'Concluído',
        updatedAt: new Date(),
      }),
    );
  });

  it('bloqueia delete de membro por líder', async () => {
    await seedMembers();
    await assertFails(leaderCtx().firestore().collection('members').doc('member1').delete());
  });

  it('permite delete de membro por admin', async () => {
    await seedMembers();
    await assertSucceeds(adminCtx().firestore().collection('members').doc('member1').delete());
  });
});

describe('history (validação estrutural top-level)', () => {
  it('permite history como lista dentro do limite', async () => {
    await seedMembers();
    await assertSucceeds(
      leaderCtx().firestore().collection('members').doc('member1').update({
        history: [
          { month: '2026-01', score: 140 },
          { month: '2026-02', score: 145 },
          { month: '2026-03', score: 149 },
        ],
        updatedAt: new Date(),
      }),
    );
  });

  it('bloqueia history que não seja lista', async () => {
    await seedMembers();
    await assertFails(
      leaderCtx().firestore().collection('members').doc('member1').update({
        history: 'não é lista',
        updatedAt: new Date(),
      }),
    );
  });

  it('bloqueia history acima de 100 entradas', async () => {
    await seedMembers();
    const huge = Array.from({ length: 101 }, (_, i) => ({ month: `2026-${i}`, score: 100 }));
    await assertFails(
      leaderCtx().firestore().collection('members').doc('member1').update({
        history: huge,
        updatedAt: new Date(),
      }),
    );
  });

  it('documenta limitação: rules NÃO validam elementos de history (cliente zod + função futura)', async () => {
    await seedMembers();
    await assertSucceeds(
      leaderCtx().firestore().collection('members').doc('member1').update({
        history: [{ month: '2026-01', score: 'string-malicioso' }],
        updatedAt: new Date(),
      }),
    );
  });
});

describe('pdiGoals (validação estrutural top-level)', () => {
  it('permite pdiGoal com dueDate em update de avaliação', async () => {
    await seedMembers();
    await assertSucceeds(
      leaderCtx().firestore().collection('members').doc('member1').update({
        pdiGoals: [
          {
            id: 'goal9',
            title: 'Nova meta',
            deadline: '2026-05-01',
            status: 'pending',
            description: 'Detalhe',
            dueDate: '2026-06-01',
          },
        ],
        updatedAt: new Date(),
      }),
    );
  });

  it('bloqueia pdiGoals acima de 50 itens', async () => {
    await seedMembers();
    const many = Array.from({ length: 51 }, (_, i) => ({
      id: `goal${i}`,
      title: 'Meta',
      deadline: '2026-05-01',
      status: 'pending',
    }));
    await assertFails(
      leaderCtx().firestore().collection('members').doc('member1').update({
        pdiGoals: many,
        updatedAt: new Date(),
      }),
    );
  });

  it('bloqueia pdiGoals que não seja lista', async () => {
    await seedMembers();
    await assertFails(
      leaderCtx().firestore().collection('members').doc('member1').update({
        pdiGoals: 'não é lista',
        updatedAt: new Date(),
      }),
    );
  });

  it('documenta limitação: rules NÃO validam elementos de pdiGoals (cliente zod + função futura)', async () => {
    await seedMembers();
    await assertSucceeds(
      leaderCtx().firestore().collection('members').doc('member1').update({
        pdiGoals: [
          {
            id: 'goal9',
            title: 'Nova meta',
            deadline: '2026-05-01',
            status: 'done-malicioso',
            hacker: 'x',
          },
        ],
        updatedAt: new Date(),
      }),
    );
  });
});

describe('evaluations', () => {
  it('permite criação de avaliação válida por líder (membro existe)', async () => {
    await seedMembers();
    await assertSucceeds(
      leaderCtx().firestore().collection('evaluations').doc('eval1').set(evaluationDoc('eval1')),
    );
  });

  it('bloqueia criação de avaliação para membro inexistente', async () => {
    await assertFails(
      leaderCtx()
        .firestore()
        .collection('evaluations')
        .doc('eval1')
        .set(evaluationDoc('eval1', { memberId: 'ghost' })),
    );
  });

  it('bloqueia criação de avaliação com critério fora do conjunto de chaves', async () => {
    await seedMembers();
    const bad = criteriaScores();
    delete bad['6-5'];
    await assertFails(
      leaderCtx()
        .firestore()
        .collection('evaluations')
        .doc('eval1')
        .set(evaluationDoc('eval1', { criteriaScores: bad })),
    );
  });

  it('documenta limitação: faixa de valores (0..5) validada só no cliente zod', async () => {
    await seedMembers();
    const bad = criteriaScores();
    bad['1-0'] = 6;
    await assertSucceeds(
      leaderCtx()
        .firestore()
        .collection('evaluations')
        .doc('eval1')
        .set(evaluationDoc('eval1', { criteriaScores: bad })),
    );
  });

  it('permite update de avaliação com revision +1', async () => {
    await seedMembers();
    const db = leaderCtx().firestore();
    await assertSucceeds(db.collection('evaluations').doc('eval1').set(evaluationDoc('eval1')));
    await assertSucceeds(
      db.collection('evaluations').doc('eval1').update({
        comments: 'Revisado',
        score: 146,
        status: 'Voando',
        revision: 2,
        updatedAt: new Date(),
      }),
    );
  });

  it('bloqueia update de avaliação com revision repetida (conflito de escrita)', async () => {
    await seedMembers();
    const db = leaderCtx().firestore();
    await assertSucceeds(db.collection('evaluations').doc('eval1').set(evaluationDoc('eval1')));
    await assertFails(
      db.collection('evaluations').doc('eval1').update({
        comments: 'Concorrente',
        revision: 1,
        updatedAt: new Date(),
      }),
    );
  });

  it('bloqueia update de avaliação com revision pulada', async () => {
    await seedMembers();
    const db = leaderCtx().firestore();
    await assertSucceeds(db.collection('evaluations').doc('eval1').set(evaluationDoc('eval1')));
    await assertFails(
      db.collection('evaluations').doc('eval1').update({
        comments: 'Pulou',
        revision: 5,
        updatedAt: new Date(),
      }),
    );
  });

  it('A-02: bloqueia update de avaliação alterando o cycle', async () => {
    await seedMembers();
    const db = leaderCtx().firestore();
    await assertSucceeds(db.collection('evaluations').doc('eval1').set(evaluationDoc('eval1')));
    await assertFails(
      db.collection('evaluations').doc('eval1').update({
        cycle: '2026-Q3',
        revision: 2,
        updatedAt: new Date(),
      }),
    );
  });

  it('bloqueia update de avaliação alterando memberId', async () => {
    await seedMembers();
    const db = leaderCtx().firestore();
    await assertSucceeds(db.collection('evaluations').doc('eval1').set(evaluationDoc('eval1')));
    await assertFails(
      db.collection('evaluations').doc('eval1').update({
        memberId: 'other',
        revision: 2,
        updatedAt: new Date(),
      }),
    );
  });

  it('bloqueia delete de avaliação por líder', async () => {
    await seedMembers();
    const db = leaderCtx().firestore();
    await assertSucceeds(db.collection('evaluations').doc('eval1').set(evaluationDoc('eval1')));
    await assertFails(db.collection('evaluations').doc('eval1').delete());
  });

  it('permite delete de avaliação por admin', async () => {
    await seedMembers();
    const db = adminCtx().firestore();
    await assertSucceeds(db.collection('evaluations').doc('eval1').set(evaluationDoc('eval1')));
    await assertSucceeds(db.collection('evaluations').doc('eval1').delete());
  });
});

describe('auditLogs', () => {
  it('permite criação de auditLog válido pelo próprio ator', async () => {
    await seedMembers();
    await assertSucceeds(
      leaderCtx()
        .firestore()
        .collection('auditLogs')
        .doc('log1')
        .set(auditLogDoc('log1', LEADER)),
    );
  });

  it('bloqueia auditLog com actorId diferente do usuário autenticado', async () => {
    await seedMembers();
    await assertFails(
      leaderCtx()
        .firestore()
        .collection('auditLogs')
        .doc('log1')
        .set(auditLogDoc('log1', LEADER, { actorId: 'someone-else' })),
    );
  });

  it('bloqueia auditLog com actorEmail diferente do token', async () => {
    await seedMembers();
    await assertFails(
      leaderCtx()
        .firestore()
        .collection('auditLogs')
        .doc('log1')
        .set(auditLogDoc('log1', LEADER, { actorEmail: 'fake@example.com' })),
    );
  });

  it('bloqueia leitura de auditLogs por líder', async () => {
    await seedMembers();
    await assertFails(leaderCtx().firestore().collection('auditLogs').get());
  });

  it('permite leitura de auditLogs por admin', async () => {
    await seedMembers();
    await assertSucceeds(adminCtx().firestore().collection('auditLogs').get());
  });

  it('bloqueia update de auditLog', async () => {
    await seedMembers();
    const db = leaderCtx().firestore();
    await assertSucceeds(db.collection('auditLogs').doc('log1').set(auditLogDoc('log1', LEADER)));
    await assertFails(db.collection('auditLogs').doc('log1').update({ score: 100 }));
  });

  it('bloqueia delete de auditLog', async () => {
    await seedMembers();
    const db = leaderCtx().firestore();
    await assertSucceeds(db.collection('auditLogs').doc('log1').set(auditLogDoc('log1', LEADER)));
    await assertFails(db.collection('auditLogs').doc('log1').delete());
  });
});

describe('wildcard de negação', () => {
  it('bloqueia escrita em coleção desconhecida', async () => {
    await assertFails(
      adminCtx().firestore().collection('secret').doc('x').set({ data: 'leak' }),
    );
  });

  it('bloqueia leitura em coleção desconhecida', async () => {
    await assertFails(leaderCtx().firestore().collection('secret').get());
  });

  it('bloqueia acesso sem login a qualquer caminho', async () => {
    await assertFails(
      testEnv
        .unauthenticatedContext()
        .firestore()
        .collection('members')
        .doc('member1')
        .get(),
    );
  });
});

describe('arquivamento (soft-delete) de membros', () => {
  it('permite admin arquivar membro (deleted=true com deletedAt/deletedBy)', async () => {
    await seedMembers();
    await assertSucceeds(
      adminCtx().firestore().collection('members').doc('member1').update({
        deleted: true,
        deletedAt: new Date(),
        deletedBy: ADMIN.uid,
      }),
    );
  });

  it('bloqueia arquivamento sem deletedAt/deletedBy', async () => {
    await seedMembers();
    await assertFails(
      adminCtx().firestore().collection('members').doc('member1').update({
        deleted: true,
      }),
    );
  });

  it('permite admin restaurar membro (deleted=false, campos removidos)', async () => {
    await seedMembers();
    const db = adminCtx().firestore();
    await assertSucceeds(
      db.collection('members').doc('member1').update({
        deleted: true,
        deletedAt: new Date(),
        deletedBy: ADMIN.uid,
      }),
    );
    await assertSucceeds(
      db.collection('members').doc('member1').update({
        deleted: false,
        deletedAt: firebase.firestore.FieldValue.delete(),
        deletedBy: firebase.firestore.FieldValue.delete(),
      }),
    );
  });

  it('bloqueia arquivamento por líder (chaves fora do update de avaliação)', async () => {
    await seedMembers();
    await assertFails(
      leaderCtx().firestore().collection('members').doc('member1').update({
        deleted: true,
        updatedAt: new Date(),
      }),
    );
  });

  it('bloqueia deleted com tipo inválido', async () => {
    await seedMembers();
    await assertFails(
      adminCtx().firestore().collection('members').doc('member1').update({
        deleted: 'sim',
        deletedAt: new Date(),
        deletedBy: ADMIN.uid,
      }),
    );
  });
});

describe('sanidade dos fixtures', () => {
  it('criação de avaliação pela própria seed passa (regressão de setup)', async () => {
    await seedMembers();
    const db = leaderCtx().firestore();
    await assertSucceeds(db.collection('evaluations').doc('eval1').set(evaluationDoc('eval1')));
    const snap = await db.collection('evaluations').doc('eval1').get();
    expect(snap.exists).toBe(true);
  });
});