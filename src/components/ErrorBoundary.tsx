import React from 'react';
import { clientErrorReporter } from '../lib/clientErrors';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error) {
    console.error('Erro capturado pelo ErrorBoundary:', error);
    clientErrorReporter.report(error, 'boundary');
    this.props.onError?.(error);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md rounded-3xl bg-surface p-6 text-center">
            <h2 className="text-xl font-bold text-ink">Algo deu errado</h2>
            <p className="mt-2 text-sm text-muted">
              Ocorreu um erro inesperado na interface. Seus dados não foram afetados.
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="mt-5 rounded-brand bg-accent px-4 py-2 text-xs font-bold text-accent-ink cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}