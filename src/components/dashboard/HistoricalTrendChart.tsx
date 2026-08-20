import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

interface HistoricalTrendChartProps {
  timelineData: Array<{
    month: string;
    year: number;
    avg: number | null;
    max: number | null;
    min: number | null;
  }>;
}

interface TrendTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload?: { year?: number } }>;
  label?: string;
}

const TrendTooltip: React.FC<TrendTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const entry = payload[0].payload;
    return (
      <div className="bg-surface border border-line p-3 rounded-xl shadow-xl text-xs space-y-1">
        <p className="font-mono font-bold text-accent">
          {label}{entry?.year ? ` / ${entry.year}` : ''}
        </p>
        <p className="text-white">
          Média Geral: <strong className="font-mono">{payload[0].value} pts</strong>
        </p>
      </div>
    );
  }
  return null;
};

export const HistoricalTrendChart: React.FC<HistoricalTrendChartProps> = ({ timelineData }) => {
  const firstMonth = timelineData[0]?.month;
  const lastMonth = timelineData[timelineData.length - 1]?.month;
  const hasWindow = Boolean(firstMonth && lastMonth);

  return (
    <div className="bg-surface border border-line p-5 rounded-2xl space-y-3">
      <div>
        <h3 className="font-display font-bold text-base text-ink flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-accent" />
          Evolução da Média Geral{hasWindow ? ` (${firstMonth} a ${lastMonth})` : ''}
        </h3>
        <p className="text-xs text-muted mt-0.5">
          Trajetória do desempenho médio da equipe nos últimos meses.
        </p>
      </div>

      <div className="w-full h-52 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={timelineData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E3A73B" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#E3A73B" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1F3356" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" stroke="#6C7C99" fontSize={11} tickLine={false} />
            <YAxis
              domain={[(dataMin: number) => Math.max(0, Math.floor((dataMin - 10) / 10) * 10), 155]}
              stroke="#6C7C99"
              fontSize={11}
              tickLine={false}
            />
            <Tooltip content={<TrendTooltip />} />
            <Area
              type="monotone"
              dataKey="avg"
              connectNulls
              stroke="#E3A73B"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#scoreColor)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
