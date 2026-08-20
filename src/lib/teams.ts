export const TEAM_LEADERS = [
  'Djemerson',
  'Fernanda',
  'Brenda',
  'Alexandre',
  'Alfredo',
  'Vinicius',
  'Hellody',
  'Samile',
  'Diego',
] as const;

export type TeamLeaderName = (typeof TEAM_LEADERS)[number];