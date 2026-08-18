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
    avg: number;
    max: number;
    min: number;
  }>;
}

interface TrendTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

const TrendTooltip: React.FC<TrendTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0F1E38] border border-[#22365C] p-3 rounded-xl shadow-xl text-xs space-y-1">
        <p className="font-mono font-bold text-[#E3A73B]">{label} / 2026</p>
        <p className="text-white">
          Média Geral: <strong className="font-mono">{payload[0].value} pts</strong>
        </p>
      </div>
    );
  }
  return null;
};

export const HistoricalTrendChart: React.FC<HistoricalTrendChartProps> = ({ timelineData }) => {
  return (
    <div className="bg-[#0F1E38] border border-[#22365C] p-5 rounded-2xl space-y-3">
      <div>
        <h3 className="font-display font-bold text-base text-[#F2F5FA] flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#E3A73B]" />
          Evolução da Média Geral (Mai a Ago)
        </h3>
        <p className="text-xs text-[#A9B7CE] mt-0.5">
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
            <YAxis domain={[110, 155]} stroke="#6C7C99" fontSize={11} tickLine={false} />
            <Tooltip content={<TrendTooltip />} />
            <Area
              type="monotone"
              dataKey="avg"
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
