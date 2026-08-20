import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface ScoreBucketHistogramProps {
  scoreBuckets: Array<{
    range: string;
    label: string;
    count: number;
    color: string;
  }>;
  totalMembers: number;
}

export const ScoreBucketHistogram: React.FC<ScoreBucketHistogramProps> = ({
  scoreBuckets,
  totalMembers,
}) => {
  return (
    <div className="bg-surface border border-line p-5 rounded-2xl space-y-4 flex flex-col justify-between">
      <div>
        <h3 className="font-display font-bold text-base text-ink flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-success" />
          Concentração por Faixa de Pontuação
        </h3>
        <p className="text-xs text-muted mt-0.5">
          Quantidade de colaboradores dentro de cada intervalo de pontos.
        </p>
      </div>

      <div className="space-y-3 my-auto">
        {scoreBuckets.map((bucket, idx) => {
          const pct = Math.round((bucket.count / (totalMembers || 1)) * 100);
          return (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-ink font-bold">{bucket.range} ({bucket.label})</span>
                <span className="text-muted">
                  <strong className="text-white">{bucket.count}</strong> ({pct}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-app rounded-full overflow-hidden border border-line">
                <div
                  className="h-full transition-all duration-500 rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: bucket.color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[11px] text-faint pt-2 border-t border-line">
        * Pontuação máxima atingível no ciclo de avaliação: <strong>155 pontos</strong>.
      </div>
    </div>
  );
};
