// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';

vi.mock('../lib/backend', () => ({
  getArchivedMembers: vi.fn().mockResolvedValue([]),
  subscribeToAuditLogs: (onData: (logs: unknown[]) => void) => {
    onData([
      { id: '1', action: 'evaluation_saved', evaluationId: 'e1', memberId: 'm1', memberName: 'Ana', cycle: 'Novembro/2026', revision: 1, score: 100, status: 'Alarme', actorId: 'u1', actorEmail: '', actorName: 'Líder Um', createdAt: '2026-11-01T10:00:00Z' },
      { id: '2', action: 'evaluation_saved', evaluationId: 'e2', memberId: 'm2', memberName: 'Bruno', cycle: 'Novembro/2026', revision: 1, score: 120, status: 'Atenção', actorId: 'u1', actorEmail: '', actorName: 'Líder Um', createdAt: '2026-11-02T10:00:00Z' },
    ]);
    return () => undefined;
  },
}));

import { AuditLogsView } from './AuditLogsView';

afterEach(cleanup);

describe('AuditLogsView', () => {
  it('filtra os registros pelo nome do membro digitado na busca', async () => {
    render(<AuditLogsView members={[{ id: 'm1', name: 'Ana' }, { id: 'm2', name: 'Bruno' }]} onRestoreMember={async () => undefined} />);

    await act(async () => {
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'bruno' } });
    });

    const table = screen.getByRole('table');
    expect(within(table).getAllByText('Bruno').length).toBeGreaterThan(0);
    expect(within(table).queryAllByText('Ana')).toHaveLength(0);
  });
});
