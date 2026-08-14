export const VALID_ROLES = ['leader', 'admin'] as const;
export const ROLE_LEADER = 'leader';
export const ROLE_ADMIN = 'admin';

export type AppRole = (typeof VALID_ROLES)[number];

export type RoleInputErrorKind = 'invalid-input' | 'invalid-email' | 'invalid-role';

export class RoleInputError extends Error {
  readonly kind: RoleInputErrorKind;

  constructor(kind: RoleInputErrorKind, message: string) {
    super(message);
    this.name = 'RoleInputError';
    this.kind = kind;
  }
}

export interface RoleInput {
  email: string;
  role: AppRole | null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && (VALID_ROLES as readonly string[]).includes(value);
}

export function isValidEmail(value: string): boolean {
  return value.length > 0 && value.length <= 254 && EMAIL_PATTERN.test(value);
}

export function parseRoleInput(data: unknown): RoleInput {
  if (typeof data !== 'object' || data === null) {
    throw new RoleInputError('invalid-input', 'Payload inválido: esperado { email, role }.');
  }

  const { email, role } = data as Record<string, unknown>;

  if (typeof email !== 'string' || !isValidEmail(email)) {
    throw new RoleInputError('invalid-email', 'E-mail inválido.');
  }

  if (role !== null && !isAppRole(role)) {
    throw new RoleInputError('invalid-role', 'Role inválida: use "leader", "admin" ou null.');
  }

  return {
    email: email.trim().toLowerCase(),
    role: (role as AppRole | null) ?? null,
  };
}