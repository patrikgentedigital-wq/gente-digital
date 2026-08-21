import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const hoisted = vi.hoisted(() => {
  class HttpsError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = 'HttpsError';
      this.code = code;
    }
  }
  const mockAuth = {
    getUser: vi.fn(),
    getUserByEmail: vi.fn(),
    setCustomUserClaims: vi.fn(),
    listUsers: vi.fn(),
  };
  const mockTx = { get: vi.fn(), update: vi.fn(), set: vi.fn() };
  const mockDb = {
    collection: vi.fn((name: string) => ({
      doc: (id: string) => ({ __path: `${name}/${id}`, name, id }),
    })),
    batch: vi.fn(),
    runTransaction: (cb: (tx: unknown) => Promise<unknown>) => cb(hoisted.mockTx),
  };
  return {
    HttpsError,
    mockAuth,
    mockDb,
    mockTx,
    mockParams: {
      BOOTSTRAP_ADMIN_EMAIL: '',
      TEAMS_WEBHOOK_URL: '',
      AUDIT_LOG_RETENTION_DAYS: '0',
      ENFORCE_APP_CHECK: 'false',
    } as Record<string, string>,
  };
});

const { mockAuth, mockDb, mockParams, mockTx } = hoisted;

vi.mock('firebase-admin/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => mockAuth }));
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => hoisted.mockDb,
  FieldValue: { serverTimestamp: () => ({ __serverTimestamp: true }) },
}));

vi.mock('firebase-functions/v2/https', () => ({
  HttpsError: hoisted.HttpsError,
  onCall: <T>(_options: unknown, fn: T): T => fn,
}));

vi.mock('firebase-functions/v2/firestore', () => ({
  onDocumentDeleted: (_opts: unknown, fn: (event: never) => unknown) => fn,
  onDocumentUpdated: (_opts: unknown, fn: (event: never) => unknown) => fn,
}));

vi.mock('firebase-functions/v2/scheduler', () => ({
  onSchedule: (_opts: unknown, fn: () => unknown) => fn,
}));

vi.mock('firebase-functions/params', () => ({
  defineString: (name: string) => {
    const param = () => mockParams[name];
    param.value = () => mockParams[name];
    return param;
  },
  defineBoolean: (name: string) => {
    const param = () => mockParams[name] === 'true';
    param.value = () => mockParams[name] === 'true';
    return param;
  },
}));

import {
  setUserRole as setUserRoleRaw,
  bootstrapFirstAdmin as bootstrapFirstAdminRaw,
  onMemberStatusChanged as onMemberStatusChangedRaw,
  saveEvaluation as saveEvaluationRaw,
  purgeExpiredAuditLogs as purgeExpiredAuditLogsRaw,
} from './index';

type CallableRequestLike = { auth: { uid: string } | null; data: unknown };
type CallableRequestWithToken = {
  auth: { uid: string; token: Record<string, unknown> } | null;
  data: unknown;
};
type RoleResult = { uid: string; email: string | undefined; role: string | null };
type StatusChangeEvent = {
  params: { memberId: string };
  data: {
    before: { data: () => Record<string, unknown> };
    after: { data: () => Record<string, unknown> };
  };
};
type AuthUser = { uid: string; email: string; emailVerified: boolean; customClaims?: Record<string, unknown> };

const setUserRole = setUserRoleRaw as unknown as (request: CallableRequestLike) => Promise<RoleResult>;
const bootstrapFirstAdmin = bootstrapFirstAdminRaw as unknown as (request: CallableRequestLike) => Promise<RoleResult>;
const onMemberStatusChanged = onMemberStatusChangedRaw as unknown as (event: StatusChangeEvent) => Promise<unknown>;
const purgeExpiredAuditLogs = purgeExpiredAuditLogsRaw as unknown as () => Promise<unknown>;
const saveEvaluation = saveEvaluationRaw as unknown as (
  request: CallableRequestWithToken,
) => Promise<{ revision: number }>;

const users: Record<string, AuthUser> = {
  admin1: { uid: 'admin1', email: 'admin@empresa.com.br', emailVerified: true, customClaims: { role: 'admin' } },
  admin2: { uid: 'admin2', email: 'admin2@empresa.com.br', emailVerified: true, customClaims: { role: 'admin' } },
  leader1: { uid: 'leader1', email: 'leader@empresa.com.br', emailVerified: true, customClaims: { role: 'leader' } },
  fresh1: { uid: 'fresh1', email: 'admin@empresa.com.br', emailVerified: true, customClaims: {} },
  uv1: { uid: 'uv1', email: 'x@empresa.com.br', emailVerified: false, customClaims: {} },
  other1: { uid: 'other1', email: 'other@empresa.com.br', emailVerified: true, customClaims: {} },
};

