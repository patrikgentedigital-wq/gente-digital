import { describe, expect, it } from 'vitest';
import { checkRemoveAccess, parseRequest } from './logic';

describe('parseRequest', () => {
  it('aceita um convite de líder com e-mail, nome e equipe', () => {
    const result = parseRequest({ acao: 'convidar', email: '  Ana@Empresa.com ', nome: ' Ana ', papel: 'leader', equipe: 'Brenda' });
    expect(result).toEqual({ ok: true, value: { acao: 'convidar', email: 'ana@empresa.com', nome: 'Ana', papel: 'leader', equipe: 'Brenda' } });
  });

  it('convite de admin não leva equipe', () => {
    const result = parseRequest({ acao: 'convidar', email: 'a@b.co', nome: 'Admin', papel: 'admin', equipe: 'Brenda' });
    expect(result).toEqual({ ok: true, value: { acao: 'convidar', email: 'a@b.co', nome: 'Admin', papel: 'admin', equipe: null } });
  });

  it('líder precisa de equipe', () => {
    expect(parseRequest({ acao: 'convidar', email: 'a@b.co', nome: 'Ana', papel: 'leader' })).toEqual({ ok: false, error: 'equipe_obrigatoria' });
  });

  it.each(['', 'sem-arroba', 'a@b', 'a b@c.com', 'x'.repeat(250) + '@b.co'])('recusa e-mail inválido: %s', (email) => {
    expect(parseRequest({ acao: 'convidar', email, nome: 'Ana', papel: 'leader', equipe: 'Brenda' })).toEqual({ ok: false, error: 'email_invalido' });
  });

  it('recusa papel desconhecido e nome vazio', () => {
    expect(parseRequest({ acao: 'convidar', email: 'a@b.co', nome: 'Ana', papel: 'dono', equipe: 'x' })).toEqual({ ok: false, error: 'papel_invalido' });
    expect(parseRequest({ acao: 'convidar', email: 'a@b.co', nome: '   ', papel: 'leader', equipe: 'x' })).toEqual({ ok: false, error: 'nome_invalido' });
  });

  it('aceita listar, trocar equipe e remover acesso', () => {
    expect(parseRequest({ acao: 'listar' })).toEqual({ ok: true, value: { acao: 'listar' } });
    expect(parseRequest({ acao: 'trocar_equipe', userId: 'u1', equipe: 'Danielle' })).toEqual({
      ok: true,
      value: { acao: 'trocar_equipe', userId: 'u1', equipe: 'Danielle' },
    });
    expect(parseRequest({ acao: 'remover_acesso', userId: 'u1' })).toEqual({ ok: true, value: { acao: 'remover_acesso', userId: 'u1' } });
  });

  it('recusa ação desconhecida e corpo que não é objeto', () => {
    expect(parseRequest({ acao: 'apagar_tudo' })).toEqual({ ok: false, error: 'acao_invalida' });
    expect(parseRequest(null)).toEqual({ ok: false, error: 'acao_invalida' });
    expect(parseRequest('texto')).toEqual({ ok: false, error: 'acao_invalida' });
  });

  it('trocar equipe e remover acesso exigem o usuário', () => {
    expect(parseRequest({ acao: 'trocar_equipe', equipe: 'Danielle' })).toEqual({ ok: false, error: 'usuario_invalido' });
    expect(parseRequest({ acao: 'remover_acesso', userId: '' })).toEqual({ ok: false, error: 'usuario_invalido' });
  });
});

describe('checkRemoveAccess', () => {
  const admins = ['admin-1', 'admin-2'];

  it('não deixa o admin remover o próprio acesso', () => {
    expect(checkRemoveAccess({ callerId: 'admin-1', targetId: 'admin-1', targetRole: 'admin', adminIds: admins })).toBe('nao_remover_a_si_mesmo');
  });

  it('não deixa remover o último admin', () => {
    expect(checkRemoveAccess({ callerId: 'admin-2', targetId: 'admin-1', targetRole: 'admin', adminIds: ['admin-1'] })).toBe('ultimo_admin');
  });

  it('permite remover um líder, ou um admin quando sobram outros', () => {
    expect(checkRemoveAccess({ callerId: 'admin-1', targetId: 'lider-1', targetRole: 'leader', adminIds: admins })).toBeNull();
    expect(checkRemoveAccess({ callerId: 'admin-1', targetId: 'admin-2', targetRole: 'admin', adminIds: admins })).toBeNull();
  });
});
