import { describe, expect, it } from 'vitest';
import { getInitials } from './Avatar';

describe('getInitials', () => {
  it('ignora símbolos e usa a primeira letra de cada palavra', () => {
    expect(getInitials('Mari (IA)')).toBe('MI');
    expect(getInitials('João Lucas')).toBe('JL');
  });

  it('nome vazio não gera iniciais', () => {
    expect(getInitials('  ')).toBe('');
  });
});
