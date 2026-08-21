import React, { useState, useEffect } from 'react';
import { TeamMember, LeaderName } from '../types';
import { TEAMS } from '../data/catalogData';
import { X, UserPlus, Edit3, Trash2, Mail, Briefcase, Users, Link as LinkIcon, AlertTriangle, Check } from 'lucide-react';
import { useDialog } from '../hooks/useDialog';

interface MemberFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberToEdit?: TeamMember | null;
  onSaveMember: (memberData: TeamMember) => Promise<void> | void;
  onDeleteMember?: (memberId: string) => Promise<void> | void;
}

export const MemberFormModal: React.FC<MemberFormModalProps> = ({
  isOpen,
  onClose,
  memberToEdit,
  onSaveMember,
  onDeleteMember,
}) => {
  const isEditing = !!memberToEdit;
  const dialogRef = useDialog(isOpen, onClose);

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [team, setTeam] = useState<LeaderName>('Djemerson');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarError, setAvatarError] = useState(false);
  const [score, setScore] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (memberToEdit) {
      setName(memberToEdit.name);
      setRole(memberToEdit.role);
      setTeam(memberToEdit.team);
      setEmail(memberToEdit.email || '');
      setAvatarUrl(memberToEdit.avatarUrl || '');
       setScore(memberToEdit.score ?? 0);
    } else {
      setName('');
      setRole('');
      setTeam('Djemerson');
      setEmail('');
      setAvatarUrl('');
       setScore(0);
    }
    setShowDeleteConfirm(false);
    setAvatarError(false);
  }, [memberToEdit, isOpen]);

  if (!isOpen) return null;

  const selectedTeamData = TEAMS.find((t) => t.leader === team) || TEAMS[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role.trim()) return;

    const finalScore = isEditing ? (memberToEdit?.score ?? score) : score;
    let status: TeamMember['status'] = 'Caminho Certo';
    if (finalScore > 140) status = 'Voando';
    else if (finalScore > 130) status = 'Caminho Certo';
    else if (finalScore >= 120) status = 'Atenção';
    else status = 'Alarme';

    const memberId = memberToEdit?.id || `member_${crypto.randomUUID()}`;

    const memberData: TeamMember = {
      id: memberId,
      name: name.trim(),
      role: role.trim(),
      team,
      teamColor: selectedTeamData?.color || '#3B6FE0',
      rank: memberToEdit?.rank || 99,
      previousRank: memberToEdit?.previousRank,
      score: finalScore,
      maxScore: 155,
      status,
      avatarUrl: avatarUrl.trim() || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name.trim())}`,
      evaluationStatus: memberToEdit?.evaluationStatus || 'Pendente',
      email: email.trim(),
      pdiGoals: memberToEdit?.pdiGoals || [],
      history: memberToEdit?.history || [],
      deleted: false,
    };

    try {
      await onSaveMember(memberData);
      onClose();
    } catch {
      // Keep the form open so the user can correct or retry after a persistence error.
    }
  };

  const handleDelete = async () => {
    if (!memberToEdit || !onDeleteMember) return;

    try {
      await onDeleteMember(memberToEdit.id);
      onClose();
    } catch {
      // Keep the confirmation open so the user can retry after a persistence error.
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" role="presentation">
      <div
        ref={dialogRef}
        className="bg-surface border border-line w-full max-w-lg rounded-2xl p-6 shadow-2xl relative flex flex-col gap-5 text-ink max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-form-modal-title"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent">
              {isEditing ? <Edit3 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 id="member-form-modal-title" className="font-display font-bold text-lg text-white">
                {isEditing ? 'Editar Colaborador' : 'Novo Colaborador'}
              </h3>
              <p className="text-xs text-muted">
                {isEditing ? 'Atualize as informações cadastrais e de equipe' : 'Cadastre um novo membro para o ranking e avaliação'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar formulário de colaborador"
            className="text-faint hover:text-white p-1 rounded-lg hover:bg-surface-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Delete Confirmation Alert if active */}
        {showDeleteConfirm ? (
          <div className="bg-danger-soft border border-danger/40 p-4 rounded-xl flex flex-col gap-3">
            <div className="flex items-center gap-2 text-danger font-bold text-xs">
              <AlertTriangle className="w-4 h-4" />
              <span>Confirmar arquivamento de {memberToEdit?.name}?</span>
            </div>
            <p className="text-xs text-danger-pale leading-relaxed">
              O colaborador será arquivado e deixará de aparecer no ranking. O histórico poderá ser restaurado por um administrador.
            </p>
            <div className="flex justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-2 hover:bg-primary-hover text-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-danger hover:bg-danger-hover text-white flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Confirmar Arquivamento
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Live Avatar Preview */}
            <div className="flex items-center gap-4 bg-surface-2 p-3.5 rounded-xl border border-line">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-app border-2 border-accent/50 shrink-0 flex items-center justify-center">
                {avatarUrl && !avatarError ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="font-bold text-sm text-accent">
                    {name ? name.slice(0, 2).toUpperCase() : 'GD'}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-semibold text-muted mb-1">
                  URL da Foto / Avatar
                </label>
                <div className="relative">
                  <LinkIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => {
                      setAvatarUrl(e.target.value);
                      setAvatarError(false);
                    }}
                    placeholder="https://exemplo.com/foto.jpg (ou gerador automático)"
                    maxLength={2048}
                    className="w-full bg-surface border border-line rounded-lg pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-muted">Nome Completo *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: João da Silva"
                maxLength={100}
                className="w-full bg-surface-2 border border-line rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-accent"
                required
              />
            </div>

            {/* Role & Email Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-muted">Cargo / Especialidade *</label>
                <div className="relative">
                  <Briefcase className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Ex: Suporte IXC N1"
                    maxLength={120}
                    className="w-full bg-surface-2 border border-line rounded-xl pl-8 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-accent"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-muted">E-mail Corporativo</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@gentedigital.com.br"
                    maxLength={254}
                    className="w-full bg-surface-2 border border-line rounded-xl pl-8 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>

            {/* Team Selection */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-muted">Equipe / Líder Responsável *</label>
              <div className="relative">
                <Users className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                <select
                  value={team}
                  onChange={(e) => setTeam(e.target.value as LeaderName)}
                  className="w-full bg-surface-2 border border-line rounded-xl pl-8 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-accent"
                >
                  {TEAMS.map((t) => (
                    <option key={t.leader} value={t.leader}>
                      Time {t.leader}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Score slider */}
            <div className="space-y-1 bg-surface-2 p-3 rounded-xl border border-line">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted font-semibold">{isEditing ? 'Pontuação atual:' : 'Pontuação inicial:'}</span>
                <span className="font-mono font-bold text-accent">{isEditing ? memberToEdit?.score : score} / 155 pts</span>
              </div>
              <input
                type="range"
                min="0"
                max="155"
                value={isEditing ? memberToEdit?.score ?? 0 : score}
                disabled={isEditing}
                onChange={(e) => setScore(Number(e.target.value))}
                className="w-full accent-accent enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              />
              {isEditing && (
                <p className="text-[11px] text-faint">
                  A pontuação de um colaborador existente só muda por uma avaliação completa da liderança.
                </p>
              )}
            </div>

            {/* Form actions */}
            <div className="flex items-center justify-between pt-2 border-t border-line">
              {isEditing ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-xs text-danger hover:text-danger-light font-semibold flex items-center gap-1.5 p-2 rounded-lg hover:bg-danger-soft transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Arquivar Colaborador
                </button>
              ) : (
                <div />
              )}

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface-2 hover:bg-primary-hover text-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-accent hover:bg-accent-hover text-accent-ink flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  {isEditing ? 'Salvar Alterações' : 'Cadastrar Membro'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
