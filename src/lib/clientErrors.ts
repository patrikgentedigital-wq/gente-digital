import { createErrorReporter } from './errorReporting';
import { reportError } from './backend';

/** Registrador único do app: ErrorBoundary, erros da janela e falhas de salvamento passam por ele. */
export const clientErrorReporter = createErrorReporter(reportError);
