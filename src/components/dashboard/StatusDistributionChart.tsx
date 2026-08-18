import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';

interface StatusDistributionChartProps {
  pieData: Array<{
    name: string;
    shortName: string;
    value: number;
    color: string;
    pct: number;
  }>;
  totalMembers: number;
}

interface StatusPieTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      name: string;
      value: number;
      color: string;
      pct: number;
    };
  }>;
}

const StatusPieTooltip: React.FC<StatusPieTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#0F1E38] border border-[#22365C] p-3 rounded-xl shadow-xl text-xs space-y-1">
        <p className="font-bold text-white flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ backgroundColor: data.color }}
          />
          {data.name}
        </p>
        <p className="text-[#A9B7CE]">
          Qtd: <strong className="text-white font-mono">{data.value}</strong> colaboradores ({data.pct}%)
        </p>
      </div>
    );
  }
  return null;
};

export const StatusDistributionChart: React.FC<StatusDistributionChartProps> = ({
  pieData,
  totalMembers,
}) => {
  return (
    <div className="bg-[#0F1E38] border border-[#22365C] p-5 rounded-2xl flex flex-col justify-between space-y-4">
      <div>
        <h3 className="font-display font-bold text-base text-[#F2F5FA] flex items-center gap-2">
          <PieChartIcon className="w-4 h-4 text-[#E3A73B]" />
          Distribuição por Nível
        </h3>
        <p className="text-xs text-[#A9B7CE] mt-0.5">
          Proporção de colaboradores por faixa de status de desempenho.
        </p>
      </div>

      <div className="w-full h-48 relative my-auto">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={75}
              paddingAngle={4}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`pie-cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<StatusPieTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Donut Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold font-mono text-white">{totalMembers}</span>
          <span className="text-[10px] font-mono text-[#6C7C99]">Membros</span>
        </div>
      </div>

      {/* Legend Items */}
      <div className="space-y-1.5 pt-2 border-t border-[#22365C]">
        {pieData.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-xs shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[#A9B7CE]">{item.shortName}</span>
            </div>
            <span className="font-mono font-bold text-white">
              {item.value} <span className="text-[#6C7C99] font-normal">({item.pct}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
