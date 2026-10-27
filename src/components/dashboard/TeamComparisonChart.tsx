import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { TeamMember } from '../../types';

interface TeamComparisonChartProps {
  teamStats: Array<{
    leader: string;
    color: string;
    count: number;
    avgPercent: number;
    topMember: TeamMember | null;
    voandoCount: number;
  }>;
}

interface TeamBarTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      leader: string;
      color: string;
      avgPercent: number;
      count: number;
      voandoCount: number;
      topMember: TeamMember | null;
    };
  }>;
}

const TeamBarTooltip: React.FC<TeamBarTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-surface p-3.5 rounded-xl font-sans text-xs space-y-1.5 min-w-[180px]">
        <div className="flex items-center gap-2 font-bold text-ink border-b border-line pb-1">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: data.color }}
          />
          <span>Time {data.leader}</span>
        </div>
        <div className="flex justify-between text-muted">
          <span>Média do Time:</span>
          <span className="font-mono font-bold text-accent-text">{data.avgPercent}%</span>
        </div>
        <div className="flex justify-between text-muted">
          <span>Integrantes:</span>
          <span className="font-mono font-bold text-ink">{data.count} colaboradores</span>
        </div>
        <div className="flex justify-between text-muted">
          <span>Nível Voando (acima de 90%):</span>
          <span className="font-mono font-bold text-success">{data.voandoCount}</span>
        </div>
        {data.topMember && (
          <div className="pt-1 border-t border-line text-[11px] text-muted">
            Destaque: <strong className="text-ink">{data.topMember.name}</strong> ({data.topMember.score} pts)
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const TeamComparisonChart: React.FC<TeamComparisonChartProps> = ({ teamStats }) => {
  return (
    <div className="lg:col-span-2 bg-surface p-5 rounded-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-base text-ink flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-accent-text" />
            Média de Pontuação por Equipe
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Comparativo de performance média entre os líderes e seus times.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-accent-text">
          <span className="w-2 h-0.5 bg-accent" />
          <span>Meta: 90%</span>
        </div>
      </div>

      <div className="w-full h-72 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={teamStats}
            margin={{ top: 15, right: 10, left: -20, bottom: 20 }}
          >
            <CartesianGrid stroke="#e5e5ea" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="leader"
              stroke="#86868b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#d2d2d7' }}
              angle={-20}
              textAnchor="end"
            />
            <YAxis
              domain={[(dataMin: number) => Math.max(0, Math.floor((dataMin - 10) / 10) * 10), 100]}
              stroke="#86868b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#d2d2d7' }}
            />
            <Tooltip content={<TeamBarTooltip />} />
            <ReferenceLine
              y={90.3}
              stroke="#000000"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: 'Meta 90%',
                fill: '#000000',
                fontSize: 10,
                position: 'insideTopRight',
              }}
            />
            <Bar dataKey="avgPercent" radius={[6, 6, 0, 0]}>
              {teamStats.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || '#ffe708'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
