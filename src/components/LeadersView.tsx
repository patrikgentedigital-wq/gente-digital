import React, { useCallback, useEffect, useState } from 'react';
import { Mail, Trash2, UserPlus } from 'lucide-react';
import { changeLeaderTeam, inviteLeader, listLeaderAccounts, removeLeaderAccess, type LeaderOverview } from '../lib/backend';
import { toast } from '../utils/toastUtils';
import { ConfirmModal } from './ConfirmModal';

interface LeadersViewProps {
  /** Quem está usando a tela: não aparece o botão de tirar o próprio acesso. */
  currentUserId: string;
}

const inputClass =
  'w-full bg-surface-2 border border-line rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-accent';

const ACTION_LABELS: Record<string, string> = {
  leader_invited: 'Convite enviado',
  leader_team_changed: 'Equipe do líder trocada',
  leader_access_removed: 'Acesso removido',
  member_team_changed: 'Colaborador trocou de time',
  member_job_changed: 'Colaborador trocou de cargo',
  member_renamed: 'Colaborador renomeado',
  member_archived: 'Colaborador arquivado',
  member_restored: 'Colaborador restaurado',
  criteria_saved: 'Perguntas salvas',
  member_created: 'Colaborador cadastrado',
  team_created: 'Equipe criada',
  team_changed: 'Equipe alterada',
  profile_created: 'Acesso criado',
  profile_changed: 'Acesso alterado',
  profile_removed: 'Acesso removido',
};

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

