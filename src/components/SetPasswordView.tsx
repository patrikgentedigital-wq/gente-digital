import React, { useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import logo from '../assets/gente-digital-logo.svg';
import { updatePassword } from '../lib/backend';
import { MIN_PASSWORD_LENGTH, validateNewPassword } from '../lib/passwordSetup';
import { toast } from '../utils/toastUtils';

interface SetPasswordViewProps {
  onDone: () => void;
}

const inputClass =
  'w-full bg-surface-2 border border-line rounded-xl pl-9 pr-3 py-2.5 text-xs text-ink focus:outline-none focus:border-accent';

/** Tela de quem chegou pelo link de convite ou de recuperação: define a senha e segue para o sistema. */
export const SetPasswordView: React.FC<SetPasswordViewProps> = ({ onDone }) => {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const problem = validateNewPassword(password, confirmation);
    setError(problem);
    if (problem) return;

    setSaving(true);
    try {
      await updatePassword(password);
      toast.success('Senha criada. Você já está dentro do sistema.', 'Senha');
      onDone();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a senha. Tente de novo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-surface rounded-3xl p-6 space-y-5" noValidate>
        <img src={logo} alt="Gente Digital" className="h-12 w-auto" />
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Crie a sua senha</h1>
          <p className="mt-1 text-sm text-muted">
            Escolha uma senha para entrar no sistema. Use pelo menos {MIN_PASSWORD_LENGTH} caracteres.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="new-password" className="block text-xs font-semibold text-muted">Nova senha</label>
          <div className="relative">
            <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden="true" />
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirm-password" className="block text-xs font-semibold text-muted">Repita a nova senha</label>
          <div className="relative">
            <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-faint" aria-hidden="true" />
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {error && (
          <p className="bg-danger-soft border border-danger/40 text-danger-ink text-xs p-3 rounded-xl" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-accent-ink font-bold text-xs py-3 rounded-brand flex items-center justify-center gap-2 cursor-pointer"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Salvando...
            </>
          ) : (
            'Salvar senha'
          )}
        </button>
      </form>
    </main>
  );
};
