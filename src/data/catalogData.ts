import { LeaderName, TeamStructure } from '../types';

export interface CriterionCategory {
  id: number;
  name: string;
  items: string[];
}

export const CRITERIA_CATEGORIES: CriterionCategory[] = [
  {
    id: 1,
    name: 'Habilidade de comunicação',
    items: [
      'Clareza e objetividade no atendimento, sem erros gramaticais',
      'Escuta ativa para identificar as reais dores do cliente',
      'Liga para o cliente quando o chat não é ágil o suficiente',
      'Lida bem com clientes insatisfeitos e encontra soluções',
      'Usa perguntas investigativas para qualificar o problema técnico',
    ],
  },
  {
    id: 2,
    name: 'Comunicação e colaboração',
    items: [
      'Registra informações relevantes no IXCSoft, evitando retrabalho',
      'Reporta gargalos recorrentes de rede ou falhas em massa',
      'Comunica rapidamente gestor/NOC sobre problemas sistêmicos',
      'Compartilha com o time scripts e soluções ágeis',
      'Ajuda na integração e treinamento de novos membros',
    ],
  },
  {
    id: 3,
    name: 'Qualidade do trabalho',
    items: [
      'Garante que chamados/OS atendam aos critérios mínimos',
      'Alinha expectativas claras sobre prazos com o cliente',
      'Garante qualidade do cadastro no IXCSoft',
      'Executa volume correto de tarefas no prazo',
      'Realiza follow-up dos chamados pendentes nos prazos',
    ],
  },
  {
    id: 4,
    name: 'Conhecimento técnico',
    items: [
      'Conhecimento sobre planos, produtos e regras comerciais',
      'Domínio de troubleshooting de redes, Wi-Fi e fibra',
      'Conhecimento sobre novas funcionalidades do provedor',
      'Busca conhecimento adicional (cursos, vídeos, leituras)',
      'Aplica boas práticas de atendimento humanizado',
    ],
  },
  {
    id: 5,
    name: 'Adaptação e flexibilidade',
    items: [
      'Inteligência emocional ao lidar com reclamações pesadas',
      'Prioriza tarefas diante de emergências na rede',
      'Mantém alta performance mesmo após dias difíceis',
      'Iniciativa para buscar soluções em cenários atípicos',
      'Propõe melhorias em processos e ferramentas',
    ],
  },
  {
    id: 6,
    name: 'Cumprimento de regras e normas',
    items: [
      'Cordialidade e educação com os colegas',
      'Uso adequado do uniforme/EPIs obrigatórios',
      'Cumpre a política de uso do celular',
      'Cumpre rigorosamente horário de entrada, saída e intervalos',
      'Registra corretamente o ponto',
      'Pontualidade e assiduidade sem reincidência de faltas',
    ],
  },
];

const team = (leader: LeaderName, color: string): TeamStructure => ({
  leader,
  color,
  members: [],
});

export const TEAMS: TeamStructure[] = [
  team('Djemerson', '#3B6FE0'),
  team('Fernanda', '#2E9E52'),
  team('Brenda', '#7A4FCB'),
  team('Alexandre', '#D9A02B'),
  team('Alfredo', '#E0692A'),
  team('Vinicius', '#159E8E'),
  team('Hellody', '#D6266F'),
  team('Samile', '#B01942'),
  team('Diego', '#8A2030'),
];

export const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=600&q=80',
];