/** Aba Líderes (só admin): quem tem acesso ao quadro, convites e troca de equipe. */
export const LeadersView: React.FC<LeadersViewProps> = ({ currentUserId }) => {
  const [overview, setOverview] = useState<LeaderOverview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'leader'>('leader');
  const [team, setTeam] = useState('');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<{ userId: string; name: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setOverview(await listLeaderAccounts());
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar os acessos.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const canSend = email.trim() !== '' && name.trim() !== '' && (role === 'admin' || team !== '') && !sending;

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSend) return;
    setSending(true);
    setFormError(null);
    try {
      const result = await inviteLeader({ email, nome: name, papel: role, equipe: role === 'admin' ? null : team });
      toast.success(
        result.invited ? `Convite enviado para ${email.trim()}.` : `${email.trim()} já tinha conta e agora tem acesso.`,
        'Acessos',
      );
      setEmail('');
      setName('');
      setTeam('');
      await load();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível enviar o convite.');
    } finally {
      setSending(false);
    }
  };

  const handleTeamChange = async (userId: string, nextTeam: string) => {
    try {
      await changeLeaderTeam(userId, nextTeam);
      toast.success('Equipe do líder atualizada.', 'Acessos');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível trocar a equipe.');
      await load();
    }
  };

  const confirmRemoval = async () => {
    const target = pendingRemoval;
    setPendingRemoval(null);
    if (!target) return;
    try {
      await removeLeaderAccess(target.userId);
      toast.success(`${target.name} não tem mais acesso ao quadro.`, 'Acessos');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível tirar o acesso.');
    }
  };

  return (
    <div className="w-full max-w-[1040px] mx-auto pb-16 font-sans space-y-6">
      <header className="blk p-6">
        <h2 className="font-display text-2xl font-semibold text-ink">Líderes e acessos</h2>
        <p className="mt-1 text-sm text-muted">
          Quem pode entrar no quadro e qual equipe cada líder avalia. O líder recebe um convite por e-mail e cria a própria senha.
        </p>
      </header>

      <form onSubmit={handleInvite} className="blk p-4 space-y-3" aria-label="Convidar pessoa">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <UserPlus className="w-4 h-4" /> Convidar pessoa
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label htmlFor="leader-email" className="block text-xs font-semibold text-muted mb-1.5">E-mail</label>
            <input id="leader-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="leader-name" className="block text-xs font-semibold text-muted mb-1.5">Nome</label>
            <input id="leader-name" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="leader-role" className="block text-xs font-semibold text-muted mb-1.5">Papel</label>
            <select id="leader-role" value={role} onChange={(event) => setRole(event.target.value as 'admin' | 'leader')} className={inputClass}>
              <option value="leader">Líder (avalia só a equipe dele)</option>
              <option value="admin">Admin (vê e edita tudo)</option>
            </select>
          </div>
          {role === 'leader' && (
            <div>
              <label htmlFor="leader-team" className="block text-xs font-semibold text-muted mb-1.5">Equipe do líder</label>
              <select id="leader-team" value={team} onChange={(event) => setTeam(event.target.value)} className={inputClass}>
                <option value="">Escolha uma equipe</option>
                {(overview?.teams ?? []).map((id) => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        {formError && (
          <div className="bg-danger-soft border border-danger/40 text-danger-ink text-xs p-3 rounded-xl" role="alert">{formError}</div>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!canSend}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold bg-accent text-accent-ink hover:bg-accent-hover disabled:opacity-40 cursor-pointer"
          >
            <Mail className="w-4 h-4" /> {sending ? 'Enviando...' : 'Enviar convite'}
          </button>
        </div>
      </form>

      {loadError && <p className="text-sm text-danger" role="alert">{loadError}</p>}
      {!overview && !loadError && <p className="text-sm text-muted" role="status">Carregando acessos...</p>}

      {overview && (
        <section className="blk p-4 space-y-3" aria-label="Contas com acesso">
          <h3 className="text-sm font-semibold text-ink">Contas com acesso ({overview.accounts.length})</h3>
          <ul className="divide-y divide-line">
            {overview.accounts.map((account) => (
              <li key={account.userId} className="py-3 flex flex-wrap items-center gap-3">
                <div className="min-w-[200px] flex-1">
                  <div className="text-sm font-semibold text-ink">{account.name || account.email}</div>
                  <div className="text-xs text-muted">{account.email}</div>
                </div>
                <span className="text-xs font-semibold text-ink">{account.role === 'admin' ? 'Admin' : 'Líder'}</span>
                {account.role === 'leader' && (
                  <select
                    aria-label={`Equipe de ${account.name || account.email}`}
                    value={account.teamId ?? ''}
                    onChange={(event) => handleTeamChange(account.userId, event.target.value)}
                    className={`${inputClass} !w-44`}
                  >
                    {account.teamId === null && <option value="">Sem equipe</option>}
                    {overview.teams.map((id) => (
                      <option key={id} value={id}>{id}</option>
                    ))}
                  </select>
                )}
                <span className="text-xs text-muted min-w-[120px]">
                  {account.confirmed ? (account.lastSignInAt ? `Entrou em ${formatDate(account.lastSignInAt)}` : 'Conta ativa') : 'Convite pendente'}
                </span>
                {account.userId !== currentUserId && (
                  <button
                    type="button"
                    aria-label={`Tirar acesso de ${account.name || account.email}`}
                    onClick={() => setPendingRemoval({ userId: account.userId, name: account.name || account.email })}
                    className="p-1.5 rounded-lg border border-line bg-app text-muted hover:text-danger hover:border-danger cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {overview && overview.history.length > 0 && (
        <section className="blk p-4 space-y-3" aria-label="Histórico de mudanças">
          <h3 className="text-sm font-semibold text-ink">Histórico de mudanças</h3>
          <ul className="space-y-1.5 text-xs">
            {overview.history.map((entry) => (
              <li key={entry.id} className="flex flex-wrap gap-x-2 text-muted">
                <span className="font-mono">{formatDate(entry.at)}</span>
                <span className="font-semibold text-ink">{ACTION_LABELS[entry.action] ?? entry.action}</span>
                <span>{entry.subject}</span>
                {entry.by && <span>· por {entry.by}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <ConfirmModal
        isOpen={pendingRemoval !== null}
        title="Tirar o acesso?"
        message={`${pendingRemoval?.name ?? 'A pessoa'} não vai mais conseguir entrar no quadro. A conta fica guardada e você pode dar acesso de novo depois.`}
        confirmLabel="Tirar acesso"
        onClose={() => setPendingRemoval(null)}
        onConfirm={confirmRemoval}
      />
    </div>
  );
};
