// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { CriteriaCategory } from '../lib/criteria';
import { LevelSimulator } from './LevelSimulator';

afterEach(() => cleanup());

const categories: CriteriaCategory[] = [
  { id: 'c1', name: 'Entrega', items: Array.from({ length: 10 }, (_, i) => ({ id: `q${i}`, text: `Pergunta ${i}` })) },
];
// 10 perguntas, máximo 50. Notas 4 em tudo menos q0 = 1: 37 pontos (Alarme; Atenção começa em 39).
const scores = { ...Object.fromEntries(categories[0].items.map((i) => [i.id, 4])), q0: 1 };

describe('LevelSimulator', () => {
  it('diz quantos pontos faltam e para qual faixa', () => {
    render(<LevelSimulator criteria={categories} scores={scores} />);
    expect(screen.getByText(/Faltam/).textContent).toContain('2 pontos');
    expect(screen.getByText(/Faltam/).textContent).toContain('Atenção');
  });

  it('subir a nota de uma pergunta muda a projeção e a faixa, sem salvar nada', () => {
    render(<LevelSimulator criteria={categories} scores={scores} />);
    expect(screen.getByRole('status').textContent).toContain('Continuaria em Alarme');
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar nota de: Pergunta 0' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar nota de: Pergunta 0' }));
    expect(screen.getByRole('status').textContent).toContain('39 / 50');
    expect(screen.getByRole('status').textContent).toContain('Chegaria em Atenção');
    fireEvent.click(screen.getByRole('button', { name: /Limpar simulação/ }));
    expect(screen.getByRole('status').textContent).toContain('Continuaria em Alarme');
  });

  it('em Voando não há o que simular', () => {
    const top = Object.fromEntries(categories[0].items.map((i) => [i.id, 5]));
    render(<LevelSimulator criteria={categories} scores={top} />);
    expect(screen.getByText(/faixa mais alta/)).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });
});
