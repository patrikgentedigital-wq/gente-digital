// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

const fake = vi.hoisted(() => ({
  emit: null as null | ((user: { id: string; email: string } | null) => void),
  getCurrentUserRole: vi.fn(),
}));

vi.mock('../lib/backend', () => ({
  subscribeToAuth: (callback: (user: { id: string; email: string } | null) => void) => {
    fake.emit = callback;
    return () => undefined;
  },
  getCurrentUserRole: fake.getCurrentUserRole,
}));

import { useAuthSession } from './useAuthSession';

describe('useAuthSession', () => {
  it('mantém o papel e não recarrega quando o mesmo usuário chega de novo (renovação de token)', async () => {
    fake.getCurrentUserRole.mockResolvedValue('leader');
    const { result } = renderHook(() => useAuthSession());

    act(() => fake.emit?.({ id: 'u1', email: 'a@x.com' }));
    await waitFor(() => expect(result.current.authRoleReady && result.current.authRole === 'leader').toBe(true));

    act(() => fake.emit?.({ id: 'u1', email: 'a@x.com' }));

    expect(result.current.authRole).toBe('leader');
    expect(result.current.authRoleReady).toBe(true);
    expect(fake.getCurrentUserRole).toHaveBeenCalledTimes(1);
  });

  it('zera o papel quando a pessoa sai e quando entra outra conta', async () => {
    fake.getCurrentUserRole.mockReset().mockResolvedValueOnce('leader').mockResolvedValueOnce('admin');
    const { result } = renderHook(() => useAuthSession());

    act(() => fake.emit?.({ id: 'u1', email: 'a@x.com' }));
    await waitFor(() => expect(result.current.authRole).toBe('leader'));

    act(() => fake.emit?.(null));
    expect(result.current.authRole).toBeNull();
    expect(result.current.authUser).toBeNull();

    act(() => fake.emit?.({ id: 'u2', email: 'b@x.com' }));
    await waitFor(() => expect(result.current.authRole).toBe('admin'));
  });
});
