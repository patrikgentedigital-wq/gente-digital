import { describe, expect, it } from 'vitest';
import {
  isAppRole,
  isValidEmail,
  parseRoleInput,
  RoleInputError,
} from './roles';

describe('role input validation', () => {
  it('accepts a valid leader assignment', () => {
    expect(parseRoleInput({ email: 'Lider@Empresa.com.br', role: 'leader' })).toEqual({
      email: 'lider@empresa.com.br',
      role: 'leader',
    });
  });

  it('accepts a valid admin assignment', () => {
    expect(parseRoleInput({ email: 'admin@empresa.com.br', role: 'admin' })).toEqual({
      email: 'admin@empresa.com.br',
      role: 'admin',
    });
  });

  it('accepts null to remove a role', () => {
    expect(parseRoleInput({ email: 'x@empresa.com.br', role: null })).toEqual({
      email: 'x@empresa.com.br',
      role: null,
    });
  });

  it('requires an explicit null to remove a role', () => {
    expect(() => parseRoleInput({ email: 'x@empresa.com.br' }))
      .toThrowError(/Role inválida/);
  });

  it('rejects unknown role values', () => {
    expect(() => parseRoleInput({ email: 'x@empresa.com.br', role: 'superadmin' }))
      .toThrowError(RoleInputError);
    expect(() => parseRoleInput({ email: 'x@empresa.com.br', role: 'superadmin' }))
      .toThrowError(/Role inválida/);
  });

  it('rejects malformed emails', () => {
    expect(() => parseRoleInput({ email: 'not-an-email', role: 'leader' }))
      .toThrowError(/E-mail inválido/);
    expect(() => parseRoleInput({ email: 'x@y', role: 'leader' }))
      .toThrowError(/E-mail inválido/);
  });

  it('rejects non-object payloads and missing email', () => {
    expect(() => parseRoleInput(null)).toThrowError(/Payload inválido/);
    expect(() => parseRoleInput('leader')).toThrowError(/Payload inválido/);
    expect(() => parseRoleInput({ role: 'leader' })).toThrowError(/E-mail inválido/);
  });

  it('classifies app roles and emails correctly', () => {
    expect(isAppRole('leader')).toBe(true);
    expect(isAppRole('admin')).toBe(true);
    expect(isAppRole('viewer')).toBe(false);
    expect(isAppRole(1)).toBe(false);
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('')).toBe(false);
  });
});