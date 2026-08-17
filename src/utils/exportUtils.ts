import { TeamMember } from '../types';

/**
 * Sanitizes a cell to prevent CSV / Formula Injection (leading =, +, -, @, \t, \r)
 * and escapes double quotes.
 */
export function escapeCSVCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  if (typeof value === 'number') return String(value);

  let str = String(value).trim();
  // Neutralize formula trigger characters
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Builds CSV string content for team members
 */
export function buildMembersCSVContent(members: TeamMember[]): string {
  if (!members || members.length === 0) return '';

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
      escapeCSVCell(m.name),
      escapeCSVCell(m.role),
      escapeCSVCell(m.team),
      m.score,
      m.maxScore || 155,
      escapeCSVCell(m.status),
      escapeCSVCell(m.evaluationStatus),
      escapeCSVCell(m.email || ''),
      pdiCompleted,
      pdiTotal,
    ];
  });

  return [
    headers.join(';'),
    ...rows.map((row) => row.join(';')),
  ].join('\r\n');
}

/**
 * Exports team members list into a downloadable CSV file
 */
export function exportMembersToCSV(members: TeamMember[], filename = 'gente-digital-ranking.csv') {
  const csvContent = buildMembersCSVContent(members);
  if (!csvContent) return;

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
