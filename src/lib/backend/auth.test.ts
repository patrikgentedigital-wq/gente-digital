import { beforeEach, describe, expect, it, vi } from 'vitest';

const fake = vi.hoisted(() => ({
  auth: {
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(),
    getSession: vi.fn(),
    updateUser: vi.fn(),
    resetPasswordForEmail: vi.fn(),
  },
  profileResult: { data: null as unknown, error: null as unknown },
}));

vi.mock('./client', () => ({
  getSupabase: () => ({
    auth: fake.auth,
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => fake.profileResult }) }),
    }),
  }),
}));

import {
  getCurrentProfile,
  getCurrentUserRole,
  loginWithEmailAndPassword,
  logoutLeader,
  sendPasswordReset,
  subscribeToAuth,
  updatePassword,
} from './auth';

const user = { id: 'u1', email: 'lider@empresa.com' };

beforeEach(() => {
  vi.clearAllMocks();
  fake.profileResult = { data: null, error: null };
});

describe('getCurrentUserRole', () => {
  it('devolve o papel do perfil', async () => {
    fake.profileResult = { data: { role: 'admin', team_id: null, name: 'Ana' }, error: null };
    expect(await getCurrentUserRole(user)).toBe('admin');
  });

  it('devolve null quando não há perfil', async () => {
    expect(await getCurrentUserRole(user)).toBeNull();
  });

  it('propaga erro de consulta', async () => {
    fake.profileResult = { data: null, error: new Error('falha de rede') };
    await expect(getCurrentUserRole(user)).rejects.toThrow('falha de rede');
  });
});

describe('getCurrentProfile', () => {
  it('devolve papel, equipe e nome', async () => {
    fake.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
    fake.profileResult = { data: { role: 'leader', team_id: 'Brenda', name: 'Brenda' }, error: null };
    expect(await getCurrentProfile()).toEqual({ role: 'leader', teamId: 'Brenda', name: 'Brenda' });
  });
});

describe('loginWithEmailAndPassword', () => {
  it('entra e devolve o usuário e o nome do líder', async () => {
    fake.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: 'u1', email: 'lider@empresa.com' } }, error: null });
    fake.profileResult = { data: { role: 'leader', team_id: 'Brenda', name: 'Brenda Luena' }, error: null };
    const result = await loginWithEmailAndPassword('lider@empresa.com', 'segredo');
    expect(result).toEqual({ user, leaderName: 'Brenda Luena' });
  });

  it('traduz credenciais erradas', async () => {
    fake.auth.signInWithPassword.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid login credentials' } });
    await expect(loginWithEmailAndPassword('a@b.c', 'x')).rejects.toThrow('INVALID_CREDENTIALS');
  });

  it('traduz e-mail não confirmado', async () => {
    fake.auth.signInWithPassword.mockResolvedValue({ data: { user: null }, error: { message: 'Email not confirmed' } });
    await expect(loginWithEmailAndPassword('a@b.c', 'x')).rejects.toThrow('EMAIL_NOT_VERIFIED');
  });

  it('sai da sessão e recusa conta sem perfil', async () => {
    fake.auth.signInWithPassword.mockResolvedValue({ data: { user: { id: 'u1', email: 'lider@empresa.com' } }, error: null });
    fake.auth.signOut.mockResolvedValue({ error: null });
    await expect(loginWithEmailAndPassword('lider@empresa.com', 'segredo')).rejects.toThrow('ROLE_NOT_AUTHORIZED');
    expect(fake.auth.signOut).toHaveBeenCalled();
  });
});

describe('subscribeToAuth', () => {
  it('avisa o usuário, avisa null sem sessão e devolve como cancelar', () => {
    const unsubscribe = vi.fn();
    let listener: (event: string, session: { user: { id: string; email: string } } | null) => void = () => {};
    fake.auth.onAuthStateChange.mockImplementation((cb) => {
      listener = cb;
      return { data: { subscription: { unsubscribe } } };
    });
    const seen: Array<unknown> = [];
    const stop = subscribeToAuth((value) => seen.push(value));
    listener('INITIAL_SESSION', { user: { id: 'u1', email: 'lider@empresa.com' } });
    listener('SIGNED_OUT', null);
    expect(seen).toEqual([user, null]);
    stop();
    expect(unsubscribe).toHaveBeenCalled();
  });
});

describe('logoutLeader', () => {
  it('encerra a sessão', async () => {
    fake.auth.signOut.mockResolvedValue({ error: null });
    await logoutLeader();
    expect(fake.auth.signOut).toHaveBeenCalled();
  });
});

describe('updatePassword', () => {
  it('grava a senha nova na conta logada', async () => {
    fake.auth.updateUser.mockResolvedValue({ data: {}, error: null });
    await updatePassword('senha-forte-1');
    expect(fake.auth.updateUser).toHaveBeenCalledWith({ password: 'senha-forte-1' });
  });

  it('traduz senha igual à anterior e esconde erros desconhecidos', async () => {
    fake.auth.updateUser.mockResolvedValue({ data: null, error: { message: 'New password should be different from the old password.' } });
    await expect(updatePassword('x')).rejects.toThrow('A nova senha precisa ser diferente da anterior.');

    fake.auth.updateUser.mockResolvedValue({ data: null, error: { message: 'algo interno do servidor' } });
    await expect(updatePassword('x')).rejects.toThrow('Não foi possível salvar a senha. Tente de novo.');
  });
});

describe('sendPasswordReset', () => {
  it('pede o link de recuperação para o e-mail informado', async () => {
    fake.auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    await sendPasswordReset('lider@empresa.com');
    expect(fake.auth.resetPasswordForEmail).toHaveBeenCalledWith('lider@empresa.com', expect.anything());
  });

  it('avisa quando há pedidos demais e não revela se o e-mail existe', async () => {
    fake.auth.resetPasswordForEmail.mockResolvedValue({ data: null, error: { message: 'email rate limit exceeded' } });
    await expect(sendPasswordReset('a@b.c')).rejects.toThrow('Aguarde um pouco antes de pedir outro link.');

    fake.auth.resetPasswordForEmail.mockResolvedValue({ data: null, error: { message: 'User not found' } });
    await expect(sendPasswordReset('a@b.c')).resolves.toBeUndefined();
  });
});
