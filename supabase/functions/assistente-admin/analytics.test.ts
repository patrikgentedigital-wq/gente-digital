import { describe, expect, it } from 'vitest';
import {
  buildAliases,
  categoriesByTeam,
  collaborators,
  evolution,
  hideNames,
  percentOf,
  structure,
  revealNames,
  teamsByCycle,
  type Dataset,
} from './analytics';

const dataset: Dataset = {
  teams: [{ id: 't1', name: 'Campo' }, { id: 't2', name: 'Rede' }],
  members: [
    { id: 'm1', name: 'Ana Souza', teamId: 't1', jobTitle: 'Técnico' },
    { id: 'm2', name: 'Bruno Lima', teamId: 't1', jobTitle: 'Técnico' },
    { id: 'm3', name: 'Carla Dias', teamId: 't2', jobTitle: 'Analista' },
  ],
  criteriaSets: [
    { teamId: 't1', version: 1, categories: [{ id: 'c1', name: 'Entrega', items: [{ id: 'q1', text: 'a' }, { id: 'q2', text: 'b' }] }, { id: 'c2', name: 'Equipe', items: [{ id: 'q3', text: 'c' }] }] },
    { teamId: 't2', version: 1, categories: [{ id: 'c9', name: 'Técnica', items: [{ id: 'z1', text: 'z' }] }] },
  ],
  evaluations: [
    { memberId: 'm1', teamId: 't1', cycle: 'Setembro/2026', criteriaVersion: 1, scores: { q1: 5, q2: 5, q3: 5 }, score: 15, maxScore: 15, createdAt: '2026-09-30T10:00:00Z' },
    { memberId: 'm1', teamId: 't1', cycle: 'Outubro/2026', criteriaVersion: 1, scores: { q1: 3, q2: 3, q3: 3 }, score: 9, maxScore: 15, createdAt: '2026-10-30T10:00:00Z' },
    { memberId: 'm2', teamId: 't1', cycle: 'Outubro/2026', criteriaVersion: 1, scores: { q1: 5, q2: 4, q3: 1 }, score: 10, maxScore: 15, createdAt: '2026-10-30T11:00:00Z' },
    { memberId: 'm3', teamId: 't2', cycle: 'Outubro/2026', criteriaVersion: 1, scores: { z1: 4 }, score: 4, maxScore: 5, createdAt: '2026-10-30T12:00:00Z' },
  ],
};

describe('percentOf', () => {
  it('arredonda e evita divisão por zero', () => {
    expect(percentOf(9, 15)).toBe(60);
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(5, 0)).toBe(0);
  });
});

describe('buildAliases', () => {
  it('troca nomes por códigos e reverte', () => {
    const aliases = buildAliases(dataset.members);
    expect(aliases.codeByMemberId.m1).toBe('P1');
    expect(aliases.nameByCode.P2).toBe('Bruno Lima');
    expect(aliases.memberIdByCode.P3).toBe('m3');
  });
});

describe('revealNames', () => {
  it('troca códigos por nomes sem confundir P1 com P10', () => {
    const names = { P1: 'Ana', P10: 'Joana' };
    expect(revealNames('P1 e P10 subiram. (P1)', names)).toBe('Ana e Joana subiram. (Ana)');
    expect(revealNames('Mantém P99', names)).toBe('Mantém P99');
  });
});

describe('hideNames', () => {
  it('troca nomes completos por códigos, ignorando maiúsculas e preferindo o nome mais longo', () => {
    const members = [
      ...dataset.members,
      { id: 'm4', name: 'Ana', teamId: 't1', jobTitle: 'x' },
    ];
    const aliases = buildAliases(members);
    expect(hideNames('Como foi ana souza? E a Ana?', members, aliases)).toBe('Como foi P1? E a P4?');
    expect(hideNames('Sem nomes aqui', members, aliases)).toBe('Sem nomes aqui');
  });
});

describe('structure', () => {
  it('lista equipes com pessoas e cargos, mesmo sem nenhuma avaliação', () => {
    const empty = { ...dataset, evaluations: [] };
    expect(structure(empty)).toEqual([
      { team: 'Campo', members: 2, jobTitles: { Técnico: 2 } },
      { team: 'Rede', members: 1, jobTitles: { Analista: 1 } },
    ]);
  });
});

describe('teamsByCycle', () => {
  it('calcula média, avaliados e total por equipe e ciclo, em ordem cronológica', () => {
    const rows = teamsByCycle(dataset);
    expect(rows).toEqual([
      { team: 'Campo', cycle: 'Setembro/2026', evaluated: 1, members: 2, avgPercent: 100 },
      { team: 'Campo', cycle: 'Outubro/2026', evaluated: 2, members: 2, avgPercent: 63 },
      { team: 'Rede', cycle: 'Outubro/2026', evaluated: 1, members: 1, avgPercent: 80 },
    ]);
  });
});

describe('categoriesByTeam', () => {
  it('calcula o percentual médio por categoria usando as perguntas da versão avaliada', () => {
    const rows = categoriesByTeam(dataset, { teamName: 'Campo', cycle: 'Outubro/2026' });
    expect(rows).toEqual([
      { team: 'Campo', cycle: 'Outubro/2026', category: 'Entrega', avgPercent: 75 },
      { team: 'Campo', cycle: 'Outubro/2026', category: 'Equipe', avgPercent: 40 },
    ]);
  });
});

describe('collaborators', () => {
  it('lista por código, sem nome, e filtra por equipe e ciclo', () => {
    const aliases = buildAliases(dataset.members);
    const rows = collaborators(dataset, aliases, { teamName: 'Campo', cycle: 'Outubro/2026' });
    expect(rows).toEqual([
      { code: 'P1', team: 'Campo', jobTitle: 'Técnico', cycle: 'Outubro/2026', percent: 60 },
      { code: 'P2', team: 'Campo', jobTitle: 'Técnico', cycle: 'Outubro/2026', percent: 67 },
    ]);
    expect(JSON.stringify(rows)).not.toContain('Ana');
  });
});

describe('evolution', () => {
  it('mostra o percentual de uma pessoa ciclo a ciclo', () => {
    const aliases = buildAliases(dataset.members);
    expect(evolution(dataset, aliases, 'P1')).toEqual([
      { cycle: 'Setembro/2026', percent: 100 },
      { cycle: 'Outubro/2026', percent: 60 },
    ]);
    expect(evolution(dataset, aliases, 'P99')).toEqual([]);
  });
});
