// Publica o build em docs/ (GitHub Pages) e remove bundles antigos.
// Uso: npm run build && node scripts/publish-docs.mjs   (copia dist -> docs)
//      node scripts/publish-docs.mjs --prune-only       (só apaga assets não usados pelo docs/index.html)
import {cp, readdir, readFile, rm} from 'node:fs/promises';

const pruneOnly = process.argv.includes('--prune-only');

if (!pruneOnly) {
  await rm('docs/assets', {recursive: true, force: true});
  await cp('dist', 'docs', {recursive: true});
}

const html = await readFile('docs/index.html', 'utf8');
const used = new Set([...html.matchAll(/assets\/([^"']+)/g)].map((match) => match[1]));
let removed = 0;
for (const file of await readdir('docs/assets')) {
  if (!used.has(file)) {
    await rm(`docs/assets/${file}`);
    removed++;
  }
}
console.log(`docs/assets: ${used.size} arquivo(s) em uso, ${removed} removido(s).`);
