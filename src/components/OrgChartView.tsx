import React, { useMemo } from 'react';
import type { TeamMember } from '../types';
import { buildOrgChart, type OrgNode } from '../lib/orgChart';
import { isEvaluated, percentOf } from '../lib/scoring';
import { Avatar } from './Avatar';

interface OrgChartViewProps {
  members: TeamMember[];
  onSelectMemberForDetail: (member: TeamMember) => void;
}

function countPeople(node: OrgNode): number {
  return node.children.reduce((sum, child) => sum + (child.member ? 1 : 0) + countPeople(child), 0);
}

const NodeCard: React.FC<{ node: OrgNode; onSelect: (member: TeamMember) => void }> = ({ node, onSelect }) => {
  const { member } = node;
  const people = countPeople(node);

  const card = member ? (
    <button
      type="button"
      onClick={() => onSelect(member)}
      className="flex items-center gap-3 text-left cursor-pointer min-w-0"
      aria-label={`Abrir ${member.name}`}
    >
      <Avatar name={member.name} src={member.avatarUrl} teamColor={member.teamColor} size="sm" />
      <span className="min-w-0">
        <span className="block text-sm font-bold text-ink truncate">{member.name}</span>
        <span className="block text-xs text-muted truncate">{member.role}</span>
      </span>
      <span className="ml-2 text-xs font-bold text-muted shrink-0">
        {isEvaluated(member) ? `${Math.round(percentOf(member.score, member.maxScore))}%` : 'Sem avaliação'}
      </span>
    </button>
  ) : (
    <span className="text-sm font-bold text-ink">Time {node.label}</span>
  );

  if (node.children.length === 0) return <li className="py-1.5">{card}</li>;

  return (
    <li className="py-1.5">
      <details open className="group">
        <summary className="flex items-center gap-3 cursor-pointer list-none">
          <span aria-hidden className="text-xs text-muted transition-transform group-open:rotate-90">▶</span>
          {card}
          <span className="text-xs text-muted shrink-0">{people} {people === 1 ? 'pessoa' : 'pessoas'}</span>
        </summary>
        <ul className="ml-3 mt-1 border-l-2 border-block-edge pl-5">
          {node.children.map((child) => (
            <NodeCard key={child.key} node={child} onSelect={onSelect} />
          ))}
        </ul>
      </details>
    </li>
  );
};

/** Quem responde a quem, montado a partir do time de cada colaborador. */
export const OrgChartView: React.FC<OrgChartViewProps> = ({ members, onSelectMemberForDetail }) => {
  const roots = useMemo(() => buildOrgChart(members), [members]);

  if (roots.length === 0) {
    return <div className="blk p-8 text-center text-sm text-muted" role="status">Nenhum colaborador cadastrado.</div>;
  }

  return (
    <div className="w-full max-w-[1040px] mx-auto pb-16 font-sans">
      <ul className="blk p-5">
        {roots.map((root) => (
          <NodeCard key={root.key} node={root} onSelect={onSelectMemberForDetail} />
        ))}
      </ul>
    </div>
  );
};
