// main.ts — Driver kit BENTENG SALJU (akun @climaxku).
// Membersihkan SUBFOLDER output lalu menyalin game/ + screenshots/ dan menulis
// dossier.json via buildDossier. Folder output dibaca dari MAKEFUN_OUTPUT_DIR
// (default /output) — tidak pernah hardcode.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

function cleanSubdir(dir: string): void {
  if (!existsSync(dir)) return;
  // Hapus isi subfolder output, bukan folder output itu sendiri.
  rmSync(dir, { recursive: true, force: true });
}

function main(): void {
  mkdirSync(outDir, { recursive: true });
  const gameOut = join(outDir, 'game');
  const shotsOut = join(outDir, 'screenshots');
  cleanSubdir(gameOut);
  cleanSubdir(shotsOut);
  mkdirSync(gameOut, { recursive: true });
  mkdirSync(shotsOut, { recursive: true });
  cpSync(join(here, 'game'), gameOut, { recursive: true });
  cpSync(join(here, 'screenshots'), shotsOut, { recursive: true });
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  });
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  console.log(`benteng-salju: dossier.json ditulis (${dossier.length} byte) ke ${outDir}`);
}

main();
