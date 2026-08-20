export type PerformanceStatus = 'Voando' | 'Caminho Certo' | 'Atenção' | 'Alarme';

export type LeaderName = 
  | 'Djemerson' 
  | 'Fernanda' 
  | 'Brenda' 
  | 'Alexandre' 
  | 'Alfredo' 
  | 'Vinicius' 
  | 'Hellody' 
  | 'Samile' 
  | 'Diego';

export interface EvaluationCriterion {
  id: string;
  categoryId: number;
  categoryName: string;
  description: string;
  score: number; // 0 to 5
}

export interface PdiGoal {
  id: string;
  title: string;
  deadline: string;
  status: 'pending' | 'completed';
  description?: string;
}

export interface EvaluationHistoryEntry {
  id: string;
  cycle: string;
  date: string;
  score: number;
  status: PerformanceStatus;
  leaderName: string;
  comments: string;
  criteriaScores?: Record<string, number>;
  selfScores?: Record<string, number>;
  pdiGoals?: PdiGoal[];
}

export interface EvaluationAuditLog {
  id: string;
  action: 'evaluation_saved';
  evaluationId: string;
  memberId: string;
  memberName: string;
  cycle: string;
  revision: number;
  score: number;
  status: PerformanceStatus;
  previousScore?: number;
  previousStatus?: PerformanceStatus;
  actorId: string;
  actorEmail: string;
  actorName: string;
  createdAt?: unknown;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  team: LeaderName; // Team leader name as per organogram
  teamColor: string;
  rank: number;
  previousRank?: number;
  score: number; // Total points out of 155
  maxScore: number; // 155
  status: PerformanceStatus;
  avatarUrl: string;
  evaluationStatus: 'Pendente' | 'Forms Respondido' | 'Concluído';
  email: string;
  currentRating?: number;
  history?: {
    month: string;
    score: number;
  }[];
  pdiGoals?: PdiGoal[];
  selfEvaluationScores?: Record<string, number>;
  evaluationHistory?: EvaluationHistoryEntry[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconName: string;
  category: 'performance' | 'growth' | 'leadership' | 'engagement';
  rarity: 'gold' | 'silver' | 'bronze' | 'diamond';
  unlocked: boolean;
  unlockedAt?: string;
  progress?: {
    current: number;
    max: number;
  };
}

export interface TeamStructure {
  leader: LeaderName;
  color: string;
  members: string[];
}
