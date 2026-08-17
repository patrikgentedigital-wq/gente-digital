import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { TeamMember, PerformanceStatus, PdiGoal } from './types';
import {
  subscribeToAuth,
  subscribeToMembers,
  getCurrentUserRole,
  getEvaluationFromFirestore,
  updateMemberInFirestore,
  addMemberToFirestore,
  deleteMemberFromFirestore,
  saveEvaluationAndMemberInFirestore,
  logoutLeader,
  EvaluationPayload,
} from './lib/firebase';
import { Navbar } from './components/Navbar';
const LeaderboardView = lazy(() => import('./components/LeaderboardView').then((module) => ({ default: module.LeaderboardView })));
const DashboardView = lazy(() => import('./components/DashboardView').then((module) => ({ default: module.DashboardView })));
const TeamsView = lazy(() => import('./components/TeamsView').then((module) => ({ default: module.TeamsView })));
const EvaluationView = lazy(() => import('./components/EvaluationView').then((module) => ({ default: module.EvaluationView })));
import { ImageLinkModal } from './components/ImageLinkModal';
import { EmployeeDetailModal } from './components/EmployeeDetailModal';
import { LeaderLoginModal } from './components/LeaderLoginModal';
const ReportExportModal = lazy(() => import('./components/ReportExportModal').then((module) => ({ default: module.ReportExportModal })));
import { MemberFormModal } from './components/MemberFormModal';
import { KioskModeModal } from './components/KioskModeModal';
import { InfoModal, InfoModalType } from './components/InfoModal';
import { ToastContainer } from './components/ToastContainer';
import { toast } from './utils/toastUtils';
import {
  DEFAULT_EVALUATION_CYCLE,
  getPerformanceStatus,
  makeEvaluationId,
  normalizeCriteriaScores,
  rankMembers,
} from './lib/evaluation';

interface ReportModalState {
  member: TeamMember;
  criteriaScores?: Record<string, number>;
  leaderComments?: string;
  cycle?: string;
}

