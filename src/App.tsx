import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import type { TeamMember, PerformanceStatus, PdiGoal } from './types';
import {
  getEvaluationFromFirestore,
  updateMemberInFirestore,
  addMemberToFirestore,
  deleteMemberFromFirestore,
  restoreMemberFromFirestore,
  saveEvaluationAndMemberInFirestore,
  logoutLeader,
  isEvaluationConflictError,
} from './lib/firebaseLoader';
import type { EvaluationPayload } from './lib/firebaseLoader';
import { useAuthSession } from './hooks/useAuthSession';
import { useMembers } from './hooks/useMembers';
import { Navbar } from './components/Navbar';
import { AuthenticatedModals } from './components/AuthenticatedModals';
import type { ReportModalState } from './components/AuthenticatedModals';
const LeaderboardView = lazy(() => import('./components/LeaderboardView').then((module) => ({ default: module.LeaderboardView })));
const DashboardView = lazy(() => import('./components/DashboardView').then((module) => ({ default: module.DashboardView })));
const TeamsView = lazy(() => import('./components/TeamsView').then((module) => ({ default: module.TeamsView })));
const EvaluationView = lazy(() => import('./components/EvaluationView').then((module) => ({ default: module.EvaluationView })));
const AuditLogsView = lazy(() => import('./components/AuditLogsView').then((module) => ({ default: module.AuditLogsView })));
import { LeaderLoginModal } from './components/LeaderLoginModal';
import { InfoModal, InfoModalType } from './components/InfoModal';
import { ToastContainer } from './components/ToastContainer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Skeleton } from './components/Skeleton';
import { toast } from './utils/toastUtils';
import {
  getDefaultEvaluationCycle,
  getPerformanceStatus,
  makeEvaluationId,
  normalizeCriteriaScores,
  rankMembers,
} from './lib/evaluation';

