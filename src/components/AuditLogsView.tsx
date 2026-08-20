import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { EvaluationAuditLog, TeamMember } from '../types';
import { getArchivedMembersFromFirestore, subscribeToAuditLogs } from '../lib/firebaseLoader';
import { FileSearch, ShieldCheck, AlertTriangle, ArchiveRestore, RotateCcw, Search, ChevronDown } from 'lucide-react';
import { Skeleton } from './Skeleton';

const STATUS_COLORS: Record<string, string> = {
  Voando: 'text-success',
  'Caminho Certo': 'text-info',
  Atenção: 'text-accent',
  Alarme: 'text-danger',
};

function formatTimestamp(value: unknown): string {
  if (value && typeof value === 'object' && 'toDate' in value) {
    try {
      return (value as { toDate: () => Date }).toDate().toLocaleString('pt-BR');
    } catch {
      // fall through to generic formatting
    }
  }
  return String(value ?? '—');
}

interface AuditLogsViewProps {
  members: { id: string; name: string }[];
  onRestoreMember: (memberId: string) => Promise<void>;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ members, onRestoreMember }) => {
  const [logs, setLogs] = useState<EvaluationAuditLog[]>([]);
  const [memberFilter, setMemberFilter] = useState<string>('all');
  const [cycleFilter, setCycleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [maxResults, setMaxResults] = useState(200);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [archivedMembers, setArchivedMembers] = useState<TeamMember[]>([]);
  const [archivedError, setArchivedError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToAuditLogs(
      (nextLogs) => {
        setLogs(nextLogs);
        setError(null);
        setIsLoading(false);
      },
      (err) => {
        console.error('Unable to load audit logs:', err);
        setError('Não foi possível carregar o histórico de auditoria.');
        setIsLoading(false);
      },
      maxResults,
    );
    return unsubscribe;
  }, [maxResults]);

  const loadArchived = useCallback(async () => {
    try {
      const archived = await getArchivedMembersFromFirestore();
      setArchivedMembers(archived);
      setArchivedError(null);
    } catch (err) {
      console.error('Unable to load archived members:', err);
      setArchivedError('Não foi possível carregar os membros arquivados.');
    }
  }, []);

  useEffect(() => {
    void loadArchived();
  }, [loadArchived]);

  const handleRestore = async (memberId: string) => {
    setRestoringId(memberId);
    try {
      await onRestoreMember(memberId);
      setArchivedMembers((previous) => previous.filter((m) => m.id !== memberId));
    } finally {
      setRestoringId(null);
    }
  };

  const cycles = useMemo(() => {
    const seen = new Set<string>();
    for (const log of logs) {
      if (log.cycle) seen.add(log.cycle);
    }
    return [...seen].sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return logs.filter((log) => {
      if (memberFilter !== 'all' && log.memberId !== memberFilter) return false;
      if (cycleFilter !== 'all' && log.cycle !== cycleFilter) return false;
      if (query) {
        const actor = `${log.actorName || ''} ${log.actorEmail || ''} ${log.actorId || ''}`.toLowerCase();
        if (!memberName(log).toLowerCase().includes(query) && !actor.includes(query)) return false;
      }
      return true;
    });
  }, [logs, memberFilter, cycleFilter, searchQuery]);

  const memberName = (log: EvaluationAuditLog) => {
    const member = members.find((m) => m.id === log.memberId);
    return member?.name || log.memberName || log.memberId;
  };

  return (
    <div className="w-full max-w-[1040px] mx-auto pb-16 font-sans">
      <div className="bg-surface border border-line p-6 rounded-2xl mb-6 shadow-xl">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-5 h-5 text-success" />
          <h2 className="font-display font-bold text-2xl text-white">Trilha de Auditoria</h2>
        </div>
        <p className="text-xs text-muted mt-0.5">
          Registro imutável de avaliações salvas: quem alterou o quê e quando.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-surface border border-line p-4 rounded-xl mb-6 shadow-lg">
        <label className="block">
          <span className="block text-xs font-mono font-semibold text-muted mb-2 uppercase">Filtrar por membro</span>
          <select
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            className="w-full bg-surface-2 border border-line text-white font-sans text-sm p-3 rounded-xl focus:outline-none focus:border-accent"
          >
            <option value="all">Todos os membros</option>
            {[...members]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-mono font-semibold text-muted mb-2 uppercase">Filtrar por ciclo</span>
          <select
            value={cycleFilter}
            onChange={(e) => setCycleFilter(e.target.value)}
            className="w-full bg-surface-2 border border-line text-white font-sans text-sm p-3 rounded-xl focus:outline-none focus:border-accent"
          >
            <option value="all">Todos os ciclos</option>
            {cycles.map((cycle) => (
              <option key={cycle} value={cycle}>
                {cycle}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs font-mono font-semibold text-muted mb-2 uppercase">Buscar</span>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Membro, ator ou e-mail..."
              className="w-full bg-surface-2 border border-line text-white font-sans text-sm pl-9 pr-3 py-3 rounded-xl focus:outline-none focus:border-accent placeholder:text-faint"
            />
          </div>
        </label>
      </div>

      {error ? (
        <div className="rounded-xl border border-danger/40 bg-danger-soft p-4 text-xs text-danger-ink" role="alert">
          <AlertTriangle className="w-4 h-4 inline mr-1" />
          {error}
        </div>
      ) : isLoading ? (
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center text-sm text-muted py-10 bg-surface border border-line rounded-xl">
          Nenhum registro de auditoria encontrado.
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-surface border border-line rounded-xl overflow-x-auto shadow-xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-faint border-b border-line">
                  <th className="px-4 py-3 font-mono">Quando</th>
                  <th className="px-4 py-3 font-mono">Membro</th>
                  <th className="px-4 py-3 font-mono">Ciclo</th>
                  <th className="px-4 py-3 font-mono">Revisão</th>
                  <th className="px-4 py-3 font-mono">Score</th>
                  <th className="px-4 py-3 font-mono">Status</th>
                  <th className="px-4 py-3 font-mono">Alterou de</th>
                  <th className="px-4 py-3 font-mono">Quem</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-line-soft/60 hover:bg-surface-2/40">
                    <td className="px-4 py-3 text-muted whitespace-nowrap">{formatTimestamp(log.createdAt)}</td>
                    <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{memberName(log)}</td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">{log.cycle}</td>
                    <td className="px-4 py-3 font-mono text-accent">#{log.revision}</td>
                    <td className="px-4 py-3 font-mono text-white">{log.score}</td>
                    <td className={`px-4 py-3 font-mono font-bold ${STATUS_COLORS[log.status] ?? 'text-white'}`}>{log.status}</td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">
                      {log.previousScore !== undefined || log.previousStatus !== undefined
                        ? `${log.previousScore ?? '—'} pts • ${log.previousStatus ?? '—'}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">
                      {log.actorName || log.actorEmail || log.actorId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filteredLogs.map((log) => (
              <div key={log.id} className="bg-surface border border-line rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white font-medium text-sm truncate">{memberName(log)}</span>
                  <span className="font-mono text-accent text-xs shrink-0">#{log.revision}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-muted">
                  <span>{formatTimestamp(log.createdAt)}</span>
                  <span>{log.cycle}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm text-white">{log.score} pts</span>
                  <span className={`font-mono font-bold text-xs ${STATUS_COLORS[log.status] ?? 'text-white'}`}>{log.status}</span>
                  {log.previousScore !== undefined || log.previousStatus !== undefined ? (
                    <span className="text-[11px] text-faint">
                      antes: {log.previousScore ?? '—'} pts • {log.previousStatus ?? '—'}
                    </span>
                  ) : null}
                </div>
                <div className="text-[11px] text-faint truncate">
                  {log.actorName || log.actorEmail || log.actorId}
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-2 text-[10px] text-faint font-mono flex items-center justify-between gap-1.5">
            <span className="inline-flex items-center gap-1.5">
              <FileSearch className="w-3.5 h-3.5" />
              Exibindo {filteredLogs.length} registro(s) • leitura restrita a administradores
            </span>
            {logs.length === maxResults && (
              <button
                type="button"
                onClick={() => setMaxResults((current) => current + 300)}
                className="inline-flex items-center gap-1 text-accent hover:text-accent-hover font-bold"
              >
                Carregar mais <ChevronDown className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </>
      )}

      <div className="bg-surface border border-line p-6 rounded-2xl mt-6 shadow-xl">
        <div className="flex items-center gap-2 mb-1">
          <ArchiveRestore className="w-5 h-5 text-accent" />
          <h3 className="font-display font-bold text-lg text-white">Membros Arquivados</h3>
        </div>
        <p className="text-xs text-muted mt-0.5 mb-4">
          Exclusão é reversível: histórico de avaliações é preservado até a restauração.
        </p>

        {archivedError ? (
          <div className="rounded-xl border border-danger/40 bg-danger-soft p-4 text-xs text-danger-ink" role="alert">
            <AlertTriangle className="w-4 h-4 inline mr-1" />
            {archivedError}
          </div>
        ) : archivedMembers.length === 0 ? (
          <div className="text-center text-xs text-faint py-4 bg-surface-2/40 rounded-xl">
            Nenhum membro arquivado.
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-faint border-b border-line">
                    <th className="px-4 py-3 font-mono">Nome</th>
                    <th className="px-4 py-3 font-mono">Time</th>
                    <th className="px-4 py-3 font-mono">Score final</th>
                    <th className="px-4 py-3 font-mono">Arquivado em</th>
                    <th className="px-4 py-3 font-mono">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedMembers.map((member) => (
                    <tr key={member.id} className="border-b border-line-soft/60 hover:bg-surface-2/40">
                      <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{member.name}</td>
                      <td className="px-4 py-3 text-muted whitespace-nowrap">{member.team}</td>
                      <td className="px-4 py-3 font-mono text-accent">{member.score}</td>
                      <td className="px-4 py-3 text-muted whitespace-nowrap">{formatTimestamp(member.deletedAt)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => void handleRestore(member.id)}
                          disabled={restoringId === member.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-success/15 border border-success/40 text-success px-3 py-1.5 text-xs font-semibold hover:bg-success/25 disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          {restoringId === member.id ? 'Restaurando...' : 'Restaurar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-2">
              {archivedMembers.map((member) => (
                <div key={member.id} className="bg-app border border-line rounded-xl p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-white font-medium text-sm truncate">{member.name}</div>
                    <div className="text-[11px] text-muted truncate">
                      {member.team} • {member.score} pts • arquivado em {formatTimestamp(member.deletedAt)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRestore(member.id)}
                    disabled={restoringId === member.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-success/15 border border-success/40 text-success px-3 py-1.5 text-xs font-semibold hover:bg-success/25 disabled:opacity-50 shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {restoringId === member.id ? 'Restaurando...' : 'Restaurar'}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};