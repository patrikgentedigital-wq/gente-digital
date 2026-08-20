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
  const mockDb = {
    collection: vi.fn(),
    batch: vi.fn(),
  };
  return {
    HttpsError,
    mockAuth,
    mockDb,
    mockParams: {
      BOOTSTRAP_ADMIN_EMAIL: '',
      TEAMS_WEBHOOK_URL: '',
    } as Record<string, string>,
  };
});

const { mockAuth, mockParams } = hoisted;

vi.mock('firebase-admin/app', () => ({ initializeApp: vi.fn() }));
vi.mock('firebase-admin/auth', () => ({ getAuth: () => mockAuth }));
vi.mock('firebase-admin/firestore', () => ({ getFirestore: () => hoisted.mockDb }));

vi.mock('firebase-functions/v2/https', () => ({
  HttpsError: hoisted.HttpsError,
  onCall: <T>(fn: T): T => fn,
}));

vi.mock('firebase-functions/v2/firestore', () => ({
  onDocumentDeleted: (_opts: unknown, fn: (event: never) => unknown) => fn,
  onDocumentUpdated: (_opts: unknown, fn: (event: never) => unknown) => fn,
}));

vi.mock('firebase-functions/params', () => ({
  defineString: (name: string) => {
    const param = () => mockParams[name];
    param.value = () => mockParams[name];
    return param;
  },
}));

import {
  setUserRole as setUserRoleRaw,
  bootstrapFirstAdmin as bootstrapFirstAdminRaw,
  onMemberStatusChanged as onMemberStatusChangedRaw,
} from './index';

type CallableRequestLike = { auth: { uid: string } | null; data: unknown };
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

afterEach(() => {
  vi.unstubAllGlobals();
});