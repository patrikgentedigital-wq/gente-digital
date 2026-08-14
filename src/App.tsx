import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { TeamMember, PerformanceStatus, PdiGoal } from './types';
import {
  subscribeToAuth,
  subscribeToMembers,
  updateMemberInFirestore,
  addMemberToFirestore,
  deleteMemberFromFirestore,
  saveEvaluationAndMemberInFirestore,
  logoutLeader,
} from './lib/firebase';
import { Navbar } from './components/Navbar';
import { LeaderboardView } from './components/LeaderboardView';
import { DashboardView } from './components/DashboardView';
import { TeamsView } from './components/TeamsView';
import { EvaluationView } from './components/EvaluationView';
import { ImageLinkModal } from './components/ImageLinkModal';
import { EmployeeDetailModal } from './components/EmployeeDetailModal';
import { LeaderLoginModal } from './components/LeaderLoginModal';
import { ReportExportModal } from './components/ReportExportModal';
import { MemberFormModal } from './components/MemberFormModal';
import { KioskModeModal } from './components/KioskModeModal';
import { ToastContainer } from './components/ToastContainer';
import { toast } from './utils/toastUtils';

function rankMembers(members: TeamMember[]) {
  return [...members]
    .sort((a, b) => b.score - a.score)
    .map((member, index) => ({
      ...member,
      previousRank: member.rank,
      rank: index + 1,
    }));
}

export default function App() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [activeTab, setActiveTab] = useState<'ranking' | 'dashboard' | 'teams' | 'leader'>('ranking');
  const [searchQuery, setSearchQuery] = useState('');
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [selectedEvaluationMember, setSelectedEvaluationMember] = useState<TeamMember | null>(null);
  const [imageModalMember, setImageModalMember] = useState<TeamMember | null>(null);
  const [detailModalMember, setDetailModalMember] = useState<TeamMember | null>(null);
  const [reportModalMember, setReportModalMember] = useState<TeamMember | null>(null);
  const [isLeaderModalOpen, setIsLeaderModalOpen] = useState(false);
  const [currentLeader, setCurrentLeader] = useState<string | null>(null);
  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<TeamMember | null>(null);
  const [isKioskOpen, setIsKioskOpen] = useState(false);

  useEffect(() => subscribeToAuth((user) => {
    setAuthUser(user);
    setAuthReady(true);
    if (!user) {
      setMembers([]);
      setCurrentLeader(null);
      setSelectedEvaluationMember(null);
    }
  }), []);

  useEffect(() => {
    if (!authUser) return undefined;

    setMembersError(null);
    return subscribeToMembers(
      (updatedMembers) => setMembers(updatedMembers),
      (error) => {
        console.error('Members subscription failed:', error);
        setMembers([]);
        setMembersError('Não foi possível carregar os dados do Firestore. Verifique sua autorização.');
      },
    );
  }, [authUser]);

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
    cycle = 'Agosto/2026',
    pdiGoals: PdiGoal[] = [],
  ) => {
    const targetMember = members.find((member) => member.id === memberId);
    if (!targetMember || !authUser) return;

    let newStatus: PerformanceStatus = 'Alarme';
    if (newTotalScore > 140) newStatus = 'Voando';
    else if (newTotalScore > 130) newStatus = 'Caminho Certo';
    else if (newTotalScore >= 120) newStatus = 'Atenção';

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
    const cycleId = cycle.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

    try {
      await saveEvaluationAndMemberInFirestore({
        member: updatedMember,
        evaluation: {
          id: `evaluation_${memberId}_${cycleId}`,
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
            onOpenImageModal={setImageModalMember}
            onSelectMemberForEvaluation={(member) => {
              setSelectedEvaluationMember(member);
              setActiveTab('leader');
            }}
            onOpenReportModal={setReportModalMember}
            onSelectMemberForDetail={setDetailModalMember}
            onOpenMemberForm={(member) => {
              setMemberToEdit(member || null);
              setIsMemberFormOpen(true);
            }}
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
            onOpenImageModal={setImageModalMember}
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
            onOpenImageModal={setImageModalMember}
            onOpenReportModal={setReportModalMember}
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
        onOpenKioskMode={authUser ? () => setIsKioskOpen(true) : undefined}
        onOpenMemberForm={authUser ? () => {
          setMemberToEdit(null);
          setIsMemberFormOpen(true);
        } : undefined}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isAuthenticated={Boolean(authUser)}
        onLogout={authUser ? () => logoutLeader().catch(() => toast.error('Não foi possível encerrar a sessão.')) : undefined}
      />

      {!authReady ? (
        <main className="flex-1 flex items-center justify-center p-8 text-sm text-[#A9B7CE]">Verificando sessão...</main>
      ) : authUser ? authenticatedContent : (
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

      {authUser && (
        <>
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
          <KioskModeModal isOpen={isKioskOpen} onClose={() => setIsKioskOpen(false)} members={members} />
          {imageModalMember && (
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
              onClose={() => setDetailModalMember(null)}
              onOpenImageModal={setImageModalMember}
              onSelectForEvaluation={(member) => {
                setSelectedEvaluationMember(member);
                setDetailModalMember(null);
                setActiveTab('leader');
              }}
            />
          )}
          {reportModalMember && (
            <ReportExportModal
              member={reportModalMember}
              isOpen
              onClose={() => setReportModalMember(null)}
            />
          )}
        </>
      )}

      <footer className="border-t border-[#22365C] bg-[#0A1424] py-6 px-6 mt-auto">
        <div className="max-w-[1040px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 font-mono text-xs text-[#6C7C99]">
          <div>© 2026 <strong className="text-[#E3A73B]">Gente Digital</strong>. Análise & Desempenho de Equipes.</div>
          <div className="flex gap-4">
            <button type="button" className="hover:text-[#E3A73B] transition-colors">Privacidade</button>
            <button type="button" className="hover:text-[#E3A73B] transition-colors">Suporte</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
