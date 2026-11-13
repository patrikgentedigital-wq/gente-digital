import type { TeamMember } from '../types';
import { isEvaluated } from './scoring';

/**
 * Quem aparece na aba Avaliar. Mantém a pessoa já selecionada (na versão atual da lista);
 * sem seleção, abre na primeira ainda não avaliada, para não cair sempre em quem tem a maior nota.
 */
export function pickEvaluationMember(members: readonly TeamMember[], selected: TeamMember | null): TeamMember | null {
  if (members.length === 0) return null;
  const current = selected ? members.find((member) => member.id === selected.id) : undefined;
  return current ?? members.find((member) => !isEvaluated(member)) ?? members[0];
}
