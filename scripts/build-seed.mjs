// Gera supabase/seed/0001_seed.sql a partir de scripts/seed-data.json e das 31 perguntas padrão do app.
// Uso: node scripts/build-seed.mjs
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const data = JSON.parse(readFileSync('scripts/seed-data.json', 'utf-8'));

// As perguntas padrão vêm de src/data/catalogData.ts (mesma fonte do app).
const outfile = join(tmpdir(), 'catalog-for-seed.mjs');
await build({ entryPoints: ['src/data/catalogData.ts'], bundle: true, platform: 'node', format: 'esm', outfile, logLevel: 'error' });
const { DEFAULT_CRITERIA_CATEGORIES } = await import(pathToFileURL(outfile).href);
const itemCount = DEFAULT_CRITERIA_CATEGORIES.reduce((total, category) => total + category.items.length, 0);
const maxScore = itemCount * 5;

const q = (text) => `'${String(text).replaceAll("'", "''")}'`;
const activeTeams = data.teams.filter((team) => team.active);
const firstTeam = activeTeams[0].id;

const lines = [];
lines.push('-- Seed gerado por scripts/build-seed.mjs. Não edite à mão.');
lines.push('insert into public.teams (id, name, color, active) values');
lines.push(data.teams.map((team) => `  (${q(team.id)}, ${q(team.id)}, ${q(team.color)}, ${team.active})`).join(',\n') + ';');
lines.push('');
lines.push('-- Perguntas padrão como versão 1 de cada equipe ativa (a primeira recebe o texto; as outras copiam dela).');
lines.push('insert into public.criteria_sets (team_id, version, categories, max_score) values');
lines.push(`  (${q(firstTeam)}, 1, $json$${JSON.stringify(DEFAULT_CRITERIA_CATEGORIES)}$json$::jsonb, ${maxScore});`);
lines.push('insert into public.criteria_sets (team_id, version, categories, max_score)');
lines.push(`select t.id, 1, c.categories, c.max_score from public.teams t, public.criteria_sets c`);
lines.push(`where t.active and t.id <> ${q(firstTeam)} and c.team_id = ${q(firstTeam)} and c.version = 1;`);
lines.push('');
lines.push('insert into public.members (id, name, job_title, team_id) values');
lines.push(data.members.map((m) => `  (${q(m.id)}, ${q(m.name)}, ${q(m.job)}, ${q(m.team)})`).join(',\n') + ';');
const archived = data.members.filter((m) => m.archived).map((m) => q(m.id));
if (archived.length > 0) {
  lines.push(`update public.members set deleted_at = now(), deleted_by = 'migracao' where id in (${archived.join(', ')});`);
}

mkdirSync('supabase/seed', { recursive: true });
writeFileSync('supabase/seed/0001_seed.sql', lines.join('\n') + '\n', 'utf-8');
console.log(`ok: ${data.teams.length} equipes, ${activeTeams.length} com perguntas (${itemCount} perguntas, máximo ${maxScore}), ${data.members.length} membros`);
