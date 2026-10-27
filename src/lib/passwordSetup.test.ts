import { describe, expect, it } from 'vitest';
import { MIN_PASSWORD_LENGTH, parseAuthLink, validateNewPassword } from './passwordSetup';

describe('parseAuthLink', () => {
  it('reconhece o link de convite e o de recuperação de senha', () => {
    expect(parseAuthLink('#access_token=a&refresh_token=b&type=invite')).toEqual({ type: 'invite', failed: false });
    expect(parseAuthLink('#access_token=a&type=recovery')).toEqual({ type: 'recovery', failed: false });
  });

  it('ignora o que não é link de senha', () => {
    expect(parseAuthLink('')).toEqual({ type: null, failed: false });
    expect(parseAuthLink('#/ranking')).toEqual({ type: null, failed: false });
    expect(parseAuthLink('#access_token=a&type=signup')).toEqual({ type: null, failed: false });
  });

  it('marca link expirado ou inválido', () => {
    const expired = '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired';
    expect(parseAuthLink(expired)).toEqual({ type: null, failed: true });
    expect(parseAuthLink('?error=access_denied&type=recovery')).toEqual({ type: 'recovery', failed: true });
  });
});

describe('validateNewPassword', () => {
  it('exige a senha, o tamanho mínimo e a confirmação igual', () => {
    expect(validateNewPassword('', '')).toBe('Informe a nova senha.');
    expect(validateNewPassword('abc12', 'abc12')).toBe(`A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
    expect(validateNewPassword('senha-forte-1', 'senha-forte-2')).toBe('As senhas não são iguais.');
    expect(validateNewPassword('senha-forte-1', 'senha-forte-1')).toBeNull();
  });

  it('aceita exatamente o tamanho mínimo', () => {
    const exact = 'a'.repeat(MIN_PASSWORD_LENGTH);
    expect(validateNewPassword(exact, exact)).toBeNull();
    expect(validateNewPassword(exact.slice(1), exact.slice(1))).not.toBeNull();
  });
});
