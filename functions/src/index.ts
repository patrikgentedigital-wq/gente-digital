import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions/logger';
import { defineString } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import {
  parseRoleInput,
  ROLE_ADMIN,
  RoleInputError,
  type RoleInput,
} from './roles';

initializeApp();

const BOOTSTRAP_ADMIN_EMAIL = defineString('BOOTSTRAP_ADMIN_EMAIL', { default: '' });

async function requireAdmin(uid: string) {
  const caller = await getAuth().getUser(uid);
  if (caller.customClaims?.role !== ROLE_ADMIN) {
    throw new HttpsError('permission-denied', 'Apenas um administrador pode executar esta operação.');
  }
  return caller;
}

async function applyRole(uid: string, role: RoleInput['role']) {
  const target = await getAuth().getUser(uid);

  const claims: Record<string, unknown> = { ...target.customClaims };
  if (role === null) {
    delete claims.role;
  } else {
    claims.role = role;
  }

  await getAuth().setCustomUserClaims(target.uid, claims);
  return { uid: target.uid, email: target.email, role: claims.role ?? null };
}

export const setUserRole = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Faça login para executar esta operação.');
  }
  const admin = await requireAdmin(request.auth.uid);

  let input: RoleInput;
  try {
    input = parseRoleInput(request.data);
  } catch (error) {
    if (error instanceof RoleInputError) {
      throw new HttpsError('invalid-argument', error.message);
    }
    throw error;
  }

  const target = await getAuth().getUserByEmail(input.email);
  const result = await applyRole(target.uid, input.role);

  logger.info(
    `setUserRole: role ${input.role ?? '(removida)'} aplicada a ${result.email} por ${admin.email}`,
  );
  return result;
});

export const bootstrapFirstAdmin = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Faça login para executar esta operação.');
  }

  const caller = await getAuth().getUser(request.auth.uid);
  if (!caller.emailVerified) {
    throw new HttpsError('failed-precondition', 'O e-mail da conta precisa estar verificado.');
  }
  if (caller.customClaims?.role === ROLE_ADMIN) {
    throw new HttpsError('already-exists', 'Esta conta já é administradora.');
  }

  const configured = BOOTSTRAP_ADMIN_EMAIL.value().trim().toLowerCase();
  if (!configured) {
    throw new HttpsError('failed-precondition', 'Configure o parâmetro BOOTSTRAP_ADMIN_EMAIL antes do bootstrap.');
  }
  if (!caller.email || caller.email.toLowerCase() !== configured) {
    throw new HttpsError('permission-denied', 'O e-mail da conta não corresponde ao parâmetro BOOTSTRAP_ADMIN_EMAIL.');
  }

  let page = await getAuth().listUsers(1000);
  let hasAdmin = page.users.some((user) => user.customClaims?.role === ROLE_ADMIN);
  while (!hasAdmin && page.pageToken) {
    page = await getAuth().listUsers(1000, page.pageToken);
    hasAdmin = page.users.some((user) => user.customClaims?.role === ROLE_ADMIN);
  }
  if (hasAdmin) {
    throw new HttpsError('already-exists', 'Já existe um administrador provisionado no projeto.');
  }

  const result = await applyRole(caller.uid, ROLE_ADMIN);
  logger.info(`bootstrapFirstAdmin: primeiro admin provisionado (${result.email})`);
  return result;
});

const FIRESTORE_DATABASE_ID = 'ai-studio-gentedigital-cb816dee-4739-4dd8-8612-2cfe4702cf93';

export const onMemberDeleted = onDocumentDeleted(
  { document: 'members/{memberId}', database: FIRESTORE_DATABASE_ID },
  async (event) => {
    const memberId = event.params.memberId;
    const db = getFirestore(FIRESTORE_DATABASE_ID);

  let deletedCount = 0;
  for (;;) {
    const snapshot = await db
      .collection('evaluations')
      .where('memberId', '==', memberId)
      .limit(500)
      .get();
    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deletedCount += snapshot.size;
  }

  logger.info(`onMemberDeleted: ${deletedCount} avaliação(ões) removida(s) para o membro ${memberId}`);
  return { memberId, deletedCount };
});