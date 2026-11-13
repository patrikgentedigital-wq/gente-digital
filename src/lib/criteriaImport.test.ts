import { describe, expect, it } from 'vitest';
import { parseCriteriaText } from './criteriaImport';

const withScores = `GENTE DIGITAL — AVALIAÇÃO DE DESEMPENHO
Alexandre da Silva Melo — Gerente de Rede e Infraestrutura

1. Liderança e gestão da equipe técnica
2. Orienta, acompanha e cobra resultados dos coordenadores.
Nota: Não avaliado/5
2. Distribui responsabilidades com clareza.
Nota: Não avaliado/5
Observações: Não informadas
Subtotal: 0/10

2. Estabilidade e qualidade da rede
3. Acompanha indicadores de disponibilidade.
Nota: Não avaliado/5
2. Identifica causas de quedas recorrentes.
Nota: Não avaliado/5
Observações: Não informadas
Subtotal: 0/10

TOTAL: 0/20
Critérios avaliados: 0/4`;

const onlyQuestions = `GENTE DIGITAL
AVALIAÇÃO DE DESEMPENHO — NARAH | DESIGNER
1. CRIATIVIDADE E QUALIDADE VISUAL
Demonstra criatividade na criação de artes?
Desenvolve peças visuais profissionais?
2. PLANEJAMENTO, ORGANIZAÇÃO E CUMPRIMENTO DE PRAZOS
Organiza suas demandas e prioridades?
Cumpre os cronogramas de campanhas?`;

const singleCategory = `GENTE DIGITAL — FERNANDA — COMPETÊNCIA 6
1. Cumpre prazos, compromissos e responsabilidades do RH.
Nota: Não avaliado/5

2. Registra e documenta adequadamente ocorrências.
Nota: Não avaliado/5

Observações:
Total: 0/10`;

describe('parseCriteriaText', () => {
  it('lê o formulário com "Nota" e subtotais, ignorando cabeçalho, observações e totais', () => {
    const { categories, errors } = parseCriteriaText(withScores);
    expect(errors).toEqual([]);
    expect(categories.map((c) => c.name)).toEqual(['Liderança e gestão da equipe técnica', 'Estabilidade e qualidade da rede']);
    expect(categories[0].items.map((i) => i.text)).toEqual([
      'Orienta, acompanha e cobra resultados dos coordenadores.',
      'Distribui responsabilidades com clareza.',
    ]);
  });

  it('ignora a numeração das perguntas, mesmo trocada', () => {
    const { categories } = parseCriteriaText(withScores);
    expect(categories[1].items[0].text).toBe('Acompanha indicadores de disponibilidade.');
  });

  it('lê o formulário só com perguntas e passa os títulos em maiúsculas para minúsculas', () => {
    const { categories } = parseCriteriaText(onlyQuestions);
    expect(categories.map((c) => c.name)).toEqual(['Criatividade e qualidade visual', 'Planejamento, organização e cumprimento de prazos']);
    expect(categories[0].items).toHaveLength(2);
    expect(categories[1].items[1].text).toBe('Cumpre os cronogramas de campanhas?');
  });

  it('numera categorias e perguntas no mesmo formato do editor ("1-0")', () => {
    const { categories } = parseCriteriaText(onlyQuestions);
    expect(categories.map((c) => c.id)).toEqual(['1', '2']);
    expect(categories[1].items.map((i) => i.id)).toEqual(['2-0', '2-1']);
  });

  it('sem título de categoria, junta tudo numa categoria só chamada "Competência"', () => {
    const { categories } = parseCriteriaText(singleCategory);
    expect(categories).toHaveLength(1);
    expect(categories[0].items).toHaveLength(2);
    expect(categories[0].name).toBe('Competência');
  });

  it('avisa quando uma pergunta passa de 200 caracteres', () => {
    const long = `${'a'.repeat(201)}.`;
    const { errors } = parseCriteriaText(`1. Categoria\n${long}`);
    expect(errors).toContain('Cada pergunta pode ter no máximo 200 caracteres.');
  });

  it('avisa quando não encontra nenhuma pergunta', () => {
    const { categories, errors } = parseCriteriaText('só um título sem perguntas');
    expect(categories).toEqual([]);
    expect(errors).toContain('Inclua ao menos uma pergunta.');
  });

  it('aceita texto com quebras de linha do Windows e espaços sobrando', () => {
    const { categories } = parseCriteriaText('  1. Categoria  \r\n  Pergunta um?  \r\n\r\n  Pergunta dois?  ');
    expect(categories[0].items.map((i) => i.text)).toEqual(['Pergunta um?', 'Pergunta dois?']);
  });
});
