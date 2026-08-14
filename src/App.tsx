import React, { useState, useEffect } from 'react';
import { TeamMember, PerformanceStatus, PdiGoal } from './types';
import { INITIAL_TEAM_MEMBERS } from './data/initialData';
import {
  subscribeToMembers,
  updateMemberInFirestore,
  addMemberToFirestore,
  deleteMemberFromFirestore,
  saveEvaluationInFirestore,
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

export default function App() {
  const [members, setMembers] = useState<TeamMember[]>(INITIAL_TEAM_MEMBERS);
  const [activeTab, setActiveTab] = useState<'ranking' | 'dashboard' | 'teams' | 'leader'>('ranking');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Subscribe to real-time updates from Firestore
  useEffect(() => {
    const unsubscribe = subscribeToMembers((updatedMembers) => {
      setMembers(updatedMembers);
    });
    return () => unsubscribe();
  }, []);

  // Selected member for evaluation canvas / report
  const [selectedEvaluationMember, setSelectedEvaluationMember] = useState<TeamMember>(
    INITIAL_TEAM_MEMBERS[0] // Patrik
  );

  // Modal states
  const [imageModalMember, setImageModalMember] = useState<TeamMember | null>(null);
  const [detailModalMember, setDetailModalMember] = useState<TeamMember | null>(null);
  const [reportModalMember, setReportModalMember] = useState<TeamMember | null>(null);
  const [isLeaderModalOpen, setIsLeaderModalOpen] = useState<boolean>(false);
  const [currentLeader, setCurrentLeader] = useState<string | null>(null);

  // Member CRUD modal state
  const [isMemberFormOpen, setIsMemberFormOpen] = useState<boolean>(false);
  const [memberToEdit, setMemberToEdit] = useState<TeamMember | null>(null);

  // TV / Kiosk Mode state
  const [isKioskOpen, setIsKioskOpen] = useState<boolean>(false);

  // Handle direct avatar URL update
  const handleSaveAvatarUrl = (newAvatarUrl: string) => {
    if (!imageModalMember) return;

    const updated = { ...imageModalMember, avatarUrl: newAvatarUrl };

    setMembers((prevMembers) =>
      prevMembers.map((m) =>
        m.id === imageModalMember.id ? updated : m
      )
    );

    updateMemberInFirestore(updated);

    if (selectedEvaluationMember.id === imageModalMember.id) {
      setSelectedEvaluationMember(updated);
    }

    setImageModalMember(null);
    toast.success('Foto do perfil atualizada com sucesso!');
  };

  // Handle saving (Add or Edit) member
  const handleSaveMember = (memberData: TeamMember) => {
    const isExisting = members.some((m) => m.id === memberData.id);

    setMembers((prevMembers) => {
      let updatedList: TeamMember[];
      if (isExisting) {
        updatedList = prevMembers.map((m) => (m.id === memberData.id ? memberData : m));
      } else {
        updatedList = [...prevMembers, memberData];
      }

      // Re-sort and re-rank
      const sorted = [...updatedList].sort((a, b) => b.score - a.score);
      const ranked = sorted.map((m, idx) => ({
        ...m,
        previousRank: m.rank,
        rank: idx + 1,
      }));

      // Update in Firestore
      if (isExisting) {
        updateMemberInFirestore(memberData);
      } else {
        addMemberToFirestore(memberData);
      }

      return ranked;
    });

    toast.success(
      isExisting
        ? `Dados de ${memberData.name} atualizados com sucesso!`
        : `Colaborador ${memberData.name} cadastrado com sucesso!`,
      isExisting ? 'Atualização Concluída' : 'Cadastro Concluído'
    );
  };

  // Handle deleting member
  const handleDeleteMember = (memberId: string) => {
    const target = members.find((m) => m.id === memberId);
    setMembers((prev) => {
      const filtered = prev.filter((m) => m.id !== memberId);
      const sorted = [...filtered].sort((a, b) => b.score - a.score);
      return sorted.map((m, idx) => ({
        ...m,
        previousRank: m.rank,
        rank: idx + 1,
      }));
    });

    deleteMemberFromFirestore(memberId);
    toast.info(`Colaborador ${target?.name || ''} removido com sucesso.`);
  };

  // Handle saving evaluation from leader view
  const handleSaveEvaluation = (
    memberId: string,
    newTotalScore: number,
    criteriaScores: Record<string, number>,
    comments: string,
    cycle = 'Agosto/2026',
    pdiGoals: PdiGoal[] = []
  ) => {
    let newStatus: PerformanceStatus = 'Caminho Certo';
    if (newTotalScore > 140) newStatus = 'Voando';
    else if (newTotalScore > 130) newStatus = 'Caminho Certo';
    else if (newTotalScore >= 120) newStatus = 'Atenção';
    else newStatus = 'Alarme';

    const targetMember = members.find((m) => m.id === memberId);
    if (targetMember) {
      // Update history
      const existingHistory = targetMember.history || [];
      const updatedHistory = [
        ...existingHistory.filter((h) => h.month !== cycle.slice(0, 3)),
        { month: cycle.slice(0, 3), score: newTotalScore },
      ];

      const updatedMember: TeamMember = {
        ...targetMember,
        score: newTotalScore,
        status: newStatus,
        evaluationStatus: 'Concluído' as const,
        pdiGoals,
        history: updatedHistory,
      };

      updateMemberInFirestore(updatedMember);

      saveEvaluationInFirestore({
        id: `eval_${memberId}_${Date.now()}`,
        memberId,
        memberName: targetMember.name,
        leaderName: currentLeader || targetMember.team,
        score: newTotalScore,
        status: newStatus,
        cycle,
        comments,
        pdiGoals,
        criteriaScores,
        updatedAt: new Date().toISOString(),
      });
    }

    setMembers((prevMembers) => {
      const updated = prevMembers.map((m) => {
        if (m.id === memberId) {
          const existingHistory = m.history || [];
          return {
            ...m,
            score: newTotalScore,
            status: newStatus,
            evaluationStatus: 'Concluído' as const,
            pdiGoals,
            history: [
              ...existingHistory.filter((h) => h.month !== cycle.slice(0, 3)),
              { month: cycle.slice(0, 3), score: newTotalScore },
            ],
          };
        }
        return m;
      });

      // Recalculate ranks based on scores descending
      const sorted = [...updated].sort((a, b) => b.score - a.score);
      return sorted.map((m, index) => ({
        ...m,
        previousRank: m.rank,
        rank: index + 1,
      }));
    });
  };

  return (
    <div className="min-h-screen bg-[#0A1424] text-[#F2F5FA] flex flex-col font-sans selection:bg-[#E3A73B] selection:text-[#1a1200]">
      {/* Toast Feedback Notification Overlay */}
      <ToastContainer />

      {/* Top Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenLeaderModal={() => setIsLeaderModalOpen(true)}
        onOpenKioskMode={() => setIsKioskOpen(true)}
        onOpenMemberForm={() => {
          setMemberToEdit(null);
          setIsMemberFormOpen(true);
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Main Canvas View */}
      <main className="flex-1 p-4 md:p-6 max-w-[1040px] w-full mx-auto">
        {activeTab === 'ranking' && (
          <LeaderboardView
            members={members}
            onOpenImageModal={(m) => setImageModalMember(m)}
            onSelectMemberForEvaluation={(m) => {
              setSelectedEvaluationMember(m);
              setIsLeaderModalOpen(true);
            }}
            onOpenReportModal={(m) => setReportModalMember(m)}
            onSelectMemberForDetail={(m) => setDetailModalMember(m)}
            onOpenMemberForm={(m) => {
              setMemberToEdit(m || null);
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
            onSelectMemberForDetail={(m) => setDetailModalMember(m)}
          />
        )}

        {activeTab === 'teams' && (
          <TeamsView
            members={members}
            onOpenImageModal={(m) => setImageModalMember(m)}
            onSelectMemberForDetail={(m) => setDetailModalMember(m)}
            onSelectTeamFilter={(team) => {
              setSearchQuery(team);
              setActiveTab('ranking');
            }}
          />
        )}

        {activeTab === 'leader' && (
          <EvaluationView
            members={members}
            selectedMember={selectedEvaluationMember}
            onSelectMember={setSelectedEvaluationMember}
            onSaveEvaluation={handleSaveEvaluation}
            onOpenImageModal={(m) => setImageModalMember(m)}
            onOpenReportModal={(m) => setReportModalMember(m)}
          />
        )}
      </main>

      {/* Leader Login Modal */}
      <LeaderLoginModal
        isOpen={isLeaderModalOpen}
        onClose={() => setIsLeaderModalOpen(false)}
        onLoginSuccess={(leaderName) => {
          setCurrentLeader(leaderName);
          setActiveTab('leader');
          toast.success(`Autenticado como Líder: ${leaderName}`, 'Área do Líder');
        }}
      />

      {/* Member Form Modal (Create / Edit) */}
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

      {/* TV / Kiosk Presentation Mode */}
      <KioskModeModal
        isOpen={isKioskOpen}
        onClose={() => setIsKioskOpen(false)}
        members={members}
      />

      {/* Image Link Modal for Avatar URLs */}
      {imageModalMember && (
        <ImageLinkModal
          isOpen={!!imageModalMember}
          onClose={() => setImageModalMember(null)}
          memberName={imageModalMember.name}
          currentAvatarUrl={imageModalMember.avatarUrl}
          onSaveAvatar={handleSaveAvatarUrl}
        />
      )}

      {/* Employee Detail Modal */}
      {detailModalMember && (
        <EmployeeDetailModal
          member={detailModalMember}
          allMembers={members}
          onClose={() => setDetailModalMember(null)}
          onOpenImageModal={(m) => setImageModalMember(m)}
          onSelectForEvaluation={(m) => {
            setSelectedEvaluationMember(m);
            setActiveTab('leader');
          }}
        />
      )}

      {/* Report Export Modal (PDF / Printable) */}
      {reportModalMember && (
        <ReportExportModal
          member={reportModalMember}
          isOpen={!!reportModalMember}
          onClose={() => setReportModalMember(null)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-[#22365C] bg-[#0A1424] py-6 px-6 mt-auto">
        <div className="max-w-[1040px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 font-mono text-xs text-[#6C7C99]">
          <div>
            © 2026 <strong className="text-[#E3A73B]">Gente Digital</strong>. Análise & Desempenho de Equipes.
          </div>
          <div className="flex gap-4">
            <button className="hover:text-[#E3A73B] transition-colors">Privacidade</button>
            <button className="hover:text-[#E3A73B] transition-colors">Suporte</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