export default function App() {
  const { authUser, authReady, authRole, authRoleReady } = useAuthSession();
  const { members, setMembers, membersError } = useMembers(authUser, authRole);
  const [activeTab, setActiveTab] = useState<'ranking' | 'dashboard' | 'teams' | 'leader' | 'audit'>('ranking');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvaluationMember, setSelectedEvaluationMember] = useState<TeamMember | null>(null);
  const [imageModalMember, setImageModalMember] = useState<TeamMember | null>(null);
  const [detailModalMember, setDetailModalMember] = useState<TeamMember | null>(null);
  const [reportModal, setReportModal] = useState<ReportModalState | null>(null);
  const [detailEvaluation, setDetailEvaluation] = useState<EvaluationPayload | null>(null);
  const [isLeaderModalOpen, setIsLeaderModalOpen] = useState(false);
  const [currentLeader, setCurrentLeader] = useState<string | null>(null);
  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<TeamMember | null>(null);
  const [isKioskOpen, setIsKioskOpen] = useState(false);
  const [infoModal, setInfoModal] = useState<InfoModalType>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'ranking' || tab === 'dashboard' || tab === 'teams' || tab === 'leader' || tab === 'audit') {
      setActiveTab(tab);
    }
    const query = params.get('q');
    if (query !== null) setSearchQuery(query);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (activeTab === 'ranking') url.searchParams.delete('tab');
    else url.searchParams.set('tab', activeTab);
    if (searchQuery.trim()) url.searchParams.set('q', searchQuery.trim());
    else url.searchParams.delete('q');
    window.history.replaceState(null, '', url.toString());
  }, [activeTab, searchQuery]);

  useEffect(() => {
    if (!authUser) {
      setCurrentLeader(null);
      setSelectedEvaluationMember(null);
    }
  }, [authUser]);

  const loadEvaluation = useCallback(async (memberId: string, cycle: string) => {
    return getEvaluationFromFirestore(makeEvaluationId(memberId, cycle));
  }, []);

  useEffect(() => {
    if (!detailModalMember) {
      setDetailEvaluation(null);
      return undefined;
    }

    let active = true;
    setDetailEvaluation(null);
    loadEvaluation(detailModalMember.id, getDefaultEvaluationCycle())
      .then((evaluation) => {
        if (active) setDetailEvaluation(evaluation || null);
      })
      .catch((error) => {
        console.error('Unable to load member evaluation:', error);
      });

    return () => {
      active = false;
    };
  }, [detailModalMember, loadEvaluation]);

  const openReportModal = async (
    member: TeamMember,
    context?: Pick<ReportModalState, 'criteriaScores' | 'leaderComments' | 'cycle'>,
  ) => {
    if (context) {
      setReportModal({ member, ...context });
      return;
    }

    try {
      const evaluation = await loadEvaluation(member.id, getDefaultEvaluationCycle());
      setReportModal({
        member,
        criteriaScores: normalizeCriteriaScores(evaluation?.criteriaScores),
        leaderComments: evaluation?.comments,
        cycle: evaluation?.cycle || getDefaultEvaluationCycle(),
      });
    } catch (error) {
      console.error('Unable to load report data:', error);
      setReportModal({ member, cycle: getDefaultEvaluationCycle() });
      toast.error('Não foi possível carregar os detalhes da avaliação.');
    }
  };

  useEffect(() => {
    if (members.length === 0) {
      setSelectedEvaluationMember(null);
      return;
    }

    setSelectedEvaluationMember((selected) => {
      if (!selected) return members[0];
      return members.find((member) => member.id === selected.id) || members[0] || null;
    });
  }, [members]);

  const handleSaveAvatarUrl = async (newAvatarUrl: string) => {
    if (!imageModalMember) return;
    const updated = { ...imageModalMember, avatarUrl: newAvatarUrl };

    try {
      await updateMemberInFirestore(updated);
      setMembers((previous) => rankMembers(previous.map((member) =>
        member.id === updated.id ? updated : member
      )));
      setSelectedEvaluationMember((selected) => selected?.id === updated.id ? updated : selected);
      setImageModalMember(null);
      toast.success('Foto do perfil atualizada com sucesso!');
    } catch {
      toast.error('Não foi possível salvar a foto do perfil.');
    }
  };

  const handleSaveMember = async (memberData: TeamMember) => {
    const isExisting = members.some((member) => member.id === memberData.id);

    try {
      if (isExisting) await updateMemberInFirestore(memberData);
      else await addMemberToFirestore(memberData);

      setMembers((previous) => rankMembers(
        isExisting
          ? previous.map((member) => member.id === memberData.id ? memberData : member)
          : [...previous, memberData],
      ));
      toast.success(isExisting ? 'Dados do colaborador atualizados.' : 'Colaborador cadastrado.');
    } catch {
      toast.error('Não foi possível persistir os dados do colaborador.');
      throw new Error('member-save-failed');
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    const target = members.find((member) => member.id === memberId);

    try {
      await deleteMemberFromFirestore(memberId);
      setMembers((previous) => rankMembers(previous.filter((member) => member.id !== memberId)));
      setSelectedEvaluationMember((selected) => selected?.id === memberId ? null : selected);
      toast.info(`Colaborador ${target?.name || ''} arquivado (pode ser restaurado na Trilha de Auditoria).`);
    } catch {
      toast.error('Não foi possível arquivar o colaborador.');
    }
  };

  const handleRestoreMember = async (memberId: string) => {
    try {
      await restoreMemberFromFirestore(memberId);
      toast.success('Colaborador restaurado.');
    } catch {
      toast.error('Não foi possível restaurar o colaborador.');
    }
  };

  const handleSaveEvaluation = async (
    memberId: string,
    newTotalScore: number,
    criteriaScores: Record<string, number>,
    comments: string,
    cycle = getDefaultEvaluationCycle(),
    pdiGoals: PdiGoal[] = [],
    expectedRevision = 0,
  ): Promise<number> => {
    const targetMember = members.find((member) => member.id === memberId);
    if (!targetMember || !authUser) return 0;

    const newStatus: PerformanceStatus = getPerformanceStatus(newTotalScore);

    const updatedMember: TeamMember = {
      ...targetMember,
      score: newTotalScore,
      status: newStatus,
      evaluationStatus: 'Concluído',
      pdiGoals,
      history: [
        ...(targetMember.history || []).filter((entry) => entry.month !== cycle),
        { month: cycle, score: newTotalScore },
      ],
    };
    try {
      const savedRevision = await saveEvaluationAndMemberInFirestore({
        member: updatedMember,
        evaluation: {
          id: makeEvaluationId(memberId, cycle),
          memberId,
          memberName: targetMember.name,
          leaderName: (currentLeader || authUser.email || 'Líder').slice(0, 100),
          score: newTotalScore,
          status: newStatus,
          cycle,
          comments,
          pdiGoals,
          criteriaScores,
        },
        expectedRevision,
      });
      setMembers((previous) => rankMembers(previous.map((member) =>
        member.id === memberId ? updatedMember : member
      )));
      setSelectedEvaluationMember(updatedMember);
      toast.success(`Avaliação de ${targetMember.name} salva com sucesso.`);
      return savedRevision;
    } catch (error) {
      if (isEvaluationConflictError(error)) {
        toast.error('Esta avaliação foi alterada por outra pessoa. Recarregue os dados antes de salvar novamente.');
      } else {
        toast.error('A avaliação não foi salva. Nenhum dado local foi confirmado.');
      }
      throw new Error(isEvaluationConflictError(error) ? 'evaluation-conflict' : 'evaluation-save-failed');
    }
  };

  const authenticatedContent = authUser && (
    <>
      {membersError && (
        <div className="mx-auto mt-4 max-w-[1040px] rounded-xl border border-danger/40 bg-danger-soft p-3 text-xs text-danger-ink" role="alert">
          {membersError}
        </div>
        )}
      <main className="flex-1 p-4 md:p-6 max-w-[1040px] w-full mx-auto">
         {activeTab === 'ranking' && (
          <LeaderboardView
            members={members}
            onOpenImageModal={authRole === 'admin' ? setImageModalMember : undefined}
            onSelectMemberForEvaluation={(member) => {
              setSelectedEvaluationMember(member);
              setActiveTab('leader');
            }}
            onOpenReportModal={openReportModal}
            onSelectMemberForDetail={setDetailModalMember}
            onOpenMemberForm={authRole === 'admin' ? (member) => {
              setMemberToEdit(member || null);
              setIsMemberFormOpen(true);
            } : undefined}
            searchQuery={searchQuery}
           setSearchQuery={setSearchQuery}
          />
        )}
        {activeTab === 'dashboard' && (
          <DashboardView
            members={members}
            onSelectTeamFilter={(team) => {
              setSearchQuery(team);
              setActiveTab('ranking');
            }}
            onSelectMemberForDetail={setDetailModalMember}
          />
        )}
        {activeTab === 'teams' && (
          <TeamsView
            members={members}
            onOpenImageModal={authRole === 'admin' ? setImageModalMember : undefined}
            onSelectMemberForDetail={setDetailModalMember}
            onSelectTeamFilter={(team) => {
              setSearchQuery(team);
              setActiveTab('ranking');
            }}
          />
        )}
        {activeTab === 'leader' && selectedEvaluationMember && (
          <EvaluationView
            members={members}
            selectedMember={selectedEvaluationMember}
            onSelectMember={setSelectedEvaluationMember}
            onSaveEvaluation={handleSaveEvaluation}
            onOpenImageModal={authRole === 'admin' ? setImageModalMember : undefined}
            onOpenReportModal={openReportModal}
            onLoadEvaluation={loadEvaluation}
            currentLeader={currentLeader}
          />
        )}
        {activeTab === 'audit' && authRole === 'admin' && (
          <AuditLogsView members={members} onRestoreMember={handleRestoreMember} />
        )}
      </main>
    </>
  );

  return (
    <div className="min-h-screen bg-app text-ink flex flex-col font-sans selection:bg-accent selection:text-accent-ink">
      <ToastContainer />
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenLeaderModal={() => setIsLeaderModalOpen(true)}
        onOpenKioskMode={authRole ? () => setIsKioskOpen(true) : undefined}
        onOpenMemberForm={authRole === 'admin' ? () => {
          setMemberToEdit(null);
          setIsMemberFormOpen(true);
        } : undefined}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isAuthenticated={Boolean(authUser && authRole)}
        role={authRole}
        onLogout={authUser ? () => logoutLeader().catch(() => toast.error('Não foi possível encerrar a sessão.')) : undefined}
      />

      {!authReady || (authUser && !authRoleReady) ? (
        <main className="flex-1 flex items-center justify-center p-8 text-sm text-muted">Verificando sessão...</main>
      ) : authUser && !authRole ? (
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md rounded-2xl border border-line bg-surface p-6 text-center">
            <h2 className="text-xl font-bold text-white">Acesso sem autorização</h2>
            <p className="mt-2 text-sm text-muted">Sua conta está autenticada, mas ainda não possui uma role autorizada para esta plataforma.</p>
            <button
              type="button"
              onClick={() => logoutLeader().catch(() => toast.error('Não foi possível encerrar a sessão.'))}
              className="mt-5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-ink"
            >
              Encerrar sessão
            </button>
          </div>
        </main>
      ) : authUser ? (
        <Suspense fallback={
          <main className="flex-1 flex flex-col gap-3 p-8 max-w-[1040px] w-full mx-auto" aria-busy="true">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 max-w-full" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4">
              <Skeleton className="h-44 w-full" />
              <Skeleton className="h-44 w-full" />
              <Skeleton className="h-44 w-full" />
            </div>
            <Skeleton className="h-16 w-full mt-2" />
            <Skeleton className="h-16 w-full" />
          </main>
        }>
          <ErrorBoundary>{authenticatedContent}</ErrorBoundary>
        </Suspense>
      ) : (
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md rounded-2xl border border-line bg-surface p-6 text-center">
            <h2 className="text-xl font-bold text-white">Acesso autenticado necessário</h2>
            <p className="mt-2 text-sm text-muted">Os dados de colaboradores só são carregados após autenticação de um líder autorizado.</p>
            <button
              type="button"
              onClick={() => setIsLeaderModalOpen(true)}
              className="mt-5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-ink"
            >
              Entrar como líder
            </button>
          </div>
        </main>
      )}

      <LeaderLoginModal
        isOpen={isLeaderModalOpen}
        onClose={() => setIsLeaderModalOpen(false)}
        onLoginSuccess={(leaderName) => {
          setCurrentLeader(leaderName);
          setActiveTab('leader');
          toast.success(`Autenticado como líder: ${leaderName}`);
        }}
      />

      <ErrorBoundary>
        <AuthenticatedModals
          isAuthenticated={Boolean(authUser && authRole)}
          isAdmin={authRole === 'admin'}
        isMemberFormOpen={isMemberFormOpen}
        memberToEdit={memberToEdit}
        onCloseMemberForm={() => {
          setIsMemberFormOpen(false);
          setMemberToEdit(null);
        }}
        onOpenMemberForm={(member) => {
          setMemberToEdit(member);
          setIsMemberFormOpen(true);
        }}
        onSaveMember={handleSaveMember}
        onDeleteMember={handleDeleteMember}
        isKioskOpen={isKioskOpen}
        onCloseKiosk={() => setIsKioskOpen(false)}
        members={members}
        imageModalMember={imageModalMember}
        onOpenImageModal={setImageModalMember}
        onCloseImageModal={() => setImageModalMember(null)}
        onSaveAvatar={handleSaveAvatarUrl}
        detailModalMember={detailModalMember}
        detailEvaluation={detailEvaluation}
        onCloseDetail={() => setDetailModalMember(null)}
        onSelectForEvaluation={(member) => {
          setSelectedEvaluationMember(member);
          setDetailModalMember(null);
          setActiveTab('leader');
        }}
        reportModal={reportModal}
          onCloseReport={() => setReportModal(null)}
        />
      </ErrorBoundary>

      <InfoModal
        type={infoModal}
        isOpen={Boolean(infoModal)}
        onClose={() => setInfoModal(null)}
      />

      <footer className="border-t border-line bg-app py-6 px-6 mt-auto">
        <div className="max-w-[1040px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 font-mono text-xs text-faint">
          <div>© 2026 <strong className="text-accent">Gente Digital</strong>. Análise & Desempenho de Equipes.</div>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setInfoModal('privacy')}
              className="hover:text-accent transition-colors cursor-pointer"
            >
              Privacidade
            </button>
            <button
              type="button"
              onClick={() => setInfoModal('support')}
              className="hover:text-accent transition-colors cursor-pointer"
            >
              Suporte
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
