import { describe, expect, it } from 'vitest';
import type { CriteriaCategory } from './criteria';
import {
  addCategory,
  addItem,
  moveCategory,
  moveItem,
  removeCategory,
  removeItem,
  renameCategory,
  updateItemText,
} from './criteriaEditing';

const base: CriteriaCategory[] = [
  { id: 'c1', name: 'Comunicação', items: [{ id: 'a', text: 'Clareza' }, { id: 'b', text: 'Escuta' }] },
  { id: 'c2', name: 'Qualidade', items: [{ id: 'c', text: 'Prazo' }] },
];

describe('edição das perguntas', () => {
  it('adiciona categoria vazia com nome e id novos', () => {
    const next = addCategory(base, 'Campo');
    expect(next).toHaveLength(3);
    expect(next[2]).toMatchObject({ name: 'Campo', items: [] });
    expect(next[2].id).not.toBe('c1');
    expect(base).toHaveLength(2); // não altera o original
  });

  it('renomeia e remove categoria', () => {
    expect(renameCategory(base, 1, 'Entrega')[1].name).toBe('Entrega');
    expect(removeCategory(base, 0).map((c) => c.id)).toEqual(['c2']);
  });

  it('reordena categorias sem sair dos limites', () => {
    expect(moveCategory(base, 0, 1).map((c) => c.id)).toEqual(['c2', 'c1']);
    expect(moveCategory(base, 0, -1)).toEqual(base);
    expect(moveCategory(base, 1, 1)).toEqual(base);
  });

  it('adiciona pergunta com id único dentro da equipe', () => {
    const next = addItem(base, 1, 'Responde no prazo');
    expect(next[1].items).toHaveLength(2);
    const ids = next.flatMap((c) => c.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(next[1].items[1].text).toBe('Responde no prazo');
  });

  it('edita, remove e reordena perguntas', () => {
    expect(updateItemText(base, 0, 1, 'Escuta ativa')[0].items[1].text).toBe('Escuta ativa');
    expect(removeItem(base, 0, 0)[0].items.map((i) => i.id)).toEqual(['b']);
    expect(moveItem(base, 0, 0, 1)[0].items.map((i) => i.id)).toEqual(['b', 'a']);
    expect(moveItem(base, 0, 1, 1)).toEqual(base);
  });

  it('nunca muda o conjunto original de ids ao editar um texto', () => {
    const next = updateItemText(base, 1, 0, 'Novo texto');
    expect(next[1].items[0].id).toBe('c');
  });
});
