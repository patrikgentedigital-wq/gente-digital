// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('boom');
  return <div>ok</div>;
}

afterEach(() => cleanup());

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('ok')).toBeTruthy();
  });

  it('shows the fallback when a child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Algo deu errado')).toBeTruthy();
    (console.error as unknown as ReturnType<typeof vi.spyOn>).mockRestore();
  });

  it('re-renders children after the user clicks to try again', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let shouldThrow = true;
    const ToggleBomb = () => {
      if (shouldThrow) throw new Error('boom');
      return <div>ok</div>;
    };
    render(
      <ErrorBoundary>
        <ToggleBomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Algo deu errado')).toBeTruthy();

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(screen.getByText('ok')).toBeTruthy();
    (console.error as unknown as ReturnType<typeof vi.spyOn>).mockRestore();
  });

  it('calls onError with the thrown error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' }));
    (console.error as unknown as ReturnType<typeof vi.spyOn>).mockRestore();
  });
});