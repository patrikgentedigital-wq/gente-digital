import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Backfill: adds `deleted: false` to every member document created before
// soft-delete existed. Required BEFORE deploying the app version that filters
// the members query with `where('deleted', '==', false)` — otherwise legacy
// documents (without the field) would disappear from the leaderboard.
//
// Usage (in the functions/ directory):
//   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json node scripts/backfill-members-deleted.mjs
// or:
//   FIREBASE_SERVICE_ACCOUNT_PATH=path/to/service-account.json node scripts/backfill-members-deleted.mjs
//   (override database with FIRESTORE_DATABASE_ID)

const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;
const databaseId = process.env.FIRESTORE_DATABASE_ID || 'ai-studio-gentedigital-cb816dee-4739-4dd8-8612-2cfe4702cf93';

if (!projectId) {
  console.error('Faltando GOOGLE_CLOUD_PROJECT (ou FIREBASE_PROJECT_ID).');
  process.exit(1);
}

const credentialsPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
const app = initializeApp(
  credentialsPath
    ? { projectId, credential: cert(credentialsPath), databaseId }
    : { projectId, credential: applicationDefault(), databaseId },
);

const db = getFirestore(app, databaseId);

async function main() {
  const membersRef = db.collection('members');
  const snapshot = await membersRef.get();
  let updated = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.deleted === false || data.deleted === true) {
      skipped += 1;
      continue;
    }
    await doc.ref.update({ deleted: false, updatedAt: new Date() });
    updated += 1;
    console.log(`membro ${doc.id} atualizado com deleted:false`);
  }

  console.log(`\nBackfill concluído: ${updated} atualizados, ${skipped} já possuíam o campo.`);
}

main().catch((error) => {
  console.error('Backfill falhou:', error);
  process.exit(1);
});