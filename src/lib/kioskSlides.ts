/** Os quatro slides do Modo TV: 0 destaques, 1 evoluções no ranking, 2 comparativo de equipes, 3 quem subiu de nível. */
export const KIOSK_SLIDE_COUNT = 4;

/** Um slide só aparece quando tem o que mostrar; a TV fica ligada sem ninguém olhando, então não pode girar telas em branco. */
export function availableSlides(data: {
  topScore: number;
  growth: number;
  teamsWithScore: number;
  levelUp: number;
}): boolean[] {
  return [data.topScore > 0, data.growth > 0, data.teamsWithScore > 0, data.levelUp > 0];
}

/** Próximo slide com conteúdo, na direção pedida e dando a volta; sem nenhum disponível, não sai do lugar. */
export function nextSlide(current: number, available: boolean[], direction: 1 | -1): number {
  for (let step = 1; step <= KIOSK_SLIDE_COUNT; step += 1) {
    const candidate = (current + direction * step + KIOSK_SLIDE_COUNT * step) % KIOSK_SLIDE_COUNT;
    if (available[candidate]) return candidate;
  }
  return current;
}

/** Slide que deve aparecer agora: o atual, se tiver conteúdo; senão o primeiro disponível; -1 se não há nenhum. */
export function activeSlide(current: number, available: boolean[]): number {
  if (available[current]) return current;
  return available.findIndex(Boolean);
}
