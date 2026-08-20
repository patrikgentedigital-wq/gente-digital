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
    avgScore: number;
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
      avgScore: number;
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
      <div className="bg-[#0F1E38] border border-[#22365C] p-3.5 rounded-xl shadow-2xl font-sans text-xs space-y-1.5 min-w-[180px]">
        <div className="flex items-center gap-2 font-bold text-[#F2F5FA] border-b border-[#22365C] pb-1">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: data.color }}
          />
          <span>Time {data.leader}</span>
        </div>
        <div className="flex justify-between text-[#A9B7CE]">
          <span>Média do Time:</span>
          <span className="font-mono font-bold text-[#E3A73B]">{data.avgScore} pts</span>
        </div>
        <div className="flex justify-between text-[#A9B7CE]">
          <span>Integrantes:</span>
          <span className="font-mono font-bold text-white">{data.count} colaboradores</span>
        </div>
        <div className="flex justify-between text-[#A9B7CE]">
          <span>Nível Voando (&gt;140):</span>
          <span className="font-mono font-bold text-[#4fb579]">{data.voandoCount}</span>
        </div>
        {data.topMember && (
          <div className="pt-1 border-t border-[#22365C] text-[11px] text-[#A9B7CE]">
            Destaque: <strong className="text-white">{data.topMember.name}</strong> ({data.topMember.score} pts)
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const TeamComparisonChart: React.FC<TeamComparisonChartProps> = ({ teamStats }) => {
  return (
    <div className="lg:col-span-2 bg-[#0F1E38] border border-[#22365C] p-5 rounded-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-base text-[#F2F5FA] flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#E3A73B]" />
            Média de Pontuação por Equipe
          </h3>
          <p className="text-xs text-[#A9B7CE] mt-0.5">
            Comparativo de performance média entre os líderes e seus times.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-[#E3A73B]">
          <span className="w-2 h-0.5 bg-[#E3A73B]" />
          <span>Meta: 140 pts</span>
        </div>
      </div>

      <div className="w-full h-72 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={teamStats}
            margin={{ top: 15, right: 10, left: -20, bottom: 20 }}
          >
            <CartesianGrid stroke="#1F3356" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="leader"
              stroke="#6C7C99"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#22365C' }}
              angle={-20}
              textAnchor="end"
            />
            <YAxis
              domain={[(dataMin: number) => Math.max(0, Math.floor((dataMin - 10) / 10) * 10), 155]}
              stroke="#6C7C99"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#22365C' }}
            />
            <Tooltip content={<TeamBarTooltip />} />
            <ReferenceLine
              y={140}
              stroke="#E3A73B"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: 'Meta 140',
                fill: '#E3A73B',
                fontSize: 10,
                position: 'insideTopRight',
              }}
            />
            <Bar dataKey="avgScore" radius={[6, 6, 0, 0]}>
              {teamStats.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || '#3B6FE0'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
