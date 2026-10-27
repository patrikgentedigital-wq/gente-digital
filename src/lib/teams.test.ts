import { describe, expect, it } from 'vitest';
import { deriveTeams } from './teams';
import type { TeamStructure } from '../types';

const known: TeamStructure[] = [
  { leader: 'Brenda', color: '#7A4FCB', members: [] },
  { leader: 'Alexandre', color: '#D9A02B', members: [] },
  { leader: 'Diego', color: '#8A2030', members: [] },
];

const m = (team: string, teamColor = '#111111', deleted = false) => ({ team, teamColor, deleted });

describe('deriveTeams', () => {
  it('inclui equipes novas que só existem nos membros, com a cor cadastrada', () => {
    const teams = deriveTeams([m('Brenda'), m('Mariza Leite', '#E11D48'), m('Mariza Leite', '#000000')], known);
    expect(teams.map((t) => t.leader)).toEqual(['Brenda', 'Mariza Leite']);
    expect(teams[1].color).toBe('#E11D48');
  });

  it('mantém a ordem e a cor das equipes conhecidas e põe as novas depois, em ordem alfabética', () => {
    const teams = deriveTeams([m('Zeca'), m('Alexandre'), m('Danielle'), m('Brenda', '#ffffff')], known);
    expect(teams.map((t) => t.leader)).toEqual(['Brenda', 'Alexandre', 'Danielle', 'Zeca']);
    expect(teams[0].color).toBe('#7A4FCB');
  });

  it('oculta equipes sem membros, a menos que includeEmpty seja true', () => {
    expect(deriveTeams([m('Brenda')], known).map((t) => t.leader)).toEqual(['Brenda']);
    expect(deriveTeams([m('Brenda')], known, { includeEmpty: true }).map((t) => t.leader)).toEqual(['Brenda', 'Alexandre', 'Diego']);
  });

  it('ignora membros arquivados e usa cor neutra quando a cor cadastrada é inválida', () => {
    const teams = deriveTeams([m('Fantasma', '#123456', true), m('João Lucas', 'azul')], known);
    expect(teams.map((t) => t.leader)).toEqual(['João Lucas']);
    expect(teams[0].color).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});
