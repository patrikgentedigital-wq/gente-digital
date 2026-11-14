import React, { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const ACTIONS_SLOT_ID = 'page-header-actions';

export type Tab = 'ranking' | 'dashboard' | 'teams' | 'leader' | 'audit' | 'criteria' | 'assistant' | 'success' | 'leaders' | 'org';

export const PAGE_TITLES: Record<Tab, string> = {
  dashboard: 'Visão geral',
  ranking: 'Ranking',
  teams: 'Equipes',
  leader: 'Avaliar',
  audit: 'Auditoria',
  criteria: 'Perguntas',
  success: 'Sucesso do Cliente',
  assistant: 'Assistente',
  leaders: 'Líderes',
  org: 'Organograma',
};

interface PageHeaderProps {
  tab: Tab;
  /** Texto curto ao lado do título, como o ciclo das avaliações. */
  meta?: string;
  /** Botões da tela (exportar, cadastrar), na mesma linha do título. */
  actions?: React.ReactNode;
}

/** Faixa amarela com o título da tela em letras grandes. */
export const PageHeader: React.FC<PageHeaderProps> = ({ tab, meta, actions }) => (
  <div className="band">
    <div className="max-w-[1040px] mx-auto px-6 py-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="font-display text-3xl md:text-[34px] font-extrabold uppercase tracking-[-0.02em] leading-none">
          {PAGE_TITLES[tab]}
        </h1>
        {meta && <p className="mt-2 text-xs font-bold">{meta}</p>}
      </div>
      <div id={ACTIONS_SLOT_ID} className="flex flex-wrap items-center gap-2 empty:hidden">
        {actions}
      </div>
    </div>
  </div>
);

/**
 * Botões de uma tela que aparecem no cabeçalho, na mesma linha do título. O cabeçalho fica fora do
 * conteúdo (a faixa ocupa a largura toda), então os botões vão até ele por portal.
 * Sem cabeçalho na página (testes, telas isoladas), os botões ficam no lugar.
 */
export const PageActions: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  // Antes de pintar a tela, para os botões não aparecerem um instante fora da faixa.
  useLayoutEffect(() => setSlot(document.getElementById(ACTIONS_SLOT_ID)), []);
  if (slot) return createPortal(children, slot);
  return <div className="flex flex-wrap items-center justify-end gap-2 mb-4">{children}</div>;
};
