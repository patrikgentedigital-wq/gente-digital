import { describe, expect, it } from 'vitest';
import type { TeamMember } from '../types';
import { buildOrgChart } from './orgChart';

function m(id: string, name: string, team: string, over: Partial<TeamMember> = {}): TeamMember {
  return {
    id, name, role: 'Cargo', team, teamColor: '#000000', rank: 0, score: 0, maxScore: 150, status: 'Alarme',
    avatarUrl: '', evaluationStatus: 'Pendente', email: '', ...over,
  };
}

describe('buildOrgChart', () => {
  it('monta a árvore pelo time de cada pessoa: o time leva o nome do líder', () => {
    const roots = buildOrgChart([
      m('1', 'Mariza Leite', 'Diretoria'),
      m('2', 'Danielle', 'Mariza Leite'),
      m('3', 'Fernanda', 'Danielle'),
      m('4', 'Djemerson', 'Danielle'),
      m('5', 'Patrik', 'Djemerson'),
    ]);
    expect(roots).toHaveLength(1);
    expect(roots[0].label).toBe('Diretoria');
    expect(roots[0].children[0].member?.name).toBe('Mariza Leite');
    const danielle = roots[0].children[0].children[0];
    expect(danielle.member?.name).toBe('Danielle');
    expect(danielle.children.map((c) => c.member?.name)).toEqual(['Djemerson', 'Fernanda']);
    expect(danielle.children[0].children[0].member?.name).toBe('Patrik');
  });

  it('liga o time ao líder pelo primeiro nome quando só há um com ele', () => {
    const roots = buildOrgChart([m('1', 'Diego Costa', 'Mariza Leite'), m('2', 'Cris', 'Diego'), m('3', 'Mariza Leite', 'Mariza Leite')]);
    const mariza = roots.find((n) => n.member?.name === 'Mariza Leite');
    expect(mariza?.children.map((c) => c.member?.name)).toEqual(['Diego Costa']);
    const diego = mariza?.children[0];
    expect(diego?.children.map((c) => c.member?.name)).toEqual(['Cris']);
  });

  it('time cujo líder não é um colaborador vira um nó só com o nome do time', () => {
    const roots = buildOrgChart([m('1', 'Ana', 'Dri Trindade')]);
    expect(roots).toHaveLength(1);
    expect(roots[0].member).toBeNull();
    expect(roots[0].label).toBe('Dri Trindade');
    expect(roots[0].children[0].member?.name).toBe('Ana');
  });

  it('não entra em laço quando dois times apontam um para o outro', () => {
    const roots = buildOrgChart([m('1', 'Ana', 'Bia'), m('2', 'Bia', 'Ana')]);
    const names: string[] = [];
    const walk = (nodes: typeof roots) => nodes.forEach((n) => { if (n.member) names.push(n.member.name); walk(n.children); });
    walk(roots);
    expect(names.sort()).toEqual(['Ana', 'Bia']);
  });

  it('ignora arquivados', () => {
    const roots = buildOrgChart([m('1', 'Ana', 'Equipe', { deleted: true }), m('2', 'Bia', 'Equipe')]);
    expect(roots[0].children).toHaveLength(1);
  });
});