export default function App() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [activeTab, setActiveTab] = useState<'ranking' | 'dashboard' | 'teams' | 'leader'>('ranking');
  const [searchQuery, setSearchQuery] = useState('');
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authRole, setAuthRole] = useState<'leader' | 'admin' | null>(null);
  const [authRoleReady, setAuthRoleReady] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
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

  useEffect(() => subscribeToAuth((user) => {
    setAuthUser(user);
    setAuthReady(true);
    if (!user) {
      setAuthRole(null);
      setAuthRoleReady(true);
      setMembers([]);
      setCurrentLeader(null);
      setSelectedEvaluationMember(null);
    } else {
      setAuthRole(null);
      setAuthRoleReady(false);
    }
  }), []);

  useEffect(() => {
    if (!authUser) return undefined;

    let active = true;
    getCurrentUserRole(authUser)
      .then((role) => {
        if (active) setAuthRole(role);
      })
      .catch((error) => {
        console.error('Unable to resolve Firebase role:', error);
        if (active) setAuthRole(null);
      })
      .finally(() => {
        if (active) setAuthRoleReady(true);
      });

    return () => {
      active = false;
    };
  }, [authUser]);

  useEffect(() => {
    if (!authUser || !authRole) return undefined;

    setMembersError(null);
    return subscribeToMembers(
      (updatedMembers) => setMembers(updatedMembers),
      (error) => {
        console.error('Members subscription failed:', error);
        setMembers([]);
        setMembersError('Não foi possível carregar os dados do Firestore. Verifique sua autorização.');
      },
    );
  }, [authRole, authUser]);

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
    loadEvaluation(detailModalMember.id, DEFAULT_EVALUATION_CYCLE)
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
      const evaluation = await loadEvaluation(member.id, DEFAULT_EVALUATION_CYCLE);
      setReportModal({
        member,
        criteriaScores: normalizeCriteriaScores(evaluation?.criteriaScores),
        leaderComments: evaluation?.comments,
        cycle: evaluation?.cycle || DEFAULT_EVALUATION_CYCLE,
      });
    } catch (error) {
      console.error('Unable to load report data:', error);
      setReportModal({ member, cycle: DEFAULT_EVALUATION_CYCLE });
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
      toast.info(`Colaborador ${target?.name || ''} removido.`);
    } catch {
      toast.error('Não foi possível remover o colaborador.');
    }
  };

  const handleSaveEvaluation = async (
    memberId: string,
    newTotalScore: number,
    criteriaScores: Record<string, number>,
    comments: string,
    cycle = DEFAULT_EVALUATION_CYCLE,
    pdiGoals: PdiGoal[] = [],
  ) => {
    const targetMember = members.find((member) => member.id === memberId);
    if (!targetMember || !authUser) return;

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
      await saveEvaluationAndMemberInFirestore({
        member: updatedMember,
        evaluation: {
          id: makeEvaluationId(memberId, cycle),
          memberId,
          memberName: targetMember.name,
          leaderName: currentLeader || authUser.email || 'Líder',
          score: newTotalScore,
          status: newStatus,
          cycle,
          comments,
          pdiGoals,
          criteriaScores,
        },
      });
      setMembers((previous) => rankMembers(previous.map((member) =>
        member.id === memberId ? updatedMember : member
      )));
      setSelectedEvaluationMember(updatedMember);
      toast.success(`Avaliação de ${targetMember.name} salva com sucesso.`);
    } catch {
      toast.error('A avaliação não foi salva. Nenhum dado local foi confirmado.');
      throw new Error('evaluation-save-failed');
    }
  };

  const authenticatedContent = authUser && (
    <>
      {membersError && (
        <div className="mx-auto mt-4 max-w-[1040px] rounded-xl border border-[#e2687a]/40 bg-[#3A1620] p-3 text-xs text-[#ffb4c0]" role="alert">
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
      </main>
    </>
  );

  return (
    <div className="min-h-screen bg-[#0A1424] text-[#F2F5FA] flex flex-col font-sans selection:bg-[#E3A73B] selection:text-[#1a1200]">
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
        <main className="flex-1 flex items-center justify-center p-8 text-sm text-[#A9B7CE]">Verificando sessão...</main>
      ) : authUser && !authRole ? (
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md rounded-2xl border border-[#22365C] bg-[#0F1E38] p-6 text-center">
            <h2 className="text-xl font-bold text-white">Acesso sem autorização</h2>
            <p className="mt-2 text-sm text-[#A9B7CE]">Sua conta está autenticada, mas ainda não possui uma role autorizada para esta plataforma.</p>
            <button
              type="button"
              onClick={() => logoutLeader().catch(() => toast.error('Não foi possível encerrar a sessão.'))}
              className="mt-5 rounded-xl bg-[#E3A73B] px-4 py-2 text-xs font-bold text-[#1a1200]"
            >
              Encerrar sessão
            </button>
          </div>
        </main>
      ) : authUser ? (
        <Suspense fallback={<main className="flex-1 flex items-center justify-center p-8 text-sm text-[#A9B7CE]">Carregando plataforma...</main>}>
          {authenticatedContent}
        </Suspense>
      ) : (
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md rounded-2xl border border-[#22365C] bg-[#0F1E38] p-6 text-center">
            <h2 className="text-xl font-bold text-white">Acesso autenticado necessário</h2>
            <p className="mt-2 text-sm text-[#A9B7CE]">Os dados de colaboradores só são carregados após autenticação de um líder autorizado.</p>
            <button
              type="button"
              onClick={() => setIsLeaderModalOpen(true)}
              className="mt-5 rounded-xl bg-[#E3A73B] px-4 py-2 text-xs font-bold text-[#1a1200]"
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

         <Suspense fallback={null}>
         {authUser && authRole && (
         <>
           {authRole === 'admin' && (
             isMemberFormOpen && (
             <MemberFormModal
               isOpen={isMemberFormOpen}
               onClose={() => {
                 setIsMemberFormOpen(false);
                 setMemberToEdit(null);
               }}
               memberToEdit={memberToEdit}
               onSaveMember={handleSaveMember}
               onDeleteMember={handleDeleteMember}
              />
              ))}
           {isKioskOpen && <KioskModeModal isOpen onClose={() => setIsKioskOpen(false)} members={members} />}
           {authRole === 'admin' && imageModalMember && (
            <ImageLinkModal
              isOpen
              onClose={() => setImageModalMember(null)}
              memberName={imageModalMember.name}
              currentAvatarUrl={imageModalMember.avatarUrl}
              onSaveAvatar={handleSaveAvatarUrl}
            />
          )}
           {detailModalMember && (
             <EmployeeDetailModal
               member={detailModalMember}
               allMembers={members}
               evaluation={detailEvaluation}
               onClose={() => setDetailModalMember(null)}
               onOpenImageModal={authRole === 'admin' ? setImageModalMember : undefined}
              onSelectForEvaluation={(member) => {
                setSelectedEvaluationMember(member);
                setDetailModalMember(null);
                setActiveTab('leader');
              }}
            />
          )}
           {reportModal && (
             <ReportExportModal
               member={reportModal.member}
               isOpen
               onClose={() => setReportModal(null)}
               criteriaScores={reportModal.criteriaScores}
               leaderComments={reportModal.leaderComments}
               cycle={reportModal.cycle}
             />
          )}
          </>
        )}
      </Suspense>

      <InfoModal
        type={infoModal}
        isOpen={Boolean(infoModal)}
        onClose={() => setInfoModal(null)}
      />

      <footer className="border-t border-[#22365C] bg-[#0A1424] py-6 px-6 mt-auto">
        <div className="max-w-[1040px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 font-mono text-xs text-[#6C7C99]">
          <div>© 2026 <strong className="text-[#E3A73B]">Gente Digital</strong>. Análise & Desempenho de Equipes.</div>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setInfoModal('privacy')}
              className="hover:text-[#E3A73B] transition-colors cursor-pointer"
            >
              Privacidade
            </button>
            <button
              type="button"
              onClick={() => setInfoModal('support')}
              className="hover:text-[#E3A73B] transition-colors cursor-pointer"
            >
              Suporte
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
