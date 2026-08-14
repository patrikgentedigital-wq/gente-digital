import { TeamMember } from '../types';

/**
 * Exports team members list into a downloadable CSV file
 */
export function exportMembersToCSV(members: TeamMember[], filename = 'gente-digital-ranking.csv') {
  if (!members || members.length === 0) return;

  const headers = [
    'Posição (Rank)',
    'Nome',
    'Cargo',
    'Equipe / Líder',
    'Pontuação Atual',
    'Pontuação Máxima',
    'Status de Desempenho',
    'Status da Avaliação',
    'E-mail',
    'Metas PDI Concluídas',
    'Total Metas PDI',
  ];

  const rows = members.map((m) => {
    const pdiCompleted = m.pdiGoals ? m.pdiGoals.filter((g) => g.status === 'completed').length : 0;
    const pdiTotal = m.pdiGoals ? m.pdiGoals.length : 0;

    return [
      m.rank,
      `"${m.name.replace(/"/g, '""')}"`,
      `"${m.role.replace(/"/g, '""')}"`,
      `"${m.team.replace(/"/g, '""')}"`,
      m.score,
      m.maxScore || 155,
      `"${m.status}"`,
      `"${m.evaluationStatus}"`,
      `"${m.email || ''}"`,
      pdiCompleted,
      pdiTotal,
    ];
  });

  const csvContent = [
    headers.join(';'),
    ...rows.map((row) => row.join(';')),
  ].join('\r\n');

  // Add UTF-8 BOM so Excel opens accents correctly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
