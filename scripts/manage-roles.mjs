import { execSync } from 'node:child_process';

const PROJECT_ID = 'gen-lang-client-0169317507';

function getAccessToken() {
  return execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
}

async function listUsers() {
  const token = getAccessToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    'X-Goog-User-Project': PROJECT_ID,
    'Content-Type': 'application/json',
  };

  const authUrl = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:batchGet?maxResults=50`;
  const res = await fetch(authUrl, { headers });
  const data = await res.json();
  if (!res.ok) {
    console.error('Erro:', data);
    return;
  }
  console.log(`\n👥 Usuários cadastrados no Firebase Auth:`);
  const users = data.users || [];
  if (users.length === 0) {
    console.log('Nenhum usuário cadastrado ainda.');
    return;
  }
  for (const u of users) {
    const claims = u.customAttributes ? JSON.parse(u.customAttributes) : {};
    console.log(`• E-mail: ${u.email} | UID: ${u.localId} | Verificado: ${u.emailVerified ? 'Sim' : 'Não'} | Role: [${claims.role || 'nenhuma'}]`);
  }
}

async function setRole(email, role) {
  const token = getAccessToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    'X-Goog-User-Project': PROJECT_ID,
    'Content-Type': 'application/json',
  };

  // 1. Get user by email
  const getUrl = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup`;
  const lookupRes = await fetch(getUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: [email] }),
  });
  const lookupData = await lookupRes.json();
  const user = lookupData.users?.[0];
  if (!user) {
    console.error(`❌ Usuário com e-mail "${email}" não foi encontrado no Firebase Auth.`);
    return;
  }

  // 2. Set custom claims
  const updateUrl = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:update`;
  const customAttributes = role && role !== 'null' ? JSON.stringify({ role }) : '{}';
  const updateRes = await fetch(updateUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      localId: user.localId,
      customAttributes,
    }),
  });
  const updateData = await updateRes.json();
  if (!updateRes.ok) {
    console.error('Erro ao atualizar role:', updateData);
    return;
  }

  console.log(`\n✅ Sucesso!`);
  console.log(`- E-mail: ${email}`);
  console.log(`- Role atribuída: ${role}`);
}

async function createUser(email, password, role) {
  const token = getAccessToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    'X-Goog-User-Project': PROJECT_ID,
    'Content-Type': 'application/json',
  };

  const createUrl = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts`;
  const customAttributes = role && role !== 'null' ? JSON.stringify({ role }) : '{}';

  const res = await fetch(createUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email,
      password,
      customAttributes,
    }),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error('❌ Resposta inesperada da API:', text);
    return;
  }

  if (!res.ok) {
    console.error('❌ Erro ao criar usuário:', data?.error?.message || data);
    return;
  }

  console.log(`\n🎉 Usuário criado com sucesso!`);
  console.log(`- E-mail: ${email}`);
  console.log(`- UID: ${data.localId}`);

  if (role && role !== 'null') {
    await setRole(email, role);
  }

  console.log(`\nAgora você já pode iniciar a aplicação (npm run dev) e fazer login!`);
}

const args = process.argv.slice(2);
const command = args[0];

const VALID_ROLES = ['admin', 'leader', 'null'];

if (command === 'create-user' && args[1] && args[2]) {
  const role = args[3];
  if (!role || !VALID_ROLES.includes(role)) {
    console.error('❌ Role obrigatória para create-user: admin, leader ou null.');
    console.log(`Uso: node scripts/manage-roles.mjs create-user <email> <senha> <admin|leader|null>`);
    process.exitCode = 1;
  } else {
    await createUser(args[1], args[2], role);
  }
} else if (command === 'set-role' && args[1] && args[2]) {
  await setRole(args[1], args[2]);
} else if (command === 'list' || !command) {
  await listUsers();
} else {
  console.log(`\nUso do utilitário:`);
  console.log(`  node scripts/manage-roles.mjs list`);
  console.log(`  node scripts/manage-roles.mjs create-user <email> <senha> <admin|leader|null>`);
  console.log(`  node scripts/manage-roles.mjs set-role <email> <admin|leader|null>`);
}
