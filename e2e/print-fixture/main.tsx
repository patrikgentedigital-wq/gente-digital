import React from 'react';
import { createRoot } from 'react-dom/client';
import { ReportExportModal } from '../../src/components/ReportExportModal';
import '../../src/index.css';
import type { TeamMember } from '../../src/types';

const categories = Array.from({ length: 6 }, (_, i) => ({
  id: `c${i}`, name: `Categoria ${i + 1}`, items: [{ id: `q${i}`, text: 'Pergunta sintética?' }],
}));
const scores = Object.fromEntries(categories.map((c) => [c.items[0].id, 4]));
const member = {
  id: 'teste', name: 'Pessoa Exemplo', role: 'Gerente', team: 'Equipe', teamColor: '#ffe708',
  rank: 1, score: 24, maxScore: 30, status: 'Atenção', evaluationStatus: 'Concluído',
  avatarUrl: '', email: '', history: [],
} as TeamMember;
const sentence = 'A pessoa demonstra organização e acompanha resultados, mantendo diálogo com a equipe. ';
const length = new URLSearchParams(window.location.search).has('long') ? 4500 : 606;
const comment = (sentence.repeat(Math.ceil(length / sentence.length))).slice(0, length);

createRoot(document.getElementById('root')!).render(<>
  <main style={{ height: 2500 }}>Painel longo de teste que não deve aparecer na impressão.</main>
  <ReportExportModal member={member} isOpen onClose={() => {}} criteria={categories} criteriaScores={scores} leaderComments={comment} cycle="Outubro/2026" />
</>);
