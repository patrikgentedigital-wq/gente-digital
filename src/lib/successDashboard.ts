/** Nota abaixo disso conta como "baixa" (a régua do Sucesso trata nota 4 como neutra e abaixo como detratora). */
export const LOW_RATING_BELOW = 4;

export interface RatingRow {
  idOs: string;
  idTecnico: string;
  nomeTecnico: string;
  dataOs: string;
  enviadaEm: string;
  respondidaEm: string;
  /** 1 a 5; 0 = sem nota. */
  nota: number;
  status: string;
}

export interface TechnicianSummary {
  idTecnico: string;
  nome: string;
  enviadas: number;
  respondidas: number;
  media: number | null;
  baixas: number;
  pctBaixas: number | null;
}

export interface LowRating {
  idOs: string;
  idTecnico: string;
  tecnico: string;
  nota: number;
  respondidaEm: string;
}

export interface SuccessSummary {
  totals: {
    enviadas: number;
    respondidas: number;
    aguardando: number;
    semResposta: number;
    naoEntendidas: number;
    /** Respondidas sobre as que já têm desfecho (sem contar as que ainda aguardam); null se nenhuma tem. */
    taxaResposta: number | null;
    media: number | null;
  };
  tecnicos: TechnicianSummary[];
  baixas: LowRating[];
  semanas: Array<{ semana: string; media: number; n: number }>;
}

/** Valida a resposta da função do servidor; linha sem OS ou técnico é descartada. */
export function parseRatingRows(data: unknown): RatingRow[] {
  if (typeof data !== 'object' || data === null) throw new Error('Resposta inválida do painel.');
  const { linhas } = data as { linhas?: unknown };
  if (!Array.isArray(linhas)) throw new Error('Resposta inválida do painel.');

  const rows: RatingRow[] = [];
  for (const item of linhas) {
    if (typeof item !== 'object' || item === null) continue;
    const r = item as Record<string, unknown>;
    const text = (value: unknown) => (typeof value === 'string' ? value : '');
    const idOs = text(r.id_os);
    const idTecnico = text(r.id_tecnico);
    if (!idOs || !idTecnico) continue;
    const nota = typeof r.nota === 'number' && Number.isFinite(r.nota) ? r.nota : 0;
    rows.push({
      idOs,
      idTecnico,
      nomeTecnico: text(r.nome_tecnico),
      dataOs: text(r.data_os),
      enviadaEm: text(r.enviada_em),
      respondidaEm: text(r.respondida_em),
      nota,
      status: text(r.status),
    });
  }
  return rows;
}

const round1 = (value: number) => Math.round(value * 10) / 10;
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const isRated = (row: RatingRow) => row.status === 'respondida' && row.nota >= 1 && row.nota <= 5;

/** O n8n grava "Tecnico 96" quando não conhece o nome; aqui vira "Técnico 96". */
function displayName(row: RatingRow): string {
  const name = row.nomeTecnico.trim();
  if (name && !/^Tecnico \d+$/.test(name)) return name;
  return `Técnico ${row.idTecnico}`;
}

/** Segunda-feira da semana (UTC) em AAAA-MM-DD. */
function weekStart(iso: string): string {
  const date = new Date(iso);
  const day = (date.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - day));
  return monday.toISOString().slice(0, 10);
}

export function summarize(rows: readonly RatingRow[]): SuccessSummary {
  const rated = rows.filter(isRated);
  const aguardando = rows.filter((r) => r.status === 'aguardando').length;
  const semResposta = rows.filter((r) => r.status === 'sem_resposta').length;
  const naoEntendidas = rows.filter((r) => r.status === 'resposta_nao_entendida').length;
  const comDesfecho = rows.length - aguardando;

  const byTechnician = new Map<string, RatingRow[]>();
  for (const row of rows) byTechnician.set(row.idTecnico, [...(byTechnician.get(row.idTecnico) ?? []), row]);

  const tecnicos: TechnicianSummary[] = [...byTechnician.entries()].map(([idTecnico, list]) => {
    const notes = list.filter(isRated).map((r) => r.nota);
    const baixas = notes.filter((n) => n < LOW_RATING_BELOW).length;
    const named = list.find((r) => r.nomeTecnico.trim() && !/^Tecnico \d+$/.test(r.nomeTecnico.trim())) ?? list[0];
    return {
      idTecnico,
      nome: displayName(named),
      enviadas: list.length,
      respondidas: notes.length,
      media: notes.length ? round1(mean(notes)) : null,
      baixas,
      pctBaixas: notes.length ? Math.round((baixas * 100) / notes.length) : null,
    };
  });
  tecnicos.sort((a, b) => (b.media ?? -1) - (a.media ?? -1) || b.respondidas - a.respondidas || a.nome.localeCompare(b.nome));

  const nameById = new Map(tecnicos.map((t) => [t.idTecnico, t.nome]));
  const baixas: LowRating[] = rated
    .filter((r) => r.nota < LOW_RATING_BELOW)
    .sort((a, b) => b.respondidaEm.localeCompare(a.respondidaEm))
    .slice(0, 20)
    .map((r) => ({ idOs: r.idOs, idTecnico: r.idTecnico, tecnico: nameById.get(r.idTecnico) ?? `Técnico ${r.idTecnico}`, nota: r.nota, respondidaEm: r.respondidaEm }));

  const byWeek = new Map<string, number[]>();
  for (const row of rated) {
    if (!row.respondidaEm) continue;
    const week = weekStart(row.respondidaEm);
    byWeek.set(week, [...(byWeek.get(week) ?? []), row.nota]);
  }
  const semanas = [...byWeek.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([semana, notes]) => ({ semana, media: round1(mean(notes)), n: notes.length }));

  return {
    totals: {
      enviadas: rows.length,
      respondidas: rated.length,
      aguardando,
      semResposta,
      naoEntendidas,
      taxaResposta: comDesfecho > 0 ? Math.round((rated.length * 100) / comDesfecho) : null,
      media: rated.length ? round1(mean(rated.map((r) => r.nota))) : null,
    },
    tecnicos,
    baixas,
    semanas,
  };
}