beforeEach(() => {
  vi.clearAllMocks();
  mockParams.BOOTSTRAP_ADMIN_EMAIL = '';
  mockParams.TEAMS_WEBHOOK_URL = '';
  mockParams.AUDIT_LOG_RETENTION_DAYS = '0';
  mockParams.ENFORCE_APP_CHECK = 'false';
  mockAuth.getUser.mockImplementation(async (uid: string) => users[uid] ?? null);
  mockAuth.getUserByEmail.mockImplementation(async (email: string) =>
    Object.values(users).find((user) => user.email === email) ?? null,
  );
  mockAuth.listUsers.mockResolvedValue({ users: Object.values(users), pageToken: undefined });
  mockAuth.setCustomUserClaims.mockResolvedValue(undefined);
});

async function expectHttpsError(action: () => Promise<unknown>, code: string, messageRegex?: RegExp) {
  try {
    await action();
    expect.unreachable('esperava HttpsError');
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect((error as { code?: string }).code).toBe(code);
    if (messageRegex) expect((error as Error).message).toMatch(messageRegex);
  }
}

describe('setUserRole handler', () => {
  it('rejects unauthenticated callers', async () => {
    await expectHttpsError(
      () => setUserRole({ auth: null, data: {} }),
      'unauthenticated',
    );
  });

  it('rejects non-admin callers', async () => {
    await expectHttpsError(
      () => setUserRole({ auth: { uid: 'leader1' }, data: { email: 'x@empresa.com.br', role: 'admin' } }),
      'permission-denied',
    );
  });

  it('rejects invalid payloads', async () => {
    await expectHttpsError(
      () => setUserRole({ auth: { uid: 'admin1' }, data: { email: 'x@empresa.com.br', role: 'superadmin' } }),
      'invalid-argument',
    );
  });

  it('rejects self-demotion of the caller', async () => {
    await expectHttpsError(
      () => setUserRole({ auth: { uid: 'admin1' }, data: { email: 'admin@empresa.com.br', role: null } }),
      'invalid-argument',
      /própria role/,
    );
  });

  it('rejects removing the last admin of the project', async () => {
    mockAuth.listUsers.mockResolvedValue({
      users: [users.admin2],
      pageToken: undefined,
    });
    await expectHttpsError(
      () => setUserRole({ auth: { uid: 'admin1' }, data: { email: 'admin2@empresa.com.br', role: null } }),
      'failed-precondition',
      /último administrador/,
    );
  });

  it('allows an admin to demote another admin when more than one exists', async () => {
    const result = await setUserRole({
      auth: { uid: 'admin1' },
      data: { email: 'admin2@empresa.com.br', role: null },
    });

    expect(result.role).toBeNull();
    expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith('admin2', {});
  });

  it('applies a leader role successfully', async () => {
    const result = await setUserRole({
      auth: { uid: 'admin1' },
      data: { email: 'leader@empresa.com.br', role: 'leader' },
    });

    expect(result.role).toBe('leader');
    expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith('leader1', { role: 'leader' });
  });

  it('promotes a target to admin', async () => {
    const result = await setUserRole({
      auth: { uid: 'admin1' },
      data: { email: 'leader@empresa.com.br', role: 'admin' },
    });

    expect(result.role).toBe('admin');
    expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith('leader1', { role: 'admin' });
  });
});

