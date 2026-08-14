import { TeamMember, LeaderName, TeamStructure } from '../types';

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
      'Usa perguntas investigativas para qualificar o problema técnico'
    ]
  },
  {
    id: 2,
    name: 'Comunicação e colaboração',
    items: [
      'Registra informações relevantes no IXCSoft, evitando retrabalho',
      'Reporta gargalos recorrentes de rede ou falhas em massa',
      'Comunica rapidamente gestor/NOC sobre problemas sistêmicos',
      'Compartilha com o time scripts e soluções ágeis',
      'Ajuda na integração e treinamento de novos membros'
    ]
  },
  {
    id: 3,
    name: 'Qualidade do trabalho',
    items: [
      'Garante que chamados/OS atendam aos critérios mínimos',
      'Alinha expectativas claras sobre prazos com o cliente',
      'Garante qualidade do cadastro no IXCSoft',
      'Executa volume correto de tarefas no prazo',
      'Realiza follow-up dos chamados pendentes nos prazos'
    ]
  },
  {
    id: 4,
    name: 'Conhecimento técnico',
    items: [
      'Conhecimento sobre planos, produtos e regras comerciais',
      'Domínio de troubleshooting de redes, Wi-Fi e fibra',
      'Conhecimento sobre novas funcionalidades do provedor',
      'Busca conhecimento adicional (cursos, vídeos, leituras)',
      'Aplica boas práticas de atendimento humanizado'
    ]
  },
  {
    id: 5,
    name: 'Adaptação e flexibilidade',
    items: [
      'Inteligência emocional ao lidar com reclamações pesadas',
      'Prioriza tarefas diante de emergências na rede',
      'Mantém alta performance mesmo após dias difíceis',
      'Iniciativa para buscar soluções em cenários atípicos',
      'Propõe melhorias em processos e ferramentas'
    ]
  },
  {
    id: 6,
    name: 'Cumpriu regras e normas',
    items: [
      'Cordialidade e educação com os colegas',
      'Uso adequado do uniforme/EPIs obrigatórios',
      'Cumpre a política de uso do celular',
      'Cumpre rigorosamente horário de entrada, saída e intervalos',
      'Registra corretamente o ponto',
      'Pontualidade e assiduidade sem reincidência de faltas'
    ]
  }
];

export const TEAMS: TeamStructure[] = [
  { leader: 'Djemerson', color: '#3B6FE0', members: ['Patrik'] },
  { leader: 'Fernanda', color: '#2E9E52', members: [] },
  { leader: 'Brenda', color: '#7A4FCB', members: ['Dhessica', 'Giovane', 'Wellem'] },
  {
    leader: 'Alexandre',
    color: '#D9A02B',
    members: [
      'Mayson',
      'João Lucas',
      'João Vitor',
      'Antonio Maria',
      'Jonas',
      'Leandro',
      'Iury',
      'Natanael',
      'Clebson',
      'Jefferson Silva',
      'Renan',
      'Jheferson Melo',
      'Paulo Guedes',
      'Demison',
      'Julio',
      'Yhanleno'
    ]
  },
  { leader: 'Alfredo', color: '#E0692A', members: [] },
  { leader: 'Vinicius', color: '#159E8E', members: [] },
  { leader: 'Hellody', color: '#D6266F', members: [] },
  { leader: 'Samile', color: '#B01942', members: [] },
  {
    leader: 'Diego',
    color: '#8A2030',
    members: ['Wendel', 'Cristiane', 'Paulo Victor', 'Nivea', 'Helber', 'Marcos']
  }
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
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=600&q=80'
];

