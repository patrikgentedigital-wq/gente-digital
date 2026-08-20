import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PORTABLE_JDK = join(
  process.env.LOCALAPPDATA ?? process.env.TEMP ?? '',
  'Temp',
  'opencode',
  'jdk',
);

function findJavaHome() {
  if (process.env.JAVA_HOME) return process.env.JAVA_HOME;
  if (existsSync(PORTABLE_JDK)) {
    const found = readdirSync(PORTABLE_JDK).find((d) => d.startsWith('jdk-'));
    if (found) return join(PORTABLE_JDK, found);
  }
  return null;
}

const javaHome = findJavaHome();
if (!javaHome) {
  console.error(
    'Nenhum JDK encontrado. Defina JAVA_HOME ou instale o JDK 21 (Temurin) portável em ' +
      PORTABLE_JDK +
      '.',
  );
  process.exit(2);
}

const env = { ...process.env, JAVA_HOME: javaHome, PATH: `${join(javaHome, 'bin')};${process.env.PATH ?? ''}` };

const firebaseCli = join(process.cwd(), 'node_modules', '.bin', 'firebase.cmd');
const args = [
  'emulators:exec',
  '--only',
  'firestore',
  '--project',
  'demo-gente-digital',
  'vitest run --config vitest.rules.config.ts --configLoader runner',
];

console.log(`[rules-tests] JAVA_HOME=${javaHome}`);
const result = spawnSync(`"${firebaseCli}"`, args.map((a) => `"${a}"`), {
  env,
  shell: true,
  stdio: 'inherit',
});
process.exit(result.status ?? 1);