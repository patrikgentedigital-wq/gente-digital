#!/usr/bin/env node
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'gen-lang-client-0169317507';
const DATABASE_ID = 'ai-studio-gentedigital-cb816dee-4739-4dd8-8612-2cfe4702cf93';

initializeApp({
  projectId: PROJECT_ID,
});

const auth = getAuth();
const db = getFirestore(DATABASE_ID);

const args = process.argv.slice(2);
const command = args[0];

async function listUsers() {
  console.log(`\n📋 Buscando usuários no Firebase Auth (${PROJECT_ID})...`);
  const result = await auth.listUsers(100);
  if (result.users.length === 0) {
    console.log('Nenhum usuário cadastrado no Firebase Authentication ainda.');
    return;
  }
  console.log(`\nTotal de usuários: ${result.users.length}\n`);
  for (const user of result.users) {
    const role = user.customClaims?.role || 'sem role';
    const verified = user.emailVerified ? '✅ Verificado' : '❌ Não verificado';
    console.log(`• ${user.email} (UID: ${user.uid}) | ${verified} | Role: [${role}]`);
  }
}

async function setRole(email, role) {
  if (!email || !['admin', 'leader', 'null'].includes(role)) {
    console.error('Uso: node admin-manager.mjs set-role <email> <admin|leader|null>');
    process.exit(1);
  }
  const user = await auth.getUserByEmail(email);
  const claims = { ...user.customClaims };
  if (role === 'null') {
    delete claims.role;
  } else {
    claims.role = role;
  }
  await auth.setCustomUserClaims(user.uid, claims);
  console.log(`✅ Sucesso: Role "${role === 'null' ? 'removida' : role}" aplicada para ${user.email}`);
}

async function verifyEmail(email) {
  if (!email) {
    console.error('Uso: node admin-manager.mjs verify-email <email>');
    process.exit(1);
  }
  const user = await auth.getUserByEmail(email);
  await auth.updateUser(user.uid, { emailVerified: true });
  console.log(`✅ Sucesso: E-mail de ${user.email} marcado como VERIFICADO.`);
}

async function createUser(email, password, role = 'admin') {
  if (!email || !password) {
    console.error('Uso: node admin-manager.mjs create-user <email> <senha> [admin|leader]');
    process.exit(1);
  }
  const user = await auth.createUser({
    email,
    password,
    emailVerified: true,
  });
  if (role && role !== 'null') {
    await auth.setCustomUserClaims(user.uid, { role });
  }
  console.log(`✅ Usuário criado com sucesso!`);
  console.log(`- E-mail: ${user.email}`);
  console.log(`- E-mail Verificado: Sim`);
  console.log(`- Role: ${role}`);
}

async function checkFirestore() {
  console.log(`\n🔍 Verificando banco Firestore (${DATABASE_ID})...`);
  const membersSnap = await db.collection('members').get();
  console.log(`- Total de colaboradores cadastrados em "members": ${membersSnap.size}`);
  if (!membersSnap.empty) {
    membersSnap.forEach((doc) => {
      const data = doc.data();
      console.log(`  • ${data.name} (Time: ${data.team}, Score: ${data.score}, Status: ${data.status})`);
    });
  }

  const evalsSnap = await db.collection('evaluations').get();
  console.log(`- Total de avaliações em "evaluations": ${evalsSnap.size}`);
}

async function main() {
  try {
    if (command === 'list-users' || !command) {
      await listUsers();
      await checkFirestore();
    } else if (command === 'set-role') {
      await setRole(args[1], args[2]);
    } else if (command === 'verify-email') {
      await verifyEmail(args[1]);
    } else if (command === 'create-user') {
      await createUser(args[1], args[2], args[3] || 'admin');
    } else if (command === 'check-db') {
      await checkFirestore();
    } else {
      console.log(`Comando desconhecido: ${command}`);
      console.log(`Comandos disponíveis:`);
      console.log(`  node admin-manager.mjs list-users`);
      console.log(`  node admin-manager.mjs create-user <email> <senha> [admin|leader]`);
      console.log(`  node admin-manager.mjs set-role <email> <admin|leader|null>`);
      console.log(`  node admin-manager.mjs verify-email <email>`);
      console.log(`  node admin-manager.mjs check-db`);
    }
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

main();
