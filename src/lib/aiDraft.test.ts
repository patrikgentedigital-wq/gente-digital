import { describe, expect, it } from 'vitest';
import { buildDraftRequest, parseDraftResponse, goalsToPdi } from './aiDraft';

const categories = [
  { id: 'c1', name: 'Entrega', items: [{ id: 'q1', text: 'Cumpre prazos' }, { id: 'q2', text: 'Qualidade do trabalho' }] },
  { id: 'c2', name: 'Equipe', items: [{ id: 'q3', text: 'Colabora com os colegas' }] },
];

describe('buildDraftRequest', () => {
  it('envia só cargo, categorias, perguntas e notas, sem nome nem ids', () => {
    const request = buildDraftRequest({ jobTitle: 'Técnico de Campo', categories, scores: { q1: 5, q2: 3, q3: 4 } });
    expect(request).toEqual({
      jobTitle: 'Técnico de Campo',
      categories: [
        { name: 'Entrega', items: [{ text: 'Cumpre prazos', score: 5 }, { text: 'Qualidade do trabalho', score: 3 }] },
        { name: 'Equipe', items: [{ text: 'Colabora com os colegas', score: 4 }] },
      ],
    });
    expect(JSON.stringify(request)).not.toContain('q1');
  });

  it('recusa quando falta nota em alguma pergunta', () => {
    expect(() => buildDraftRequest({ jobTitle: 'X', categories, scores: { q1: 5 } })).toThrow(/notas/i);
  });
});

describe('parseDraftResponse', () => {
  it('aceita comentário e metas válidas, limpando espaços', () => {
    const parsed = parseDraftResponse({
      comment: '  Bom ciclo.  ',
      goals: [{ title: ' Reduzir retrabalho ', deadline: '30 dias' }, { title: 'Fazer curso' }],
    });
    expect(parsed.comment).toBe('Bom ciclo.');
    expect(parsed.goals).toEqual([
      { title: 'Reduzir retrabalho', deadline: '30 dias' },
      { title: 'Fazer curso', deadline: 'Próximo Ciclo' },
    ]);
  });

  it('descarta metas inválidas e limita a 5', () => {
    const goals = Array.from({ length: 8 }, (_, i) => ({ title: `Meta ${i}`, deadline: '30 dias' }));
    const parsed = parseDraftResponse({ comment: 'ok', goals: [{ title: '' }, 42, ...goals] });
    expect(parsed.goals).toHaveLength(5);
    expect(parsed.goals[0]?.title).toBe('Meta 0');
  });

  it('corta textos acima do limite do sistema', () => {
    const parsed = parseDraftResponse({ comment: 'a'.repeat(6000), goals: [{ title: 'b'.repeat(300), deadline: 'c'.repeat(150) }] });
    expect(parsed.comment).toHaveLength(5000);
    expect(parsed.goals[0]?.title).toHaveLength(200);
    expect(parsed.goals[0]?.deadline).toHaveLength(100);
  });

  it('falha com resposta sem comentário', () => {
    expect(() => parseDraftResponse({ goals: [] })).toThrow();
    expect(() => parseDraftResponse(null)).toThrow();
    expect(() => parseDraftResponse({ comment: '   ' })).toThrow();
  });
});

describe('goalsToPdi', () => {
  it('cria metas pendentes com ids novos', () => {
    const goals = goalsToPdi([{ title: 'Meta A', deadline: '30 dias' }]);
    expect(goals[0]).toMatchObject({ title: 'Meta A', deadline: '30 dias', status: 'pending' });
    expect(goals[0]?.id).toMatch(/^pdi_/);
  });
});
