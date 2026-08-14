#!/usr/bin/env node
// Provisionamento de roles via callables do Gente Digital.
//
// Uso:
//   npm run provision -- bootstrap <email> <senha>
//     Promove o próprio usuário (login + e-mail verificado + igual a
//     BOOTSTRAP_ADMIN_EMAIL) a primeiro admin. Falha se já existir admin.
//
//   npm run provision -- set-role <adminEmail> <adminSenha> <leader|admin|null> <alvo@email.com>
//     Atribui ou remove a role de um usuário existente (exige login de um admin).
//
// As funções precisam estar publicadas (firebase deploy --only functions).

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  inMemoryPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const config = JSON.parse(
  readFileSync(resolve(__dirname, '..', 'firebase-applet-config.json'), 'utf8'),
);

const [command, adminEmail, adminPassword, role, targetEmail] = process.argv.slice(2);

const USAGE = `Uso:
  npm run provision -- bootstrap <email> <senha>
  npm run provision -- set-role <adminEmail> <adminSenha> <leader|admin|null> <alvo@email.com>`;

if (!command || !adminEmail || !adminPassword) {
  console.error(USAGE);
  process.exit(1);
}

const REGION = 'us-central1';
const functionUrl = (name) =>
  `https://${REGION}-${config.projectId}.cloudfunctions.net/${name}`;

async function callCallable(name, data, idToken) {
  const response = await fetch(functionUrl(name), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ data }),
  });
  const body = await response.json();
  if (!response.ok) {
    const message = body?.error?.message || `${response.status} ${response.statusText}`;
    throw new Error(`Função ${name} falhou: ${message}`);
  }
  return body.result;
}

async function main() {
  const app = initializeApp({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    appId: config.appId,
  });
  const auth = initializeAuth(app, { persistence: inMemoryPersistence });

  const credential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
  const idToken = await credential.user.getIdToken();

  try {
    if (command === 'bootstrap') {
      const result = await callCallable('bootstrapFirstAdmin', {}, idToken);
      console.log(`Admin provisionado: ${result.email} (role=${result.role})`);
    } else if (command === 'set-role') {
      if (!role || !targetEmail) {
        throw new Error('set-role exige: <role> <alvo@email.com>');
      }
      const normalizedRole = role === 'null' ? null : role;
      const result = await callCallable('setUserRole', { email: targetEmail, role: normalizedRole }, idToken);
      console.log(`Role atualizada: ${result.email} (role=${result.role ?? 'sem role'})`);
    } else {
      throw new Error(`Comando desconhecido: ${command}`);
    }
  } finally {
    await signOut(auth);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});