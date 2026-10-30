import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { clientErrorReporter } from './lib/clientErrors';
import { installGlobalErrorReporting } from './lib/errorReporting';
import { applyTheme, readStoredTheme } from './lib/theme';

installGlobalErrorReporting(clientErrorReporter);
// Antes de desenhar a tela, para não piscar claro quando a escolha salva é o escuro.
applyTheme(document.documentElement, readStoredTheme());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Não foi possível ativar o modo offline:', error);
    });
  });
}
