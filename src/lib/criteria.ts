export interface CriteriaItem {
  id: string;
  text: string;
}

export interface CriteriaCategory {
  id: string;
  name: string;
  items: CriteriaItem[];
}

export const MAX_CATEGORIES = 10;
export const MAX_ITEMS_PER_CATEGORY = 15;
export const MAX_ITEM_TEXT_LENGTH = 200;
export const MAX_SCORE_PER_ITEM = 5;

/** Pontuação máxima da equipe: número de perguntas vezes 5. */
export function maxScoreFor(categories: readonly CriteriaCategory[]): number {
  return categories.reduce((total, category) => total + category.items.length, 0) * MAX_SCORE_PER_ITEM;
}

/** Mensagens de erro em português; lista vazia significa que o conjunto pode ser salvo. */
export function validateCriteriaCategories(categories: readonly CriteriaCategory[]): string[] {
  const errors = new Set<string>();

  if (maxScoreFor(categories) === 0) errors.add('Inclua ao menos uma pergunta.');
  if (categories.length > MAX_CATEGORIES) errors.add(`Use no máximo ${MAX_CATEGORIES} categorias.`);

  const seenIds = new Set<string>();
  for (const category of categories) {
    if (!category.name.trim()) errors.add('Toda categoria precisa de nome.');
    if (category.items.length > MAX_ITEMS_PER_CATEGORY) {
      errors.add(`A categoria "${category.name}" passa de ${MAX_ITEMS_PER_CATEGORY} perguntas.`);
    }
    for (const item of category.items) {
      const text = item.text.trim();
      if (!text) errors.add('Toda pergunta precisa de texto.');
      if (text.length > MAX_ITEM_TEXT_LENGTH) {
        errors.add(`Cada pergunta pode ter no máximo ${MAX_ITEM_TEXT_LENGTH} caracteres.`);
      }
      if (seenIds.has(item.id)) errors.add('Os ids das perguntas precisam ser únicos.');
      seenIds.add(item.id);
    }
  }

  return [...errors];
}
