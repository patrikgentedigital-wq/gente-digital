export const MIN_PASSWORD_LENGTH = 8;

export interface AuthLink {
  /** Tipo de link de senha que o Supabase colocou no endereço: convite ou recuperação. */
  type: 'invite' | 'recovery' | null;
  /** O link veio com erro (expirado, já usado ou inválido). */
  failed: boolean;
}

/** Lê o trecho do endereço (hash ou query) para saber se a pessoa chegou por convite ou recuperação de senha. */
export function parseAuthLink(hash: string): AuthLink {
  const params = new URLSearchParams(hash.replace(/^[#?]/, ''));
  const rawType = params.get('type');
  return {
    type: rawType === 'invite' || rawType === 'recovery' ? rawType : null,
    failed: params.has('error') || params.has('error_code'),
  };
}

/** Mensagem de erro em português, ou null quando a senha e a confirmação são aceitáveis. */
export function validateNewPassword(password: string, confirmation: string): string | null {
  if (!password) return 'Informe a nova senha.';
  if (password.length < MIN_PASSWORD_LENGTH) return `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  if (password !== confirmation) return 'As senhas não são iguais.';
  return null;
}