export const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'emp-1',
    name: 'Patrik',
    role: 'Analista de Infraestrutura & Redes',
    team: 'Djemerson',
    teamColor: '#3B6FE0',
    rank: 1,
    previousRank: 1,
    score: 154,
    maxScore: 155,
    status: 'Voando',
    avatarUrl: AVATAR_PRESETS[3],
    evaluationStatus: 'Concluído',
    email: 'patrik@gentedigital.com.br',
    currentRating: 4.9,
    history: [
      { month: 'Mai', score: 142 },
      { month: 'Jun', score: 148 },
      { month: 'Jul', score: 152 },
      { month: 'Ago', score: 154 }
    ]
  },
  {
    id: 'emp-2',
    name: 'Mayson',
    role: 'Técnico de Operações NOC',
    team: 'Alexandre',
    teamColor: '#D9A02B',
    rank: 2,
    previousRank: 4,
    score: 148,
    maxScore: 155,
    status: 'Voando',
    avatarUrl: AVATAR_PRESETS[6],
    evaluationStatus: 'Forms Respondido',
    email: 'mayson@gentedigital.com.br',
    currentRating: 4.7,
    history: [
      { month: 'Mai', score: 136 },
      { month: 'Jun', score: 142 },
      { month: 'Jul', score: 145 },
      { month: 'Ago', score: 148 }
    ]
  },
  {
    id: 'emp-3',
    name: 'Dhessica',
    role: 'Especialista em Atendimento',
    team: 'Brenda',
    teamColor: '#7A4FCB',
    rank: 3,
    previousRank: 2,
    score: 142,
    maxScore: 155,
    status: 'Voando',
    avatarUrl: AVATAR_PRESETS[1],
    evaluationStatus: 'Forms Respondido',
    email: 'dhessica@gentedigital.com.br',
    currentRating: 4.5,
    history: [
      { month: 'Mai', score: 144 },
      { month: 'Jun', score: 138 },
      { month: 'Jul', score: 140 },
      { month: 'Ago', score: 142 }
    ]
  },
  {
    id: 'emp-4',
    name: 'Cristiane',
    role: 'Analista de Suporte do Provedor',
    team: 'Diego',
    teamColor: '#8A2030',
    rank: 4,
    previousRank: 5,
    score: 138,
    maxScore: 155,
    status: 'Caminho Certo',
    avatarUrl: AVATAR_PRESETS[5],
    evaluationStatus: 'Forms Respondido',
    email: 'cristiane@gentedigital.com.br',
    currentRating: 4.3,
    history: [
      { month: 'Mai', score: 128 },
      { month: 'Jun', score: 132 },
      { month: 'Jul', score: 135 },
      { month: 'Ago', score: 138 }
    ]
  },
  {
    id: 'emp-5',
    name: 'João Lucas',
    role: 'Técnico de Campo & Fibra',
    team: 'Alexandre',
    teamColor: '#D9A02B',
    rank: 5,
    previousRank: 3,
    score: 135,
    maxScore: 155,
    status: 'Caminho Certo',
    avatarUrl: AVATAR_PRESETS[8],
    evaluationStatus: 'Forms Respondido',
    email: 'joao.lucas@gentedigital.com.br',
    currentRating: 4.2,
    history: [
      { month: 'Mai', score: 137 },
      { month: 'Jun', score: 130 },
      { month: 'Jul', score: 133 },
      { month: 'Ago', score: 135 }
    ]
  },
  {
    id: 'emp-6',
    name: 'Giovane',
    role: 'Atendente de Suporte N2',
    team: 'Brenda',
    teamColor: '#7A4FCB',
    rank: 6,
    previousRank: 7,
    score: 132,
    maxScore: 155,
    status: 'Caminho Certo',
    avatarUrl: AVATAR_PRESETS[9],
    evaluationStatus: 'Forms Respondido',
    email: 'giovane@gentedigital.com.br',
    currentRating: 4.1,
    history: [
      { month: 'Mai', score: 122 },
      { month: 'Jun', score: 126 },
      { month: 'Jul', score: 129 },
      { month: 'Ago', score: 132 }
    ]
  },
  {
    id: 'emp-7',
    name: 'Wendel',
    role: 'Supervisor de Suporte Técnico',
    team: 'Diego',
    teamColor: '#8A2030',
    rank: 7,
    previousRank: 6,
    score: 128,
    maxScore: 155,
    status: 'Atenção',
    avatarUrl: AVATAR_PRESETS[4],
    evaluationStatus: 'Pendente',
    email: 'wendel@gentedigital.com.br',
    currentRating: 3.9,
    history: [
      { month: 'Mai', score: 131 },
      { month: 'Jun', score: 130 },
      { month: 'Jul', score: 129 },
      { month: 'Ago', score: 128 }
    ]
  },
  {
    id: 'emp-8',
    name: 'João Vitor',
    role: 'Técnico de Manutenção IXC',
    team: 'Alexandre',
    teamColor: '#D9A02B',
    rank: 8,
    previousRank: 8,
    score: 125,
    maxScore: 155,
    status: 'Atenção',
    avatarUrl: AVATAR_PRESETS[7],
    evaluationStatus: 'Pendente',
    email: 'joao.vitor@gentedigital.com.br',
    currentRating: 3.8,
    history: [
      { month: 'Mai', score: 120 },
      { month: 'Jun', score: 122 },
      { month: 'Jul', score: 123 },
      { month: 'Ago', score: 125 }
    ]
  },
  {
    id: 'emp-9',
    name: 'Paulo Victor',
    role: 'Operador de Sistemas IXCSoft',
    team: 'Diego',
    teamColor: '#8A2030',
    rank: 9,
    previousRank: 10,
    score: 118,
    maxScore: 155,
    status: 'Alarme',
    avatarUrl: AVATAR_PRESETS[0],
    evaluationStatus: 'Pendente',
    email: 'paulo.victor@gentedigital.com.br',
    currentRating: 3.5,
    history: [
      { month: 'Mai', score: 110 },
      { month: 'Jun', score: 112 },
      { month: 'Jul', score: 115 },
      { month: 'Ago', score: 118 }
    ]
  },
  {
    id: 'emp-10',
    name: 'Wellem',
    role: 'Atendente N1',
    team: 'Brenda',
    teamColor: '#7A4FCB',
    rank: 10,
    previousRank: 9,
    score: 115,
    maxScore: 155,
    status: 'Alarme',
    avatarUrl: AVATAR_PRESETS[2],
    evaluationStatus: 'Pendente',
    email: 'wellem@gentedigital.com.br',
    currentRating: 3.4,
    history: [
      { month: 'Mai', score: 118 },
      { month: 'Jun', score: 116 },
      { month: 'Jul', score: 115 },
      { month: 'Ago', score: 115 }
    ]
  }
];
