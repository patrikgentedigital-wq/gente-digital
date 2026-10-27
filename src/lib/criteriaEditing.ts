import type { CriteriaCategory } from './criteria';

/** Identificador novo e curto, no formato aceito pelo servidor (letras, números, _ e -). */
export function newId(prefix: string): string {
  return `${prefix}${Math.random().toString(36).slice(2, 10)}`;
}

/** Todas as funções devolvem uma lista nova; a lista recebida nunca muda. */
export function addCategory(categories: CriteriaCategory[], name: string): CriteriaCategory[] {
  return [...categories, { id: newId('c'), name, items: [] }];
}

export function renameCategory(categories: CriteriaCategory[], index: number, name: string): CriteriaCategory[] {
  return categories.map((category, i) => (i === index ? { ...category, name } : category));
}

export function removeCategory(categories: CriteriaCategory[], index: number): CriteriaCategory[] {
  return categories.filter((_, i) => i !== index);
}

/** Troca a categoria de lugar com a vizinha; fora dos limites, devolve a lista igual. */
export function moveCategory(categories: CriteriaCategory[], index: number, direction: -1 | 1): CriteriaCategory[] {
  return swap(categories, index, index + direction);
}

export function addItem(categories: CriteriaCategory[], categoryIndex: number, text: string): CriteriaCategory[] {
  return categories.map((category, i) =>
    i === categoryIndex ? { ...category, items: [...category.items, { id: newId('q'), text }] } : category,
  );
}

export function updateItemText(
  categories: CriteriaCategory[],
  categoryIndex: number,
  itemIndex: number,
  text: string,
): CriteriaCategory[] {
  return mapItems(categories, categoryIndex, (items) =>
    items.map((item, i) => (i === itemIndex ? { ...item, text } : item)),
  );
}

export function removeItem(categories: CriteriaCategory[], categoryIndex: number, itemIndex: number): CriteriaCategory[] {
  return mapItems(categories, categoryIndex, (items) => items.filter((_, i) => i !== itemIndex));
}

export function moveItem(
  categories: CriteriaCategory[],
  categoryIndex: number,
  itemIndex: number,
  direction: -1 | 1,
): CriteriaCategory[] {
  return mapItems(categories, categoryIndex, (items) => swap(items, itemIndex, itemIndex + direction));
}

function mapItems<T extends { items: CriteriaCategory['items'] }>(
  categories: T[],
  categoryIndex: number,
  change: (items: CriteriaCategory['items']) => CriteriaCategory['items'],
): T[] {
  return categories.map((category, i) => (i === categoryIndex ? { ...category, items: change(category.items) } : category));
}

function swap<T>(list: T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}
