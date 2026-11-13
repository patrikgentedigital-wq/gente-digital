import { validateCriteriaCategories, type CriteriaCategory } from './criteria';

export interface ParsedCriteria {
  categories: CriteriaCategory[];
  /** Mensagens em português; vazia quando o resultado pode ir para o editor e ser salvo. */
  errors: string[];
}

const DEFAULT_CATEGORY_NAME = 'Competência';

/** Linhas que não são título nem pergunta: cabeçalho do documento, notas, observações e totais. */
const NOISE_LINES = [
  /^nota\s*:/i,
  /^observa[cç][õo]es?\b/i,
  /^subtotal\b/i,
  /^total\b/i,
  /^crit[ée]rios avaliados/i,
  /^gente digital\b/i,
  /^avalia[cç][ãa]o de desempenho\b/i,
  /^(colaborador|colaboradora|cargo|fun[cç][ãa]o)\s*:/i,
];

const LEADING_NUMBER = /^\d+\s*[.)]\s+/;

function formatCategoryName(raw: string): string {
  const name = raw.replace(/[:\s]+$/, '').trim();
  const isAllCaps = name === name.toUpperCase() && name !== name.toLowerCase();
  if (!isAllCaps) return name;
  const lower = name.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/**
 * Lê um formulário colado como texto: linhas que terminam em ponto, "?" ou "!" são perguntas e as outras
 * (sem o número do começo) são títulos de categoria. Ignora cabeçalho, notas, observações e totais,
 * e não confia na numeração, que costuma vir trocada.
 */
export function parseCriteriaText(text: string): ParsedCriteria {
  const groups: { name: string; items: string[] }[] = [];
  let pendingName: string | null = null;
  let current: { name: string; items: string[] } | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || NOISE_LINES.some((pattern) => pattern.test(line))) continue;

    const content = line.replace(LEADING_NUMBER, '').trim();
    if (!content) continue;

    if (/[.?!]$/.test(content)) {
      if (!current || pendingName !== null) {
        current = { name: pendingName ?? DEFAULT_CATEGORY_NAME, items: [] };
        groups.push(current);
        pendingName = null;
      }
      current.items.push(content);
    } else {
      pendingName = formatCategoryName(content);
    }
  }

  const categories: CriteriaCategory[] = groups.map((group, categoryIndex) => ({
    id: String(categoryIndex + 1),
    name: group.name,
    items: group.items.map((itemText, itemIndex) => ({ id: `${categoryIndex + 1}-${itemIndex}`, text: itemText })),
  }));

  return { categories, errors: validateCriteriaCategories(categories) };
}
