import { describe, expect, it } from 'vitest';
import {
  criteriaFingerprint,
  MAX_CATEGORIES,
  MAX_ITEMS_PER_CATEGORY,
  maxScoreFor,
  validateCriteriaCategories,
  type CriteriaCategory,
} from './criteria';

const category = (id: string, itemCount: number): CriteriaCategory => ({
  id,
  name: `Categoria ${id}`,
  items: Array.from({ length: itemCount }, (_, index) => ({ id: `${id}-${index}`, text: `Pergunta ${id}-${index}` })),
});

describe('maxScoreFor', () => {
  it('é o número de perguntas vezes 5', () => {
    expect(maxScoreFor([category('1', 3), category('2', 3)])).toBe(30);
    expect(maxScoreFor([])).toBe(0);
  });
});

describe('validateCriteriaCategories', () => {
  it('aceita um conjunto válido', () => {
    expect(validateCriteriaCategories([category('1', 3), category('2', 2)])).toEqual([]);
  });

  it('exige ao menos uma pergunta', () => {
    expect(validateCriteriaCategories([])).toContain('Inclua ao menos uma pergunta.');
    expect(validateCriteriaCategories([category('1', 0)])).toContain('Inclua ao menos uma pergunta.');
  });

  it('limita categorias, itens por categoria e tamanho do texto', () => {
    const tooManyCategories = Array.from({ length: MAX_CATEGORIES + 1 }, (_, index) => category(String(index + 1), 1));
    expect(validateCriteriaCategories(tooManyCategories)).toContain(`Use no máximo ${MAX_CATEGORIES} categorias.`);

    expect(validateCriteriaCategories([category('1', MAX_ITEMS_PER_CATEGORY + 1)])).toContain(
      `A categoria "Categoria 1" passa de ${MAX_ITEMS_PER_CATEGORY} perguntas.`,
    );

    const emptyText = category('1', 1);
    emptyText.items[0].text = '   ';
    expect(validateCriteriaCategories([emptyText])).toContain('Toda pergunta precisa de texto.');

    const longText = category('1', 1);
    longText.items[0].text = 'x'.repeat(201);
    expect(validateCriteriaCategories([longText])).toContain('Cada pergunta pode ter no máximo 200 caracteres.');
  });

  it('exige nome de categoria e ids únicos', () => {
    const unnamed = category('1', 1);
    unnamed.name = '';
    expect(validateCriteriaCategories([unnamed])).toContain('Toda categoria precisa de nome.');

    const duplicated = [category('1', 1), { ...category('2', 1), items: [{ id: '1-0', text: 'Repetida' }] }];
    expect(validateCriteriaCategories(duplicated)).toContain('Os ids das perguntas precisam ser únicos.');
  });
});

describe('criteriaFingerprint', () => {
  const base = [{ id: '1', name: 'A', items: [{ id: '1-0', text: 'Pergunta um' }, { id: '1-1', text: 'Pergunta dois' }] }];

  it('é vazio sem perguntas e estável para as mesmas perguntas', () => {
    expect(criteriaFingerprint([])).toBe('');
    expect(criteriaFingerprint(base)).toBe(criteriaFingerprint(JSON.parse(JSON.stringify(base))));
    expect(criteriaFingerprint(base)).not.toBe('');
  });

  it('muda quando o texto, o id ou a quantidade de perguntas muda', () => {
    const texto = [{ ...base[0], items: [{ id: '1-0', text: 'Outra pergunta' }, base[0].items[1]] }];
    const id = [{ ...base[0], items: [{ id: '9-9', text: 'Pergunta um' }, base[0].items[1]] }];
    const menos = [{ ...base[0], items: [base[0].items[0]] }];
    const original = criteriaFingerprint(base);
    expect(criteriaFingerprint(texto)).not.toBe(original);
    expect(criteriaFingerprint(id)).not.toBe(original);
    expect(criteriaFingerprint(menos)).not.toBe(original);
  });
});
