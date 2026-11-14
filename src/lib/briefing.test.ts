import { describe, expect, it } from 'vitest';
import type { TeamMember } from '../types';
import { buildBriefingFacts, formatBriefing, parseBriefingResponse, revealNames, toAiPayload } from './briefing';

function m(id: string, name: string, history: TeamMember['history'], over: Partial<TeamMember> = {}): TeamMember {
  return {
    id, name, role: 'Técnico', team: 'Danielle', teamColor: '#000000', rank: 0, score: 0, maxScore: 100,
    status: 'Alarme', avatarUrl: '', evaluationStatus: 'Concluído', email: '', history, ...over,
  };
}

const NOW = new Date('2026-11-14T12:00:00');
const members = [
  m('1', 'Ana', [{ month: 'Outubro/2026', score: 70, max: 100 }, { month: 'Novembro/2026', score: 92, max: 100 }]),
  m('2', 'Bia', [{ month: 'Outubro/2026', score: 95, max: 100 }, { month: 'Novembro/2026', score: 80, max: 100 }]),
  m('3', 'Caio', [{ month: 'Outubro/2026', score: 60, max: 100 }]),
  m('4', 'Dani', [{ month: 'Novembro/2026', score: 50, max: 100 }]),
  m('5', 'Eva', [{ month: 'Novembro/2026', score: 99, max: 100 }], { team: 'Outra' }),
];

describe('buildBriefingFacts', () => {
  const facts = buildBriefingFacts(members, 'Danielle', 'Novembro/2026', NOW);

  it('usa só a equipe pedida e acha o ciclo anterior', () => {
    expect(facts.people.map((p) => p.name)).toEqual(['Ana', 'Bia', 'Caio', 'Dani']);
    expect(facts.previousCycle).toBe('Outubro/2026');
  });

  it('calcula nota, variação e mudança de faixa de cada pessoa', () => {
    const ana = facts.people.find((p) => p.name === 'Ana')!;
    expect(ana.percent).toBe(92);
    expect(ana.delta).toBe(22);
    expect(ana.status).toBe('Voando');
    expect(ana.previousStatus).toBe('Alarme');
    expect(ana.statusChange).toBe('subiu');
    expect(facts.people.find((p) => p.name === 'Bia')!.statusChange).toBe('caiu');
  });

  it('separa quem ficou sem avaliação no ciclo e quem é novo (sem ciclo anterior)', () => {
    const caio = facts.people.find((p) => p.name === 'Caio')!;
    expect(caio.evaluated).toBe(false);
    expect(caio.percent).toBeNull();
    const dani = facts.people.find((p) => p.name === 'Dani')!;
    expect(dani.delta).toBeNull();
    expect(dani.statusChange).toBeNull();
  });

  it('resume a equipe só com os avaliados', () => {
    expect(facts.summary.total).toBe(4);
    expect(facts.summary.evaluated).toBe(3);
    expect(facts.summary.pending).toBe(1);
    expect(facts.summary.average).toBe(74); // (92 + 80 + 50) / 3
    expect(facts.summary.previousAverage).toBe(75); // (70 + 95 + 60) / 3
    expect(facts.summary.averageDelta).toBe(-1);
  });

  it('aponta a maior subida e a maior queda', () => {
    expect(facts.highlights.biggestRise?.name).toBe('Ana');
    expect(facts.highlights.biggestDrop?.name).toBe('Bia');
  });

  it('conta metas de PDI atrasadas', () => {
    const withGoals = [m('1', 'Ana', [{ month: 'Novembro/2026', score: 90, max: 100 }], {
      pdiGoals: [
        { id: 'g1', title: 'x', deadline: '', status: 'pending', dueDate: '2026-11-01' },
        { id: 'g2', title: 'y', deadline: '', status: 'completed', dueDate: '2026-11-01' },
        { id: 'g3', title: 'z', deadline: '', status: 'pending', dueDate: '2026-12-01' },
      ],
    })];
    expect(buildBriefingFacts(withGoals, 'Danielle', 'Novembro/2026', NOW).people[0].overduePdi).toBe(1);
  });
});

describe('toAiPayload e revealNames', () => {
  const facts = buildBriefingFacts(members, 'Danielle', 'Novembro/2026', NOW);

  it('manda códigos no lugar dos nomes', () => {
    const payload = toAiPayload(facts);
    expect(JSON.stringify(payload)).not.toMatch(/Ana|Bia|Caio|Dani/);
    expect(payload.people[0].code).toBe('P1');
    expect(payload).not.toHaveProperty('team');
  });

  it('devolve os nomes no texto da IA', () => {
    expect(revealNames('P1 subiu e P2 caiu. P10 não existe.', facts.people)).toBe('Ana subiu e Bia caiu. P10 não existe.');
  });
});

describe('parseBriefingResponse', () => {
  it('aceita a resposta válida e limita as listas', () => {
    const parsed = parseBriefingResponse({
      headline: ' Equipe estável ',
      highlights: ['a', 'b', 'c', 'd', 'e', 'f'],
      attention: ['x'],
      talkingPoints: [{ code: 'P1', point: 'Conversar sobre metas' }, { code: null, point: 'Rever o ciclo' }],
      nextSteps: ['s1'],
    });
    expect(parsed.headline).toBe('Equipe estável');
    expect(parsed.highlights).toHaveLength(4);
    expect(parsed.talkingPoints[1].code).toBeNull();
  });

  it('recusa resposta sem manchete', () => {
    expect(() => parseBriefingResponse({ highlights: [] })).toThrow();
    expect(() => parseBriefingResponse(null)).toThrow();
  });
});

describe('formatBriefing', () => {
  const facts = buildBriefingFacts(members, 'Danielle', 'Novembro/2026', NOW);

  it('monta o texto só com os fatos, com os nomes', () => {
    const text = formatBriefing(facts, null);
    expect(text).toContain('Briefing do ciclo Novembro/2026 · equipe Danielle');
    expect(text).toContain('Avaliados: 3 de 4 (1 sem avaliação)');
    expect(text).toContain('Média da equipe: 74% (-1 pp) contra Outubro/2026');
    expect(text).toContain('- Ana: 92% (+22 pp), subiu de Alarme para Voando');
    expect(text).toContain('- Caio: sem avaliação no ciclo');
  });

  it('inclui o texto da IA com os nomes no lugar dos códigos', () => {
    const text = formatBriefing(facts, {
      headline: 'P1 foi o destaque',
      highlights: ['P1 subiu muito'],
      attention: [],
      talkingPoints: [{ code: 'P2', point: 'Entender a queda de P2' }],
      nextSteps: [],
    });
    expect(text).toContain('Ana foi o destaque');
    expect(text).toContain('- Bia: Entender a queda de Bia');
  });
});