describe('bootstrapFirstAdmin handler', () => {
  it('rejects unauthenticated callers', async () => {
    await expectHttpsError(
      () => bootstrapFirstAdmin({ auth: null, data: {} }),
      'unauthenticated',
    );
  });

  it('rejects callers with unverified email', async () => {
    await expectHttpsError(
      () => bootstrapFirstAdmin({ auth: { uid: 'uv1' }, data: {} }),
      'failed-precondition',
      /verificado/,
    );
  });

  it('rejects callers that are already admins', async () => {
    await expectHttpsError(
      () => bootstrapFirstAdmin({ auth: { uid: 'admin1' }, data: {} }),
      'already-exists',
    );
  });

  it('requires BOOTSTRAP_ADMIN_EMAIL to be configured', async () => {
    await expectHttpsError(
      () => bootstrapFirstAdmin({ auth: { uid: 'fresh1' }, data: {} }),
      'failed-precondition',
      /BOOTSTRAP_ADMIN_EMAIL/,
    );
  });

  it('rejects callers whose email does not match BOOTSTRAP_ADMIN_EMAIL', async () => {
    mockParams.BOOTSTRAP_ADMIN_EMAIL = 'admin@empresa.com.br';
    await expectHttpsError(
      () => bootstrapFirstAdmin({ auth: { uid: 'other1' }, data: {} }),
      'permission-denied',
      /BOOTSTRAP_ADMIN_EMAIL/,
    );
  });

  it('promotes the first matching user when no admin exists yet', async () => {
    mockParams.BOOTSTRAP_ADMIN_EMAIL = 'admin@empresa.com.br';
    mockAuth.listUsers.mockResolvedValue({
      users: [users.leader1, users.fresh1],
      pageToken: undefined,
    });

    const result = await bootstrapFirstAdmin({ auth: { uid: 'fresh1' }, data: {} });

    expect(result.role).toBe('admin');
    expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith('fresh1', { role: 'admin' });
  });

  it('rejects bootstrap when an admin already exists in the project', async () => {
    mockParams.BOOTSTRAP_ADMIN_EMAIL = 'admin@empresa.com.br';
    await expectHttpsError(
      () => bootstrapFirstAdmin({ auth: { uid: 'fresh1' }, data: {} }),
      'already-exists',
      /Já existe um administrador/,
    );
  });
});

describe('onMemberStatusChanged trigger', () => {
  const makeEvent = (before: Record<string, unknown>, after: Record<string, unknown>): StatusChangeEvent => ({
    params: { memberId: 'm1' },
    data: {
      before: { data: () => before },
      after: { data: () => after },
    },
  });

  it('skips when status improves', async () => {
    const result = (await onMemberStatusChanged(
      makeEvent({ status: 'Atenção', score: 125 }, { status: 'Caminho Certo', score: 135 }),
    )) as { skipped: string };
    expect(result).toEqual({ skipped: 'status-not-worsened' });
  });

  it('skips when no webhook is configured, even if status worsens', async () => {
    const result = (await onMemberStatusChanged(
      makeEvent({ status: 'Caminho Certo', score: 135 }, { status: 'Atenção', score: 125 }),
    )) as { skipped: string };
    expect(result).toEqual({ skipped: 'webhook-not-configured' });
  });

  it('posts to the webhook when status worsens and a URL is configured', async () => {
    mockParams.TEAMS_WEBHOOK_URL = 'https://example.com/hook';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    const result = (await onMemberStatusChanged(
      makeEvent(
        { status: 'Caminho Certo', score: 135, name: 'Ana', team: 'Diego' },
        { status: 'Alarme', score: 115, name: 'Ana', team: 'Diego' },
      ),
    )) as { notified: boolean };

    expect(result).toEqual({ notified: true });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/hook',
      expect.objectContaining({ method: 'POST', body: expect.stringContaining('Ana') }),
    );
  });
});

describe('purgeExpiredAuditLogs trigger', () => {
  it('does not remove data until a retention policy is configured', async () => {
    await expect(purgeExpiredAuditLogs()).resolves.toBeUndefined();
    expect(mockDb.collection).not.toHaveBeenCalled();
  });
});

