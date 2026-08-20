import React, { lazy, Suspense } from 'react';
import { TeamMember } from '../types';
import type { EvaluationPayload } from '../lib/firebaseLoader';
import { ImageLinkModal } from './ImageLinkModal';
import { MemberFormModal } from './MemberFormModal';
import { KioskModeModal } from './KioskModeModal';

const EmployeeDetailModal = lazy(() => import('./EmployeeDetailModal').then((module) => ({ default: module.EmployeeDetailModal })));
const ReportExportModal = lazy(() => import('./ReportExportModal').then((module) => ({ default: module.ReportExportModal })));

export interface ReportModalState {
  member: TeamMember;
  criteriaScores?: Record<string, number>;
  leaderComments?: string;
  cycle?: string;
}

interface AuthenticatedModalsProps {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isMemberFormOpen: boolean;
  memberToEdit: TeamMember | null;
  onCloseMemberForm: () => void;
  onOpenMemberForm: (member: TeamMember | null) => void;
  onSaveMember: (member: TeamMember) => Promise<void>;
  onDeleteMember: (memberId: string) => Promise<void>;
  isKioskOpen: boolean;
  onCloseKiosk: () => void;
  members: TeamMember[];
  imageModalMember: TeamMember | null;
  onOpenImageModal: (member: TeamMember) => void;
  onCloseImageModal: () => void;
  onSaveAvatar: (url: string) => Promise<void>;
  detailModalMember: TeamMember | null;
  detailEvaluation: EvaluationPayload | null;
  onCloseDetail: () => void;
  onSelectForEvaluation: (member: TeamMember) => void;
  reportModal: ReportModalState | null;
  onCloseReport: () => void;
}

export const AuthenticatedModals: React.FC<AuthenticatedModalsProps> = ({
  isAuthenticated,
  isAdmin,
  isMemberFormOpen,
  memberToEdit,
  onCloseMemberForm,
  onOpenMemberForm,
  onSaveMember,
  onDeleteMember,
  isKioskOpen,
  onCloseKiosk,
  members,
  imageModalMember,
  onOpenImageModal,
  onCloseImageModal,
  onSaveAvatar,
  detailModalMember,
  detailEvaluation,
  onCloseDetail,
  onSelectForEvaluation,
  reportModal,
  onCloseReport,
}) => {
  if (!isAuthenticated) return null;

  return (
    <Suspense fallback={null}>
      {isAdmin && isMemberFormOpen && (
        <MemberFormModal
          isOpen
          onClose={onCloseMemberForm}
          memberToEdit={memberToEdit}
          onSaveMember={onSaveMember}
          onDeleteMember={onDeleteMember}
        />
      )}

      {isKioskOpen && <KioskModeModal isOpen onClose={onCloseKiosk} members={members} />}

      {isAdmin && imageModalMember && (
        <ImageLinkModal
          isOpen
          onClose={onCloseImageModal}
          memberName={imageModalMember.name}
          currentAvatarUrl={imageModalMember.avatarUrl}
          onSaveAvatar={onSaveAvatar}
        />
      )}

      {detailModalMember && (
        <EmployeeDetailModal
          member={detailModalMember}
          allMembers={members}
          evaluation={detailEvaluation}
          onClose={onCloseDetail}
          onOpenImageModal={isAdmin ? onOpenImageModal : undefined}
          onSelectForEvaluation={onSelectForEvaluation}
        />
      )}

      {reportModal && (
        <ReportExportModal
          member={reportModal.member}
          isOpen
          onClose={onCloseReport}
          criteriaScores={reportModal.criteriaScores}
          leaderComments={reportModal.leaderComments}
          cycle={reportModal.cycle}
        />
      )}
    </Suspense>
  );
};
