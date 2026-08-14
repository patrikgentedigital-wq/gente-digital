import React, { useState, useEffect } from 'react';
import { TeamMember, PerformanceStatus } from './types';
import { INITIAL_TEAM_MEMBERS } from './data/initialData';
import { subscribeToMembers, updateMemberInFirestore, saveEvaluationInFirestore } from './lib/firebase';
import { Navbar } from './components/Navbar';
import { LeaderboardView } from './components/LeaderboardView';
import { DashboardView } from './components/DashboardView';
import { TeamsView } from './components/TeamsView';
import { EvaluationView } from './components/EvaluationView';
import { ImageLinkModal } from './components/ImageLinkModal';
import { EmployeeDetailModal } from './components/EmployeeDetailModal';
import { LeaderLoginModal } from './components/LeaderLoginModal';
import { ReportExportModal } from './components/ReportExportModal';

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
  };

  // Handle saving evaluation from leader view
  const handleSaveEvaluation = (
    memberId: string,
    newTotalScore: number,
    criteriaScores: Record<string, number>,
    comments: string
  ) => {
    let newStatus: PerformanceStatus = 'Caminho Certo';
    if (newTotalScore > 140) newStatus = 'Voando';
    else if (newTotalScore > 130) newStatus = 'Caminho Certo';
    else if (newTotalScore >= 120) newStatus = 'Atenção';
    else newStatus = 'Alarme';

    const targetMember = members.find((m) => m.id === memberId);
    if (targetMember) {
      const updatedMember: TeamMember = {
        ...targetMember,
        score: newTotalScore,
        status: newStatus,
        evaluationStatus: 'Concluído' as const,
      };

      updateMemberInFirestore(updatedMember);

      saveEvaluationInFirestore({
        id: `eval_${memberId}_${Date.now()}`,
        memberId,
        memberName: targetMember.name,
        leaderName: currentLeader || targetMember.team,
        score: newTotalScore,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
    }

    setMembers((prevMembers) => {
      const updated = prevMembers.map((m) => {
        if (m.id === memberId) {
          return {
            ...m,
            score: newTotalScore,
            status: newStatus,
            evaluationStatus: 'Concluído' as const,
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
      {/* Top Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenLeaderModal={() => setIsLeaderModalOpen(true)}
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
        }}
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