describe('saveEvaluation callable', () => {
  const criteriaScores: Record<string, number> = {};
  let criteriaIndex = 0;
  for (const key of [
    '1-0', '1-1', '1-2', '1-3', '1-4',
    '2-0', '2-1', '2-2', '2-3', '2-4',
    '3-0', '3-1', '3-2', '3-3', '3-4',
    '4-0', '4-1', '4-2', '4-3', '4-4',
    '5-0', '5-1', '5-2', '5-3', '5-4',
    '6-0', '6-1', '6-2', '6-3', '6-4', '6-5',
  ]) {
    criteriaScores[key] = criteriaIndex++ < 29 ? 5 : 0;
  }

  const pdiGoals = [
    { id: 'goal1', title: 'Meta', deadline: '2026-03-01', status: 'pending', dueDate: '2026-04-01' },
  ];

  const basePayload = {
    member: {
      id: 'member1',
      score: 145,
      status: 'Voando',
      evaluationStatus: 'Concluído',
      pdiGoals,
      history: [{ month: '2026-Q2', score: 145 }],
    },
    evaluation: {
      id: 'evaluation_member1_2026_q2',
      memberId: 'member1',
      memberName: 'Ana Souza',
      leaderName: 'Carlos Lima',
      score: 145,
      status: 'Voando',
      cycle: '2026-Q2',
      comments: 'Ótimo ciclo',
      pdiGoals,
      criteriaScores,
    },
    expectedRevision: 0,
  };

  const leaderAuth = {
    uid: 'leader1',
    token: { email: 'leader@empresa.com.br', email_verified: true, role: 'leader' },
  };

  const memberRef = { __path: 'members/member1', name: 'members', id: 'member1' };
  const evaluationRef = { __path: 'evaluations/evaluation_member1_2026_q2', name: 'evaluations', id: 'evaluation_member1_2026_q2' };

  function mockTransaction(options: {
    memberExists?: boolean;
    memberArchived?: boolean;
    existingEvaluation?: Record<string, unknown> | null;
  } = {}) {
    const memberExists = options.memberExists ?? true;
    mockTx.get.mockImplementation(async (ref: { __path: string }) => {
      if (ref.__path === 'members/member1') {
        return {
          exists: memberExists,
          data: () => ({
            id: 'member1',
            name: 'Ana Souza',
            score: 140,
            status: 'Atenção',
            ...(options.memberArchived ? { deleted: true } : {}),
          }),
        };
      }
       if (ref.__path === 'evaluations/evaluation_member1_2026_q2') {
        if (!options.existingEvaluation) return { exists: false, data: () => undefined };
        return { exists: true, data: () => options.existingEvaluation };
      }
      return { exists: false, data: () => undefined };
    });
  }

  beforeEach(() => {
    mockTx.get.mockReset();
    mockTx.update.mockReset();
    mockTx.set.mockReset();
    mockTx.update.mockResolvedValue(undefined);
    mockTx.set.mockResolvedValue(undefined);
  });

  it('rejects unauthenticated callers', async () => {
    await expectHttpsError(
      () => saveEvaluation({ auth: null, data: basePayload }),
      'unauthenticated',
    );
  });

  it('rejects callers without role', async () => {
    await expectHttpsError(
      () => saveEvaluation({
        auth: { uid: 'other1', token: { email: 'other@empresa.com.br', email_verified: true } },
        data: basePayload,
      }),
      'permission-denied',
    );
  });

  it('rejects callers with unverified email', async () => {
    await expectHttpsError(
      () => saveEvaluation({
        auth: { uid: 'leader1', token: { email: 'leader@empresa.com.br', email_verified: false, role: 'leader' } },
        data: basePayload,
      }),
      'permission-denied',
    );
  });

  it('rejects pdiGoal element with unknown key (validação por elemento no servidor)', async () => {
    const malicious = [{
      id: 'goal1', title: 'Meta', deadline: '2026-03-01', status: 'pending', hacker: 'x',
    }];
    await expectHttpsError(
      () => saveEvaluation({
        auth: leaderAuth,
        data: {
          ...basePayload,
          member: { ...basePayload.member, pdiGoals: malicious },
          evaluation: { ...basePayload.evaluation, pdiGoals: malicious },
        },
      }),
      'invalid-argument',
      /pdiGoals/,
    );
  });

  it('rejects history element with non-number score', async () => {
    await expectHttpsError(
      () => saveEvaluation({
        auth: leaderAuth,
        data: {
          ...basePayload,
          member: { ...basePayload.member, history: [{ month: '2026-Q2', score: 'alta' }] },
        },
      }),
      'invalid-argument',
      /history/,
    );
  });

  it('rejects incomplete criteriaScores', async () => {
    const incomplete = { ...criteriaScores };
    delete incomplete['6-5'];
    await expectHttpsError(
      () => saveEvaluation({
        auth: leaderAuth,
        data: { ...basePayload, evaluation: { ...basePayload.evaluation, criteriaScores: incomplete } },
      }),
      'invalid-argument',
    );
  });

  it('rejects criteriaScore out of range', async () => {
    const outOfRange = { ...criteriaScores, '1-0': 6 };
    await expectHttpsError(
      () => saveEvaluation({
        auth: leaderAuth,
        data: { ...basePayload, evaluation: { ...basePayload.evaluation, criteriaScores: outOfRange } },
      }),
      'invalid-argument',
    );
  });

  it('rejects a criteria map with a valid-looking but unknown key', async () => {
    const withUnknownKey = { ...criteriaScores, '1-5': 5 };
    await expectHttpsError(
      () => saveEvaluation({
        auth: leaderAuth,
        data: { ...basePayload, evaluation: { ...basePayload.evaluation, criteriaScores: withUnknownKey } },
      }),
      'invalid-argument',
      /critério desconhecido/,
    );
  });

  it('rejects a score that does not equal the criteria total', async () => {
    const inconsistentScores = { ...criteriaScores, '1-0': 4 };
    await expectHttpsError(
      () => saveEvaluation({
        auth: leaderAuth,
        data: { ...basePayload, evaluation: { ...basePayload.evaluation, criteriaScores: inconsistentScores } },
      }),
      'invalid-argument',
      /soma dos critérios/,
    );
  });

  it('rejects a non-deterministic evaluation id', async () => {
    await expectHttpsError(
      () => saveEvaluation({
        auth: leaderAuth,
        data: { ...basePayload, evaluation: { ...basePayload.evaluation, id: 'another-evaluation' } },
      }),
      'invalid-argument',
      /determinístico/,
    );
  });

  it('rejects evaluation/member score divergence', async () => {
    await expectHttpsError(
      () => saveEvaluation({
        auth: leaderAuth,
        data: { ...basePayload, evaluation: { ...basePayload.evaluation, score: 130 } },
      }),
      'invalid-argument',
      /divergem/,
    );
  });

  it('rejects when member does not exist', async () => {
    mockTransaction({ memberExists: false });
    await expectHttpsError(
      () => saveEvaluation({ auth: leaderAuth, data: basePayload }),
      'not-found',
    );
  });

  it('rejects evaluations for archived members', async () => {
    mockTransaction({ memberArchived: true });
    await expectHttpsError(
      () => saveEvaluation({ auth: leaderAuth, data: basePayload }),
      'failed-precondition',
      /arquivado/,
    );
  });

  it('rejects revision conflict', async () => {
    mockTransaction({ existingEvaluation: { revision: 2, score: 140, status: 'Atenção' } });
    await expectHttpsError(
      () => saveEvaluation({ auth: leaderAuth, data: basePayload }),
      'failed-precondition',
      /evaluation-conflict/,
    );
  });

  it('saves a new evaluation and writes member + audit log', async () => {
    mockTransaction({});
    const result = await saveEvaluation({ auth: leaderAuth, data: basePayload });

    expect(result).toEqual({ revision: 1 });
    expect(mockTx.update).toHaveBeenCalledWith(
      memberRef,
      expect.objectContaining({
        score: 145,
        status: 'Voando',
        evaluationStatus: 'Concluído',
        pdiGoals,
        history: [{ month: '2026-Q2', score: 145 }],
      }),
    );
    expect(mockTx.set).toHaveBeenCalledWith(
      evaluationRef,
      expect.objectContaining({ id: 'evaluation_member1_2026_q2', revision: 1 }),
      { merge: true },
    );
    expect(mockTx.set).toHaveBeenCalledWith(
       { __path: 'auditLogs/audit_evaluation_member1_2026_q2_1', name: 'auditLogs', id: 'audit_evaluation_member1_2026_q2_1' },
      expect.objectContaining({
        action: 'evaluation_saved',
        actorId: 'leader1',
        actorEmail: 'leader@empresa.com.br',
        revision: 1,
      }),
    );
  });

  it('saves an update with incremented revision and previous values in audit log', async () => {
    mockTransaction({ existingEvaluation: { revision: 1, score: 140, status: 'Atenção' } });
    const result = await saveEvaluation({ auth: leaderAuth, data: { ...basePayload, expectedRevision: 1 } });

    expect(result).toEqual({ revision: 2 });
    expect(mockTx.set).toHaveBeenCalledWith(
       { __path: 'auditLogs/audit_evaluation_member1_2026_q2_2', name: 'auditLogs', id: 'audit_evaluation_member1_2026_q2_2' },
      expect.objectContaining({
        revision: 2,
        previousScore: 140,
        previousStatus: 'Atenção',
      }),
    );
  });

  it('allows an admin caller as well', async () => {
    mockTransaction({});
    const result = await saveEvaluation({
      auth: { uid: 'admin1', token: { email: 'admin@empresa.com.br', email_verified: true, role: 'admin' } },
      data: basePayload,
    });
    expect(result).toEqual({ revision: 1 });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});
