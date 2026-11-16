// main.ts — the entrypoint. It copies app/ and screenshots/ from this
// repository into the output directory and writes dossier.json there
// with buildDossier from vendor/makefun-frontend.ts.
//
// It runs on Node 22 with the standard library only, in a sandbox with
// no network, a read-only repository and a writable output directory:
//   node main.ts            (output: $MAKEFUN_OUTPUT_DIR, else /output)
// Run it twice and both runs write the same bytes: the copy walks
// directory entries in sorted order and the dossier is computed from
// the output directory's own files, so nothing depends on time,
// randomness or the order the filesystem hands entries back.
import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

// The caps the gate scores with: the dossier text is capped at 160 KiB,
// screenshots at 3 files of 256 KiB, app/ at 993 files and 16 MiB.
const CAPS = {
  text_max_bytes: 163_840,
  screenshots: { max: 3, max_bytes: 262_144 },
  app_max_files: 993,
  app_max_bytes: 16 * 1024 * 1024,
  app_path_max_bytes: 1000,
};

function copyTree(src: string, dest: string): number {
  mkdirSync(dest, { recursive: true });
  let files = 0;
  for (const name of readdirSync(src).sort()) {
    const from = join(src, name);
    const to = join(dest, name);
    cpSync(from, to, { recursive: true, dereference: true });
    files += 1;
  }
  return files;
}

const appDir = join(repoRoot, 'app');
const shotsDir = join(repoRoot, 'screenshots');
if (!existsSync(appDir)) throw new Error('app/ is missing from the repository');
if (!existsSync(shotsDir)) throw new Error('screenshots/ is missing from the repository');

mkdirSync(outDir, { recursive: true });
const appFiles = copyTree(appDir, join(outDir, 'app'));
const shotFiles = copyTree(shotsDir, join(outDir, 'screenshots'));

const dossier = buildDossier(outDir, CAPS);
writeFileSync(join(outDir, 'dossier.json'), dossier);

console.log(
  `wrote ${outDir}: app/ (${appFiles} entries), screenshots/ (${shotFiles} files), dossier.json (${dossier.length} bytes)`,
);
