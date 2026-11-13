import { describe, expect, it } from 'vitest';
import type { CriteriaCategory } from './criteria';
import { buildRadarData, radarAxisLabel, radarTooltipLabel } from './radar';

const category = (id: string, name: string, itemCount = 2): CriteriaCategory => ({
  id,
  name,
  items: Array.from({ length: itemCount }, (_, i) => ({ id: `${id}-${i}`, text: `Pergunta ${id}.${i + 1}` })),
});

describe('radarAxisLabel', () => {
  it('corta antes da primeira vírgula, sem deixar a vírgula no rótulo', () => {
    expect(radarAxisLabel('Disciplina, comprometimento, autonomia e visão estratégica')).toBe('Disciplina');
  });

  it('corta antes do " e " e mantém a palavra que diferencia a categoria', () => {
    expect(radarAxisLabel('Gestão operacional e acompanhamento dos setores')).toBe('Gestão operacional');
    expect(radarAxisLabel('Gestão financeira, indicadores e controle de resultados')).toBe('Gestão financeira');
  });

  it('não termina em preposição solta', () => {
    expect(radarAxisLabel('Gestão de processos, custos e produtividade')).toBe('Gestão de processos');
    expect(radarAxisLabel('Prevenção de perdas e melhoria dos processos')).toBe('Prevenção de perdas');
  });

  it('mantém nomes curtos como estão', () => {
    expect(radarAxisLabel('Competência 6')).toBe('Competência 6');
  });
});

describe('radarTooltipLabel', () => {
  it('mostra o nome completo da ponta na dica', () => {
    const payload = [{ payload: { label: 'P5', fullName: 'Mantém histórico organizado', value: 20 } }];
    expect(radarTooltipLabel('P5', payload)).toBe('Mantém histórico organizado');
  });

  it('usa o rótulo curto quando não há nome completo', () => {
    expect(radarTooltipLabel('Metas', [])).toBe('Metas');
  });
});

describe('buildRadarData', () => {
  const danielle = [
    category('1', 'Gestão operacional e acompanhamento dos setores'),
    category('2', 'Gestão financeira, indicadores e controle de resultados'),
    category('3', 'Planejamento, prazos e entrega de demandas'),
    category('4', 'Comunicação, alinhamento e prestação de contas à CEO'),
    category('5', 'Liderança, cobrança de resultados e desenvolvimento da equipe'),
    category('6', 'Disciplina, comprometimento, autonomia e visão estratégica'),
  ];

  it('gera uma ponta por categoria, sem juntar categorias que começam com a mesma palavra', () => {
    const data = buildRadarData(danielle, {});
    expect(data).toHaveLength(6);
    expect(new Set(data.map((point) => point.label)).size).toBe(6);
  });

  it('calcula o percentual de cada categoria', () => {
    const data = buildRadarData(danielle, { '1-0': 5, '1-1': 3 });
    expect(data[0]).toEqual({ label: 'Gestão operacional', fullName: danielle[0].name, value: 80 });
  });

  it('deixa os rótulos únicos mesmo quando o nome curto se repete', () => {
    const data = buildRadarData(
      [category('1', 'Comunicação, escuta'), category('2', 'Comunicação, clientes'), category('3', 'Metas')],
      {},
    );
    expect(new Set(data.map((point) => point.label)).size).toBe(3);
  });

  const fernanda: CriteriaCategory[] = [
    {
      id: '1',
      name: 'Competência 6',
      items: [
        { id: '1-0', text: 'Cumpre prazos, compromissos e responsabilidades do RH com organização e autonomia.' },
        { id: '1-1', text: 'Registra e documenta adequadamente ocorrências, feedbacks e orientações.' },
        { id: '1-2', text: 'Realiza ou acompanha feedbacks individuais, garantindo que o colaborador compreenda.' },
        { id: '1-3', text: 'Programa e acompanha uma segunda conversa para verificar a evolução.' },
        { id: '1-4', text: 'Mantém histórico organizado dos acompanhamentos, incluindo datas.' },
        { id: '1-5', text: 'Comunica aos gestores e à Diretoria situações recorrentes.' },
      ],
    },
  ];

  it('com menos de 3 categorias, usa uma ponta por pergunta com o começo da pergunta como nome', () => {
    const data = buildRadarData(fernanda, { '1-0': 3, '1-1': 3, '1-2': 3, '1-3': 3, '1-4': 1, '1-5': 4 });
    expect(data.map((point) => point.label)).toEqual([
      'Cumpre prazos',
      'Registra e documenta',
      'Realiza ou acompanha',
      'Programa e acompanha',
      'Mantém histórico organizado',
      'Comunica aos gestores',
    ]);
    expect(data[4]).toEqual({ label: 'Mantém histórico organizado', fullName: fernanda[0].items[4].text, value: 20 });
  });

  it('no radar por pergunta, nomes repetidos ganham o número da pergunta', () => {
    const repeated: CriteriaCategory[] = [
      { id: '1', name: 'Único', items: [{ id: '1-0', text: 'Cumpre prazos, a.' }, { id: '1-1', text: 'Cumpre prazos, b.' }] },
    ];
    const labels = buildRadarData(repeated, {}).map((point) => point.label);
    expect(new Set(labels).size).toBe(2);
  });

  it('com skipIncomplete, deixa de fora a categoria sem todas as notas', () => {
    const data = buildRadarData(danielle, { '1-0': 5, '1-1': 5, '2-0': 4 }, { skipIncomplete: true });
    expect(data.map((point) => point.label)).toEqual(['Gestão operacional']);
  });

  it('com skipIncomplete, deixa de fora a pergunta sem nota no radar por pergunta', () => {
    const data = buildRadarData([category('1', 'Competência 6', 3)], { '1-0': 5, '1-2': 0 }, { skipIncomplete: true });
    expect(data.map((point) => point.fullName)).toEqual(['Pergunta 1.1', 'Pergunta 1.3']);
  });
});
