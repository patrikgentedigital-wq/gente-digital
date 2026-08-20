// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import {
  clearDraft,
  DRAFT_VERSION,
  draftKey,
  isEmptyDraft,
  loadDraft,
  saveDraft,
} from './draftUtils';
import type { PdiGoal } from '../types';

const goal: PdiGoal = {
  id: 'goal-1',
  title: 'Certificação IXC',
  deadline: '30 dias',
  status: 'pending',
};

describe('draftUtils', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('saves and loads a draft round-trip', () => {
    saveDraft('member-1', 'Janeiro/2026', {
      scores: { '1-0': 4 },
      leaderComments: 'Bom desempenho',
      pdiGoals: [goal],
    });

    const draft = loadDraft('member-1', 'Janeiro/2026');
    expect(draft).not.toBeNull();
    expect(draft?.version).toBe(DRAFT_VERSION);
    expect(draft?.scores['1-0']).toBe(4);
    expect(draft?.leaderComments).toBe('Bom desempenho');
    expect(draft?.pdiGoals).toHaveLength(1);
    expect(draft?.updatedAt).toBeTypeOf('string');
  });

  it('returns null when there is no draft', () => {
    expect(loadDraft('member-1', 'Janeiro/2026')).toBeNull();
  });

  it('returns null for a draft of another member or cycle', () => {
    saveDraft('member-1', 'Janeiro/2026', {
      scores: { '1-0': 4 },
      leaderComments: '',
      pdiGoals: [],
    });
    expect(loadDraft('member-2', 'Janeiro/2026')).toBeNull();
    expect(loadDraft('member-1', 'Março/2026')).toBeNull();
  });

  it('returns null for corrupted storage', () => {
    window.localStorage.setItem(draftKey('member-1', 'Janeiro/2026'), '{not-json');
    expect(loadDraft('member-1', 'Janeiro/2026')).toBeNull();
  });

  it('returns null for an incompatible version', () => {
    window.localStorage.setItem(
      draftKey('member-1', 'Janeiro/2026'),
      JSON.stringify({ version: 99, memberId: 'member-1', cycle: 'Janeiro/2026' }),
    );
    expect(loadDraft('member-1', 'Janeiro/2026')).toBeNull();
  });

  it('clears the draft', () => {
    saveDraft('member-1', 'Janeiro/2026', {
      scores: { '1-0': 4 },
      leaderComments: '',
      pdiGoals: [],
    });
    clearDraft('member-1', 'Janeiro/2026');
    expect(loadDraft('member-1', 'Janeiro/2026')).toBeNull();
  });

  it('detects empty drafts', () => {
    expect(
      isEmptyDraft({ scores: {}, leaderComments: '', pdiGoals: [] }),
    ).toBe(true);
    expect(
      isEmptyDraft({ scores: { '1-0': 0 }, leaderComments: ' ', pdiGoals: [] }),
    ).toBe(true);
    expect(
      isEmptyDraft({ scores: { '1-0': 3 }, leaderComments: '', pdiGoals: [] }),
    ).toBe(false);
    expect(
      isEmptyDraft({ scores: {}, leaderComments: 'ok', pdiGoals: [] }),
    ).toBe(false);
  });
});