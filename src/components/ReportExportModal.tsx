import React, { useRef } from 'react';
import { X, Printer, Download, Award, CheckCircle2, Calendar, User, ShieldCheck, Sparkles, Image as ImageIcon } from 'lucide-react';
import { TeamMember, EvaluationCriterion } from '../types';
import { CRITERIA_CATEGORIES } from '../data/initialData';

interface ReportExportModalProps {
  member: TeamMember;
  isOpen: boolean;
  onClose: () => void;
  criteriaScores?: Record<string, number>;
  leaderComments?: string;
}

export const ReportExportModal: React.FC<ReportExportModalProps> = ({
  member,
  isOpen,
  onClose,
  criteriaScores,
  leaderComments = 'Demonstra excelente postura profissional e precisão técnica nas entregas. Recomendado para o próximo ciclo de aceleração.',
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  // Helper to calculate category score
  const getCategoryScore = (catId: number) => {
    const cat = CRITERIA_CATEGORIES.find((c) => c.id === catId);
    if (!cat) return { sum: 0, max: 25 };
    const max = cat.items.length * 5;
    if (!criteriaScores) return { sum: Math.round((member.score / 155) * max), max };

    let sum = 0;
    cat.items.forEach((_, idx) => {
      const key = `${catId}-${idx}`;
      sum += criteriaScores[key] ?? 5;
    });
    return { sum, max };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050912]/85 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
      {/* Modal Box */}
      <div className="bg-[#0F1E38] border border-[#22365C] w-full max-w-3xl rounded-2xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden text-[#F2F5FA]">
        
        {/* Top Bar Action */}
        <div className="p-4 border-b border-[#22365C] bg-[#14294A] flex justify-between items-center print:hidden">
          <div className="flex items-center gap-2 font-display font-bold text-sm text-white">
            <Sparkles className="w-4 h-4 text-[#E3A73B]" />
            Relatório Consolidado de Desempenho
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-[#E3A73B] text-[#1a1200] font-bold text-xs hover:bg-[#eeb64f] transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir / Baixar PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#A9B7CE] hover:text-white rounded-lg hover:bg-[#22365C] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Canvas */}
        <div className="p-8 overflow-y-auto space-y-6 print:p-0 print:overflow-visible" ref={printRef}>
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#14294A] to-[#0A1424] border border-[#22365C] p-6 rounded-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <img
                src={member.avatarUrl}
                alt={member.name}
                referrerPolicy="no-referrer"
                className="w-20 h-20 rounded-full object-cover border-2 border-[#E3A73B] shadow-lg bg-[#0A1424]"
              />
              <div>
                <div className="font-mono text-[10px] text-[#E3A73B] uppercase tracking-widest font-bold mb-0.5">
                  GENTE DIGITAL · RELATÓRIO INDIVIDUAL
                </div>
                <h2 className="text-2xl font-display font-bold text-white">{member.name}</h2>
                <p className="text-xs text-[#A9B7CE] font-sans">{member.role}</p>
                <div className="flex items-center gap-2 mt-2 font-mono text-[11px] text-[#6C7C99]">
                  <span>Líder: <strong className="text-white">{member.team}</strong></span>
                  <span>•</span>
                  <span>Rank: <strong className="text-[#E3A73B]">#{member.rank}</strong></span>
                </div>
              </div>
            </div>

            <div className="text-right border-t md:border-t-0 border-[#22365C] pt-3 md:pt-0 w-full md:w-auto">
              <div className="font-mono text-[10px] text-[#6C7C99] uppercase">Pontuação Final</div>
              <div className="text-4xl font-mono font-bold text-[#E3A73B]">
                {member.score} <span className="text-sm font-normal text-[#6C7C99]">/ 155</span>
              </div>
              <div className="mt-1 inline-block font-mono text-[11px] font-bold px-3 py-1 rounded-md bg-[#3A2E14] text-[#E3A73B] border border-[#E3A73B]/30 uppercase">
                {member.status}
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="space-y-3">
            <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#E3A73B]" />
              Pontuação por Categoria de Avaliação
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CRITERIA_CATEGORIES.map((cat) => {
                const { sum, max } = getCategoryScore(cat.id);
                const percent = Math.round((sum / max) * 100);

                return (
                  <div key={cat.id} className="bg-[#14294A]/60 border border-[#22365C] p-3.5 rounded-xl flex flex-col justify-between">
                    <div className="flex justify-between items-center text-xs mb-2">
                      <span className="font-semibold text-white">{cat.id}. {cat.name}</span>
                      <span className="font-mono text-[#E3A73B] font-bold">{sum}/{max}</span>
                    </div>

                    <div className="w-full h-2 bg-[#0A1424] rounded-full overflow-hidden border border-[#22365C]">
                      <div
                        className="h-full bg-gradient-to-r from-[#E3A73B] to-[#4fb579] rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Feedback & Observations */}
          <div className="bg-[#14294A] border border-[#22365C] p-4 rounded-xl space-y-2">
            <span className="font-mono text-[11px] font-bold text-[#E3A73B] uppercase tracking-wider block">
              Parecer Final da Liderança
            </span>
            <p className="text-xs text-[#A9B7CE] italic leading-relaxed">
              "{leaderComments}"
            </p>
          </div>

          {/* Signatures & Stamp */}
          <div className="border-t border-[#22365C] pt-6 grid grid-cols-2 gap-6 text-center text-xs font-mono text-[#6C7C99]">
            <div className="space-y-8">
              <div className="border-b border-[#22365C] w-3/4 mx-auto" />
              <div>
                <p className="font-bold text-white">{member.name}</p>
                <p className="text-[10px]">Assinatura do Colaborador</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="border-b border-[#22365C] w-3/4 mx-auto" />
              <div>
                <p className="font-bold text-white">{member.team} (Líder)</p>
                <p className="text-[10px]">Validação de Liderança</p>
              </div>
            </div>
          </div>

          {/* Footer watermark */}
          <div className="text-center font-mono text-[10px] text-[#6C7C99] pt-2">
            Documento gerado em {new Date().toLocaleDateString('pt-BR')} via Plataforma Gente Digital
          </div>
        </div>
      </div>
    </div>
  );
};
