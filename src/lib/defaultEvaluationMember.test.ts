import { describe, expect, it } from 'vitest';
import type { TeamMember } from '../types';
import { pickEvaluationMember } from './defaultEvaluationMember';

const member = (id: string, evaluationStatus: TeamMember['evaluationStatus']) => ({ id, evaluationStatus }) as TeamMember;

describe('pickEvaluationMember', () => {
  const ranked = [member('fernanda', 'Concluído'), member('danielle', 'Concluído'), member('alexandre', 'Pendente'), member('brenda', 'Pendente')];

  it('sem ninguém selecionado, abre na primeira pessoa ainda não avaliada', () => {
    expect(pickEvaluationMember(ranked, null)?.id).toBe('alexandre');
  });

  it('se todos já foram avaliados, abre no primeiro da lista', () => {
    expect(pickEvaluationMember([member('a', 'Concluído'), member('b', 'Concluído')], null)?.id).toBe('a');
  });

  it('mantém quem já estava selecionado, mesmo já avaliado', () => {
    expect(pickEvaluationMember(ranked, member('fernanda', 'Concluído'))?.id).toBe('fernanda');
  });

  it('devolve a versão atualizada de quem estava selecionado', () => {
    const updated = member('fernanda', 'Pendente');
    expect(pickEvaluationMember([updated], member('fernanda', 'Concluído'))).toBe(updated);
  });

  it('se quem estava selecionado saiu da lista, escolhe como se não houvesse seleção', () => {
    expect(pickEvaluationMember(ranked, member('mari', 'Pendente'))?.id).toBe('alexandre');
  });

  it('lista vazia não seleciona ninguém', () => {
    expect(pickEvaluationMember([], member('fernanda', 'Concluído'))).toBeNull();
  });
});
