import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { EvaluationAuditLog, TeamMember } from '../types';
import { getArchivedMembersFromFirestore, subscribeToAuditLogs } from '../lib/firebaseLoader';
import { FileSearch, ShieldCheck, AlertTriangle, ArchiveRestore, RotateCcw } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  Voando: 'text-[#4fb579]',
  'Caminho Certo': 'text-[#38BDF8]',
  Atenção: 'text-[#E3A73B]',
  Alarme: 'text-[#e2687a]',
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
    );
    return unsubscribe;
  }, []);

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
    return logs.filter((log) => {
      if (memberFilter !== 'all' && log.memberId !== memberFilter) return false;
      if (cycleFilter !== 'all' && log.cycle !== cycleFilter) return false;
      return true;
    });
  }, [logs, memberFilter, cycleFilter]);

  const memberName = (log: EvaluationAuditLog) => {
    const member = members.find((m) => m.id === log.memberId);
    return member?.name || log.memberName || log.memberId;
  };

  return (
    <div className="w-full max-w-[1040px] mx-auto pb-16 font-sans">
      <div className="bg-[#0F1E38] border border-[#22365C] p-6 rounded-2xl mb-6 shadow-xl">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-5 h-5 text-[#4fb579]" />
          <h2 className="font-display font-bold text-2xl text-white">Trilha de Auditoria</h2>
        </div>
        <p className="text-xs text-[#A9B7CE] mt-0.5">
          Registro imutável de avaliações salvas: quem alterou o quê e quando.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#0F1E38] border border-[#22365C] p-4 rounded-xl mb-6 shadow-lg">
        <label className="block">
          <span className="block text-xs font-mono font-semibold text-[#A9B7CE] mb-2 uppercase">Filtrar por membro</span>
          <select
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            className="w-full bg-[#14294A] border border-[#22365C] text-white font-sans text-sm p-3 rounded-xl focus:outline-none focus:border-[#E3A73B]"
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
          <span className="block text-xs font-mono font-semibold text-[#A9B7CE] mb-2 uppercase">Filtrar por ciclo</span>
          <select
            value={cycleFilter}
            onChange={(e) => setCycleFilter(e.target.value)}
            className="w-full bg-[#14294A] border border-[#22365C] text-white font-sans text-sm p-3 rounded-xl focus:outline-none focus:border-[#E3A73B]"
          >
            <option value="all">Todos os ciclos</option>
            {cycles.map((cycle) => (
              <option key={cycle} value={cycle}>
                {cycle}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <div className="rounded-xl border border-[#e2687a]/40 bg-[#3A1620] p-4 text-xs text-[#ffb4c0]" role="alert">
          <AlertTriangle className="w-4 h-4 inline mr-1" />
          {error}
        </div>
      ) : isLoading ? (
        <div className="text-center text-sm text-[#A9B7CE] py-10">Carregando histórico...</div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center text-sm text-[#A9B7CE] py-10 bg-[#0F1E38] border border-[#22365C] rounded-xl">
          Nenhum registro de auditoria encontrado.
        </div>
      ) : (
        <div className="bg-[#0F1E38] border border-[#22365C] rounded-xl overflow-x-auto shadow-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-[#6C7C99] border-b border-[#22365C]">
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
                <tr key={log.id} className="border-b border-[#1F3356]/60 hover:bg-[#14294A]/40">
                  <td className="px-4 py-3 text-[#A9B7CE] whitespace-nowrap">{formatTimestamp(log.createdAt)}</td>
                  <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{memberName(log)}</td>
                  <td className="px-4 py-3 text-[#A9B7CE] whitespace-nowrap">{log.cycle}</td>
                  <td className="px-4 py-3 font-mono text-[#E3A73B]">#{log.revision}</td>
                  <td className="px-4 py-3 font-mono text-white">{log.score}</td>
                  <td className={`px-4 py-3 font-mono font-bold ${STATUS_COLORS[log.status] ?? 'text-white'}`}>{log.status}</td>
                  <td className="px-4 py-3 text-[#A9B7CE] whitespace-nowrap">
                    {log.previousScore !== undefined || log.previousStatus !== undefined
                      ? `${log.previousScore ?? '—'} pts • ${log.previousStatus ?? '—'}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-[#A9B7CE] whitespace-nowrap">
                    {log.actorName || log.actorEmail || log.actorId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 text-[10px] text-[#6C7C99] font-mono flex items-center gap-1.5">
            <FileSearch className="w-3.5 h-3.5" />
            Exibindo {filteredLogs.length} registro(s) • leitura restrita a administradores
          </div>
        </div>
      )}

      <div className="bg-[#0F1E38] border border-[#22365C] p-6 rounded-2xl mt-6 shadow-xl">
        <div className="flex items-center gap-2 mb-1">
          <ArchiveRestore className="w-5 h-5 text-[#E3A73B]" />
          <h3 className="font-display font-bold text-lg text-white">Membros Arquivados</h3>
        </div>
        <p className="text-xs text-[#A9B7CE] mt-0.5 mb-4">
          Exclusão é reversível: histórico de avaliações é preservado até a restauração.
        </p>

        {archivedError ? (
          <div className="rounded-xl border border-[#e2687a]/40 bg-[#3A1620] p-4 text-xs text-[#ffb4c0]" role="alert">
            <AlertTriangle className="w-4 h-4 inline mr-1" />
            {archivedError}
          </div>
        ) : archivedMembers.length === 0 ? (
          <div className="text-center text-xs text-[#6C7C99] py-4 bg-[#14294A]/40 rounded-xl">
            Nenhum membro arquivado.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#22365C]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-[#6C7C99] border-b border-[#22365C]">
                  <th className="px-4 py-3 font-mono">Nome</th>
                  <th className="px-4 py-3 font-mono">Time</th>
                  <th className="px-4 py-3 font-mono">Score final</th>
                  <th className="px-4 py-3 font-mono">Arquivado em</th>
                  <th className="px-4 py-3 font-mono">Ação</th>
                </tr>
              </thead>
              <tbody>
                {archivedMembers.map((member) => (
                  <tr key={member.id} className="border-b border-[#1F3356]/60 hover:bg-[#14294A]/40">
                    <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{member.name}</td>
                    <td className="px-4 py-3 text-[#A9B7CE] whitespace-nowrap">{member.team}</td>
                    <td className="px-4 py-3 font-mono text-[#E3A73B]">{member.score}</td>
                    <td className="px-4 py-3 text-[#A9B7CE] whitespace-nowrap">{formatTimestamp(member.deletedAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => void handleRestore(member.id)}
                        disabled={restoringId === member.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#4fb579]/15 border border-[#4fb579]/40 text-[#4fb579] px-3 py-1.5 text-xs font-semibold hover:bg-[#4fb579]/25 disabled:opacity-50"
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
        )}
      </div>
    </div>
  );
};