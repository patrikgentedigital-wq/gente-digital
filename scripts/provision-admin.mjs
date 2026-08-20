#!/usr/bin/env node
// Provisionamento de roles via callables do Gente Digital.
//
// Uso:
//   npm run provision -- bootstrap <email>
//     Promove o próprio usuário (login + e-mail verificado + igual a
//     BOOTSTRAP_ADMIN_EMAIL) a primeiro admin. Falha se já existir admin.
//     A senha é pedida via prompt (não fica no histórico do shell).
//
//   npm run provision -- set-role <adminEmail> <leader|admin|null> <alvo@email.com>
//     Atribui ou remove a role de um usuário existente (exige login de um admin).
//     A senha do admin é pedida via prompt.
//
// As funções precisam estar publicadas (firebase deploy --only functions).

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
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

const [command, emailArg, roleArg, targetEmailArg] = process.argv.slice(2);

const USAGE = `Uso:
  npm run provision -- bootstrap <email>
  npm run provision -- set-role <adminEmail> <leader|admin|null> <alvo@email.com>`;

if (!command || !emailArg) {
  console.error(USAGE);
  process.exit(1);
}

async function promptHidden(question) {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolvePrompt) => {
    readline.question(question, (answer) => {
      readline.close();
      resolvePrompt(answer);
    });
  });
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

  if (command === 'bootstrap') {
    const adminPassword = await promptHidden('Senha: ');
    if (!adminPassword) {
      throw new Error('Senha não informada.');
    }
    const credential = await signInWithEmailAndPassword(auth, emailArg, adminPassword);
    const idToken = await credential.user.getIdToken();

    try {
      const result = await callCallable('bootstrapFirstAdmin', {}, idToken);
      console.log(`Admin provisionado: ${result.email} (role=${result.role})`);
    } finally {
      await signOut(auth);
    }
    return;
  }

  if (command === 'set-role') {
    if (!roleArg || !targetEmailArg) {
      throw new Error('set-role exige: <role> <alvo@email.com>');
    }
    const adminPassword = await promptHidden(`Senha do admin (${emailArg}): `);
    if (!adminPassword) {
      throw new Error('Senha não informada.');
    }
    const credential = await signInWithEmailAndPassword(auth, emailArg, adminPassword);
    const idToken = await credential.user.getIdToken();

    const normalizedRole = roleArg === 'null' ? null : roleArg;
    try {
      const result = await callCallable(
        'setUserRole',
        { email: targetEmailArg, role: normalizedRole },
        idToken,
      );
      console.log(`Role atualizada: ${result.email} (role=${result.role ?? 'sem role'})`);
    } finally {
      await signOut(auth);
    }
    return;
  }

  throw new Error(`Comando desconhecido: ${command}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});