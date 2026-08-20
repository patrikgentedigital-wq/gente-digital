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

function evaluationDoc(id: string): Record<string, unknown> {
  const criteriaScores: Record<string, number> = {};
  for (const key of [
    '1-0', '1-1', '1-2', '1-3', '1-4',
    '2-0', '2-1', '2-2', '2-3', '2-4',
    '3-0', '3-1', '3-2', '3-3', '3-4',
    '4-0', '4-1', '4-2', '4-3', '4-4',
    '5-0', '5-1', '5-2', '5-3', '5-4',
    '6-0', '6-1', '6-2', '6-3', '6-4', '6-5',
  ]) {
    criteriaScores[key] = 3;
  }
  return {
    id,
    memberId: 'member1',
    memberName: 'Ana Souza',
    leaderName: 'Carlos Lima',
    score: 145,
    status: 'Voando',
    cycle: '2026-Q2',
    comments: 'Ótimo ciclo',
    criteriaScores,
    revision: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
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

describe('leitura de membros', () => {
  it('bloqueia leitura sem login', async () => {
    await assertFails(testEnv.unauthenticatedContext().firestore().collection('members').get());
  });

  it('bloqueia leitura para usuário verificado sem role', async () => {
    const ctx = testEnv.authenticatedContext('plain', {
      email: 'plain@example.com',
      email_verified: true,
    });
    await assertFails(ctx.firestore().collection('members').get());
  });

  it('bloqueia leitura para role válida com e-mail não verificado', async () => {
    const ctx = testEnv.authenticatedContext('leader1', {
      email: LEADER.email,
      email_verified: false,
      role: 'leader',
    });
    await assertFails(ctx.firestore().collection('members').get());
  });

  it('permite leitura para líder verificado', async () => {
    await seedMembers();
    await assertSucceeds(leaderCtx().firestore().collection('members').get());
  });

  it('permite leitura para admin verificado', async () => {
    await seedMembers();
    await assertSucceeds(adminCtx().firestore().collection('members').get());
  });
});

describe('escrita de membros (apenas admin; líder usa a callable saveEvaluation)', () => {
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

  it('bloqueia criação de membro com score fora da faixa', async () => {
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

  it('bloqueia QUALQUER update de membro por líder (inclusive campos de avaliação)', async () => {
    await seedMembers();
    await assertFails(
      leaderCtx().firestore().collection('members').doc('member1').update({
        score: 100,
        status: 'Alarme',
        evaluationStatus: 'Concluído',
        updatedAt: new Date(),
      }),
    );
  });

  it('bloqueia update de history por líder (validação por elemento vive na callable)', async () => {
    await seedMembers();
    await assertFails(
      leaderCtx().firestore().collection('members').doc('member1').update({
        history: [{ month: '2026-01', score: 'string-malicioso' }],
        updatedAt: new Date(),
      }),
    );
  });

  it('bloqueia update de pdiGoals por líder (validação por elemento vive na callable)', async () => {
    await seedMembers();
    await assertFails(
      leaderCtx().firestore().collection('members').doc('member1').update({
        pdiGoals: [{ id: 'goal9', title: 'Meta', deadline: '2026-05-01', status: 'hacker', x: 1 }],
        updatedAt: new Date(),
      }),
    );
  });

  it('permite update completo e válido por admin', async () => {
    await seedMembers();
    await assertSucceeds(
      adminCtx().firestore().collection('members').doc('member1').set({
        ...memberDoc('member1'),
        name: 'Ana Souza Lima',
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

  it('bloqueia arquivamento por líder', async () => {
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

describe('evaluations (escrita apenas via Cloud Function)', () => {
  it('permite leitura por líder', async () => {
    await assertSucceeds(leaderCtx().firestore().collection('evaluations').get());
  });

  it('permite leitura por admin', async () => {
    await assertSucceeds(adminCtx().firestore().collection('evaluations').get());
  });

  it('bloqueia leitura sem login', async () => {
    await assertFails(testEnv.unauthenticatedContext().firestore().collection('evaluations').get());
  });

  it('bloqueia criação de avaliação válida pelo cliente (mesmo líder legítimo)', async () => {
    await seedMembers();
    await assertFails(
      leaderCtx().firestore().collection('evaluations').doc('eval1').set(evaluationDoc('eval1')),
    );
  });

  it('bloqueia criação de avaliação pelo admin via cliente (forçar uso da callable)', async () => {
    await seedMembers();
    await assertFails(
      adminCtx().firestore().collection('evaluations').doc('eval1').set(evaluationDoc('eval1')),
    );
  });

  it('bloqueia update de avaliação pelo cliente', async () => {
    await seedMembers();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('evaluations').doc('eval1').set(evaluationDoc('eval1'));
    });
    await assertFails(
      leaderCtx().firestore().collection('evaluations').doc('eval1').update({
        comments: 'Revisado fora da função',
        revision: 2,
        updatedAt: new Date(),
      }),
    );
  });

  it('bloqueia delete de avaliação por líder e permite por admin', async () => {
    await seedMembers();
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('evaluations').doc('eval1').set(evaluationDoc('eval1'));
    });
    await assertFails(leaderCtx().firestore().collection('evaluations').doc('eval1').delete());
    await assertSucceeds(adminCtx().firestore().collection('evaluations').doc('eval1').delete());
  });
});

describe('auditLogs (append-only via Cloud Function)', () => {
  it('permite leitura por admin', async () => {
    await assertSucceeds(adminCtx().firestore().collection('auditLogs').get());
  });

  it('bloqueia leitura por líder', async () => {
    await assertFails(leaderCtx().firestore().collection('auditLogs').get());
  });

  it('bloqueia QUALQUER escrita de auditLog pelo cliente (inclusive admin)', async () => {
    await seedMembers();
    const log = {
      id: 'log1',
      action: 'evaluation_saved',
      evaluationId: 'eval1',
      memberId: 'member1',
      memberName: 'Ana Souza',
      cycle: '2026-Q2',
      revision: 1,
      score: 145,
      status: 'Voando',
      actorId: ADMIN.uid,
      actorEmail: ADMIN.email,
      actorName: 'Admin',
      createdAt: new Date(),
    };
    await assertFails(adminCtx().firestore().collection('auditLogs').doc('log1').set(log));
    await assertFails(leaderCtx().firestore().collection('auditLogs').doc('log1').set(log));
  });

  it('bloqueia update e delete de auditLog', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection('auditLogs').doc('log1').set({
        id: 'log1',
        action: 'evaluation_saved',
      });
    });
    await assertFails(adminCtx().firestore().collection('auditLogs').doc('log1').update({ score: 1 }));
    await assertFails(adminCtx().firestore().collection('auditLogs').doc('log1').delete());
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