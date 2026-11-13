import { describe, expect, it } from 'vitest';
import type { TeamMember } from '../types';
import { hasEvaluationInCycle, nextPendingMember, pendingByTeam } from './pending';

const member = (id: string, team: string, months: string[] = [], name = id): TeamMember =>
  ({ id, name, team, history: months.map((month) => ({ month, score: 10, max: 150 })) }) as TeamMember;

const CYCLE = 'Novembro/2026';

describe('hasEvaluationInCycle', () => {
  it('é verdadeiro quando o histórico tem o ciclo', () => {
    expect(hasEvaluationInCycle(member('a', 't', ['Outubro/2026', CYCLE]), CYCLE)).toBe(true);
  });

  it('é falso sem o ciclo ou sem histórico, e não confunde outro ano', () => {
    expect(hasEvaluationInCycle(member('a', 't', ['Outubro/2026']), CYCLE)).toBe(false);
    expect(hasEvaluationInCycle(member('a', 't', ['Novembro/2025']), CYCLE)).toBe(false);
    expect(hasEvaluationInCycle(member('a', 't'), CYCLE)).toBe(false);
    expect(hasEvaluationInCycle({ id: 'x' } as TeamMember, CYCLE)).toBe(false);
  });
});

describe('pendingByTeam', () => {
  const members = [
    member('ana', 'Brenda', [CYCLE], 'Ana'),
    member('bia', 'Brenda', [], 'Bia'),
    member('caio', 'Brenda', ['Outubro/2026'], 'Caio'),
    member('davi', 'Diego', [], 'Davi'),
    member('eva', 'Danielle', [CYCLE], 'Eva'),
  ];

  it('conta quem falta no ciclo, mesmo quem foi avaliado em outro mês', () => {
    const result = pendingByTeam(members, CYCLE);
    expect(result.total).toBe(5);
    expect(result.pending).toBe(3);
  });

  it('lista por equipe só as que têm gente pendente, com os nomes em ordem alfabética', () => {
    const result = pendingByTeam(members, CYCLE);
    expect(result.teams.map((team) => team.team)).toEqual(['Brenda', 'Diego']);
    expect(result.teams[0]).toMatchObject({ team: 'Brenda', total: 3, pending: 2 });
    expect(result.teams[0].members.map((m) => m.name)).toEqual(['Bia', 'Caio']);
  });

  it('ordena as equipes por quem mais falta, e depois por nome', () => {
    const many = [member('a', 'Zeca', [], 'A'), member('b', 'Zeca', [], 'B'), member('c', 'Alfa', [], 'C'), member('d', 'Beta', [], 'D')];
    expect(pendingByTeam(many, CYCLE).teams.map((team) => team.team)).toEqual(['Zeca', 'Alfa', 'Beta']);
  });

  it('sem ninguém pendente, não lista equipes', () => {
    const done = [member('a', 'Brenda', [CYCLE])];
    expect(pendingByTeam(done, CYCLE)).toEqual({ total: 1, pending: 0, teams: [] });
  });

  it('lista vazia', () => {
    expect(pendingByTeam([], CYCLE)).toEqual({ total: 0, pending: 0, teams: [] });
  });
});

describe('nextPendingMember', () => {
  const list = [member('a', 't', [CYCLE]), member('b', 't', []), member('c', 't', [CYCLE]), member('d', 't', [])];

  it('vai para o próximo pendente depois do atual', () => {
    expect(nextPendingMember(list, list[0], CYCLE)?.id).toBe('b');
    expect(nextPendingMember(list, list[1], CYCLE)?.id).toBe('d');
  });

  it('dá a volta ao chegar no fim da lista', () => {
    expect(nextPendingMember(list, list[3], CYCLE)?.id).toBe('b');
  });

  it('não devolve a própria pessoa quando é a única pendente', () => {
    expect(nextPendingMember([member('a', 't', []), member('b', 't', [CYCLE])], member('a', 't', []), CYCLE)).toBeNull();
  });

  it('sem pendentes, devolve nulo', () => {
    expect(nextPendingMember([member('a', 't', [CYCLE])], member('a', 't', [CYCLE]), CYCLE)).toBeNull();
  });

  it('com a pessoa atual fora da lista, começa do primeiro pendente', () => {
    expect(nextPendingMember(list, member('zzz', 't', []), CYCLE)?.id).toBe('b');
  });
});
