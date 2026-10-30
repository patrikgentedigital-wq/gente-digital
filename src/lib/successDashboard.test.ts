import { describe, expect, it } from 'vitest';
import { parseRatingRows, summarize, LOW_RATING_BELOW, type RatingRow } from './successDashboard';

const row = (over: Partial<RatingRow>): RatingRow => ({
  idOs: '1',
  idTecnico: '96',
  nomeTecnico: 'José',
  dataOs: '2026-10-20 10:00:00',
  enviadaEm: '2026-10-21T12:00:00.000Z',
  respondidaEm: '',
  nota: 0,
  status: 'aguardando',
  ...over,
});

describe('parseRatingRows', () => {
  it('converte as linhas do servidor e descarta as malformadas', () => {
    const rows = parseRatingRows({
      geradoEm: '2026-10-30T00:00:00Z',
      linhas: [
        { id_os: '10', id_tecnico: '96', nome_tecnico: 'José', data_os: '2026-10-20', enviada_em: '2026-10-21T12:00:00Z', respondida_em: '', nota: 5, status: 'respondida' },
        { id_os: '', id_tecnico: '96', status: 'respondida' },
        'lixo',
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ idOs: '10', idTecnico: '96', nomeTecnico: 'José', nota: 5, status: 'respondida' });
  });

  it('falha quando a resposta não tem a lista de linhas', () => {
    expect(() => parseRatingRows(null)).toThrow();
    expect(() => parseRatingRows({ linhas: 'x' })).toThrow();
  });
});

describe('summarize', () => {
  it('com tabela vazia devolve zeros e listas vazias, sem dividir por zero', () => {
    const s = summarize([]);
    expect(s.totals).toEqual({ enviadas: 0, respondidas: 0, aguardando: 0, semResposta: 0, naoEntendidas: 0, taxaResposta: null, media: null });
    expect(s.tecnicos).toEqual([]);
    expect(s.baixas).toEqual([]);
    expect(s.semanas).toEqual([]);
  });

  it('conta situações, taxa de resposta (sem contar os ainda aguardando) e média', () => {
    const s = summarize([
      row({ idOs: '1', status: 'respondida', nota: 5, respondidaEm: '2026-10-22T10:00:00.000Z' }),
      row({ idOs: '2', status: 'respondida', nota: 3, respondidaEm: '2026-10-23T10:00:00.000Z' }),
      row({ idOs: '3', status: 'sem_resposta' }),
      row({ idOs: '4', status: 'resposta_nao_entendida' }),
      row({ idOs: '5', status: 'aguardando' }),
    ]);
    expect(s.totals).toEqual({ enviadas: 5, respondidas: 2, aguardando: 1, semResposta: 1, naoEntendidas: 1, taxaResposta: 50, media: 4 });
  });

  it('agrupa por técnico, ordena pela média e marca notas baixas', () => {
    const s = summarize([
      row({ idOs: '1', idTecnico: '96', nomeTecnico: 'José', status: 'respondida', nota: 5, respondidaEm: '2026-10-22T10:00:00.000Z' }),
      row({ idOs: '2', idTecnico: '96', nomeTecnico: 'José', status: 'respondida', nota: 2, respondidaEm: '2026-10-23T10:00:00.000Z' }),
      row({ idOs: '3', idTecnico: '73', nomeTecnico: 'Jefferson', status: 'respondida', nota: 5, respondidaEm: '2026-10-24T10:00:00.000Z' }),
      row({ idOs: '4', idTecnico: '88', nomeTecnico: '', status: 'sem_resposta' }),
    ]);
    expect(s.tecnicos.map((t) => t.idTecnico)).toEqual(['73', '96', '88']);
    expect(s.tecnicos[1]).toMatchObject({ nome: 'José', enviadas: 2, respondidas: 2, media: 3.5, baixas: 1, pctBaixas: 50 });
    expect(s.tecnicos[2]).toMatchObject({ nome: 'Técnico 88', respondidas: 0, media: null, pctBaixas: null });
    expect(LOW_RATING_BELOW).toBe(4);
  });

  it('lista as notas baixas da mais recente para a mais antiga', () => {
    const s = summarize([
      row({ idOs: '1', status: 'respondida', nota: 3, respondidaEm: '2026-10-22T10:00:00.000Z' }),
      row({ idOs: '2', status: 'respondida', nota: 1, respondidaEm: '2026-10-25T10:00:00.000Z' }),
      row({ idOs: '3', status: 'respondida', nota: 5, respondidaEm: '2026-10-26T10:00:00.000Z' }),
    ]);
    expect(s.baixas.map((b) => b.idOs)).toEqual(['2', '1']);
  });

  it('calcula a média por semana (começando na segunda-feira)', () => {
    const s = summarize([
      row({ idOs: '1', status: 'respondida', nota: 5, respondidaEm: '2026-10-20T10:00:00.000Z' }),
      row({ idOs: '2', status: 'respondida', nota: 3, respondidaEm: '2026-10-22T10:00:00.000Z' }),
      row({ idOs: '3', status: 'respondida', nota: 2, respondidaEm: '2026-10-28T10:00:00.000Z' }),
    ]);
    expect(s.semanas).toEqual([
      { semana: '2026-10-19', media: 4, n: 2 },
      { semana: '2026-10-26', media: 2, n: 1 },
    ]);
  });
});
