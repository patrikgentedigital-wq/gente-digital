import React, { useState } from 'react';
import { TeamMember } from '../types';
import { CRITERIA_CATEGORIES } from '../data/initialData';
import { FileText, Save, Check, ChevronDown, ChevronUp, Image as ImageIcon, Sparkles, Printer } from 'lucide-react';

interface EvaluationViewProps {
  members: TeamMember[];
  selectedMember: TeamMember;
  onSelectMember: (member: TeamMember) => void;
  onSaveEvaluation: (memberId: string, newTotalScore: number, criteriaScores: Record<string, number>, comments: string) => void;
  onOpenImageModal: (member: TeamMember) => void;
  onOpenReportModal: (member: TeamMember) => void;
}

export const EvaluationView: React.FC<EvaluationViewProps> = ({
  members,
  selectedMember,
  onSelectMember,
  onSaveEvaluation,
  onOpenImageModal,
  onOpenReportModal,
}) => {
  // Initialize scores (0..5 for each category item)
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    CRITERIA_CATEGORIES.forEach((cat) => {
      cat.items.forEach((_, idx) => {
        initial[`${cat.id}-${idx}`] = 5;
      });
    });
    return initial;
  });

  const [openCategories, setOpenCategories] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
    6: true,
  });

  const [leaderComments, setLeaderComments] = useState<string>(
    'Demonstra excelente capacidade técnica e atendimento focado na resolução do cliente. Cumpre todas as normas e prazos do IXCSoft.'
  );

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reset scores and comments when selected member changes to prevent state leak between members
  React.useEffect(() => {
    const defaultScores: Record<string, number> = {};
    CRITERIA_CATEGORIES.forEach((cat) => {
      cat.items.forEach((_, idx) => {
        defaultScores[`${cat.id}-${idx}`] = 5;
      });
    });
    setScores(defaultScores);
    setLeaderComments(
      `Avaliação oficial de ${selectedMember.name} (Time ${selectedMember.team}). Observações validadas pela liderança.`
    );
  }, [selectedMember.id]);

  const toggleCategory = (catId: number) => {
    setOpenCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const updateScore = (key: string, delta: number) => {
    setScores((prev) => {
      const current = prev[key] ?? 5;
      const next = Math.max(0, Math.min(5, current + delta));
      return { ...prev, [key]: next };
    });
  };

  // Calculate category sum & grand total
  const getCategorySum = (catId: number) => {
    const cat = CRITERIA_CATEGORIES.find((c) => c.id === catId);
    if (!cat) return 0;
    return cat.items.reduce((acc, _, idx) => acc + (scores[`${catId}-${idx}`] ?? 5), 0);
  };

  const grandTotal = (Object.values(scores) as number[]).reduce((a: number, b: number) => a + b, 0);

  const handleSave = () => {
    onSaveEvaluation(selectedMember.id, grandTotal, scores, leaderComments);
    setToastMessage(`Avaliação de ${selectedMember.name} salva com sucesso! Pontuação: ${grandTotal}/155`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="w-full max-w-[1040px] mx-auto pb-16 font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#E3A73B] text-[#1a1200] font-bold text-xs px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-[#eeb64f] animate-in slide-in-from-top duration-200">
          <Check className="w-4 h-4" />
          {toastMessage}
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-[#0F1E38] border border-[#22365C] p-6 rounded-2xl mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="font-mono text-xs text-[#E3A73B] uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Lançamento Oficial de Avaliação
          </div>
          <h2 className="font-display font-bold text-2xl text-white">Avaliação da Liderança</h2>
          <p className="text-xs text-[#A9B7CE] mt-0.5">
            Lance as notas validadas do colaborador após a conversa de feedback.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenReportModal(selectedMember)}
            className="bg-[#14294A] hover:bg-[#22365C] border border-[#22365C] text-[#E3A73B] font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <FileText className="w-4 h-4" />
            Exportar Relatório PDF
          </button>
        </div>
      </div>

      {/* Collaborator Selector Dropdown */}
      <div className="bg-[#0F1E38] border border-[#22365C] p-4 rounded-xl mb-6">
        <label className="block text-xs font-mono font-semibold text-[#A9B7CE] mb-2 uppercase">
          Selecione o Colaborador
        </label>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <select
            value={selectedMember.id}
            onChange={(e) => {
              const m = members.find((x) => x.id === e.target.value);
              if (m) onSelectMember(m);
            }}
            className="flex-1 bg-[#14294A] border border-[#22365C] text-white font-sans text-sm p-3 rounded-xl focus:outline-none focus:border-[#E3A73B]"
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.role} • Time {m.team})
              </option>
            ))}
          </select>

          <button
            onClick={() => onOpenImageModal(selectedMember)}
            className="bg-[#14294A] hover:border-[#E3A73B] text-xs font-bold text-[#F2F5FA] border border-[#22365C] px-3.5 py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0"
          >
            <ImageIcon className="w-3.5 h-3.5 text-[#E3A73B]" />
            Editar Foto
          </button>
        </div>
      </div>

      {/* Criteria Categories Cards */}
      <div className="space-y-3">
        {CRITERIA_CATEGORIES.map((cat) => {
          const isOpen = !!openCategories[cat.id];
          const catSum = getCategorySum(cat.id);
          const catMax = cat.items.length * 5;

          return (
            <div key={cat.id} className="bg-[#0F1E38] border border-[#22365C] rounded-xl overflow-hidden transition-all">
              {/* Category Header */}
              <div
                onClick={() => toggleCategory(cat.id)}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#14294A]/50 transition-colors"
              >
                <div className="font-display font-semibold text-sm text-[#F2F5FA] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-[#14294A] text-[#E3A73B] font-mono text-xs flex items-center justify-center font-bold">
                    {cat.id}
                  </span>
                  {cat.name}
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-[#E3A73B] font-bold">
                    {catSum} / {catMax}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-[#6C7C99]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#6C7C99]" />
                  )}
                </div>
              </div>

              {/* Items Body */}
              {isOpen && (
                <div className="px-4 pb-4 border-t border-[#22365C] divide-y divide-[#22365C]">
                  {cat.items.map((label, idx) => {
                    const key = `${cat.id}-${idx}`;
                    const score = scores[key] ?? 5;

                    return (
                      <div key={idx} className="flex items-center justify-between gap-4 py-3">
                        <div className="text-xs text-[#A9B7CE] leading-normal flex-1">
                          {label}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => updateScore(key, -1)}
                            className="w-7 h-7 rounded-lg border border-[#22365C] bg-[#0A1424] hover:border-[#E3A73B] text-white font-mono text-base font-bold flex items-center justify-center cursor-pointer transition-colors"
                          >
                            −
                          </button>
                          <span className="font-mono font-bold text-sm text-[#F2F5FA] w-5 text-center">
                            {score}
                          </span>
                          <button
                            onClick={() => updateScore(key, 1)}
                            className="w-7 h-7 rounded-lg border border-[#22365C] bg-[#0A1424] hover:border-[#E3A73B] text-white font-mono text-base font-bold flex items-center justify-center cursor-pointer transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Leader Comments Box */}
      <div className="bg-[#0F1E38] border border-[#22365C] p-4 rounded-xl mt-4 space-y-2">
        <label className="text-xs font-mono font-bold text-[#E3A73B] uppercase tracking-wider block">
          Comentários do Líder
        </label>
        <textarea
          value={leaderComments}
          onChange={(e) => setLeaderComments(e.target.value)}
          rows={3}
          placeholder="Insira as principais considerações do feedback..."
          className="w-full bg-[#0A1424] border border-[#22365C] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#E3A73B] resize-none"
        />
      </div>

      {/* Sticky Bottom Total Bar */}
      <div className="sticky bottom-4 mt-6 bg-[#0F1E38] border border-[#22365C] rounded-xl p-4 px-6 flex items-center justify-between shadow-2xl z-30">
        <div>
          <div className="text-[11px] font-mono text-[#6C7C99]">Pontuação Final Calculada</div>
          <div className="font-mono font-bold text-2xl text-[#E3A73B]">
            {grandTotal} <span className="text-xs text-[#6C7C99] font-normal">/ 155</span>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="bg-[#E3A73B] hover:bg-[#eeb64f] text-[#1a1200] font-bold font-sans text-sm px-6 py-2.5 rounded-xl cursor-pointer transition-all shadow-md flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Salvar Avaliação
        </button>
      </div>
    </div>
  );
};
