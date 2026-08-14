import React, { useState } from 'react';
import { X, Lock, ShieldCheck, Mail, ArrowRight, KeyRound, AlertCircle, Loader2 } from 'lucide-react';
import { loginWithEmailAndPassword } from '../lib/firebase';

interface LeaderLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (leaderName: string) => void;
}

export const LeaderLoginModal: React.FC<LeaderLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const credential = await loginWithEmailAndPassword(email.trim(), password);
      const leaderName = credential.user.displayName || credential.user.email || 'Líder';
      onLoginSuccess(leaderName);
      onClose();
    } catch (error: any) {
      console.error('Login error:', error);
      if (error?.message === 'EMAIL_NOT_VERIFIED') {
        setErrorMsg('Confirme o e-mail da conta antes de acessar a área do líder.');
      } else if (error?.code === 'auth/invalid-credential') {
        setErrorMsg('E-mail ou senha inválidos.');
      } else {
        setErrorMsg('Não foi possível autenticar. Verifique a conexão e as credenciais.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#050912]/80 backdrop-blur-sm p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="bg-[#0F1E38] border border-[#22365C] w-full max-w-md rounded-2xl p-6 shadow-2xl relative flex flex-col gap-5 text-[#F2F5FA]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leader-login-title"
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E3A73B]/10 border border-[#E3A73B]/30 flex items-center justify-center text-[#E3A73B]">
              <Lock className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 id="leader-login-title" className="font-display font-bold text-xl text-white">Área do Líder</h3>
              <p className="text-xs text-[#A9B7CE]">Autenticação via Firebase</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar autenticação"
            className="text-[#6C7C99] hover:text-white p-1 rounded-lg hover:bg-[#14294A] transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <p className="text-xs text-[#A9B7CE] leading-relaxed">
          Acesso reservado a líderes provisionados no Firebase Authentication.
        </p>

        {errorMsg && (
          <div className="bg-[#3A1620] border border-[#e2687a]/40 text-[#e2687a] text-xs p-3 rounded-xl flex items-center gap-2" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="leader-email" className="block text-xs font-semibold text-[#A9B7CE]">E-mail corporativo</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6C7C99]" aria-hidden="true" />
              <input
                id="leader-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="lider@gentedigital.com.br"
                autoComplete="username"
                className="w-full bg-[#14294A] border border-[#22365C] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#E3A73B]"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="leader-password" className="block text-xs font-semibold text-[#A9B7CE]">Senha de acesso</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6C7C99]" aria-hidden="true" />
              <input
                id="leader-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="w-full bg-[#14294A] border border-[#22365C] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#E3A73B]"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#E3A73B] hover:bg-[#eeb64f] disabled:opacity-50 text-[#1a1200] font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                Autenticando...
              </>
            ) : (
              <>
                Autenticar e entrar
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <div className="text-[11px] text-[#6C7C99] leading-relaxed bg-[#14294A] p-3 rounded-xl border border-[#22365C] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#4fb579] shrink-0" aria-hidden="true" />
          <span>A sessão é autorizada pelo token do Firebase Auth e pelas Rules do Firestore.</span>
        </div>
      </div>
    </div>
  );
};
