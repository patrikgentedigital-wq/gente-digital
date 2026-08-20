import React from 'react';
import { X, Shield, HelpCircle, Mail, MessageSquare, Lock, Database, Award } from 'lucide-react';
import { useDialog } from '../hooks/useDialog';

export type InfoModalType = 'privacy' | 'support' | null;

interface InfoModalProps {
  type: InfoModalType;
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ type, isOpen, onClose }) => {
  const dialogRef = useDialog(isOpen, onClose);

  if (!isOpen || !type) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="relative w-full max-w-2xl bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="info-modal-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-line bg-surface-2/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-app border border-line text-accent">
              {type === 'privacy' ? <Shield className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
            </div>
            <div>
              <h3 id="info-modal-title" className="font-display font-bold text-lg text-white">
                {type === 'privacy' ? 'Política de Privacidade & Proteção de Dados' : 'Suporte & Ajuda da Plataforma'}
              </h3>
              <p className="text-xs text-muted font-mono">Gente Digital • Governança Interna</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar informações"
            className="p-2 text-faint hover:text-white rounded-lg hover:bg-line transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-muted">
          {type === 'privacy' ? (
            <>
              <div className="p-4 rounded-xl bg-app border border-line">
                <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-accent" />
                  Confidencialidade de Avaliações & Desempenho
                </h4>
                <p className="text-xs leading-relaxed">
                  As informações de notas, histórico de avaliações, feedbacks e Planos de Desenvolvimento Individual (PDI)
                  são dados restritos, de uso estritamente corporativo e acessíveis apenas por líderes autorizados e pelo RH.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-success" />
                  Diretrizes de Segurança & LGPD
                </h4>
                <ul className="list-disc pl-5 space-y-2 text-xs">
                  <li>
                    <strong>Controle de Acesso:</strong> O acesso é controlado via autenticação do Firebase com roles verificadas (`leader` ou `admin`).
                  </li>
                  <li>
                    <strong>Imutabilidade e Auditoria:</strong> Avaliações salvas geram histórico por ciclo garantindo rastreabilidade e integridade métrica.
                  </li>
                  <li>
                    <strong>Exibição em Modo TV:</strong> O ranking público não exibe notas parciais detalhadas ou comentários confidenciais de liderança.
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 rounded-xl bg-app border border-line">
                <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-accent" />
                  Canais de Atendimento Interno
                </h4>
                <p className="text-xs leading-relaxed">
                  Precisa de auxílio com lançamento de notas, criação de novos usuários de liderança ou suporte técnico?
                  Entre em contato com nossa equipe:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-app border border-line">
                  <div className="font-bold text-white text-xs mb-1 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-accent" />
                    Gente & Gestão (RH)
                  </div>
                  <p className="text-xs text-faint mb-2">Dúvidas sobre critérios, ciclos e regras de pontuação</p>
                  <div className="flex items-center gap-2 font-mono text-xs text-accent">
                    <Mail className="w-3.5 h-3.5" />
                    <span>rh@gentedigital.com.br</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-app border border-line">
                  <div className="font-bold text-white text-xs mb-1 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-primary" />
                    TI & Infraestrutura
                  </div>
                  <p className="text-xs text-faint mb-2">Problemas de acesso, login ou permissões</p>
                  <div className="flex items-center gap-2 font-mono text-xs text-primary">
                    <Mail className="w-3.5 h-3.5" />
                    <span>suporte.ti@gentedigital.com.br</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-line bg-surface-2/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-accent-ink font-bold text-xs transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
