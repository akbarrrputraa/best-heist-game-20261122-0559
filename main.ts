// GILDED HEIST — The Meridian Vault: make.fun best-heist-game-20261122-0559 entry program.
//
// Runs on Node 22 with the standard library only. It copies the playable game
// (game/) and its screenshots (screenshots/) into the output directory and
// writes /output/dossier.json.
//
// The dossier normally comes from the kit's vendored library
// (vendor/makefun-game.ts, buildDossier): when that file is present it is
// used, so the dossier is byte for byte what the scorer writes. When it is
// absent — this repository is built without it, on purpose — a small built-in
// writer stands in: it writes the same schema (makefun/dossier/v1) with the
// same Game block, sources and screenshots, so the program still runs to
// exit 0 and the hand-in can be checked end to end. The stand-in dossier is
// NOT byte-identical to buildDossier's, so before submitting, add the
// kit's vendor/makefun-game.ts unchanged, re-run this program, and confirm
// the log line says the vendored library was used.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// ---------------------------------------------------------------- fallback dossier
//
// A compact, independent writer in the dossier's own shape. It is only a
// stand-in for local runs while vendor/makefun-game.ts is absent; the
// submitted dossier must come from the vendored library (see the header).

const SOURCE_EXTS = new Set(['html', 'js', 'mjs', 'css', 'glsl', 'vert', 'frag', 'wgsl', 'json']);

function isSourceFile(rel: string): boolean {
  const segs = rel.split('/');
  if (segs.slice(0, -1).includes('vendor')) return false;
  const base = segs[segs.length - 1] ?? '';
  if (/\.min\.(?:js|mjs|css)$/i.test(base)) return false;
  const ext = base.split('.').pop()?.toLowerCase() ?? '';
  return SOURCE_EXTS.has(ext);
}

function walkGame(dir: string, rel = ''): { files: string[]; dirs: number } {
  const files: string[] = [];
  let dirs = 0;
  for (const e of readdirSync(rel === '' ? dir : join(dir, rel), { withFileTypes: true })) {
    const p = rel === '' ? e.name : `${rel}/${e.name}`;
    if (e.isDirectory()) {
      dirs += 1;
      const sub = walkGame(dir, p);
      files.push(...sub.files);
      dirs += sub.dirs;
    } else if (e.isFile()) files.push(p);
  }
  files.sort();
  return { files, dirs };
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v)).join(',')}]`;
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`).join(',')}}`;
  }
  throw new TypeError('canonicalJson: unsupported value');
}

function languageOf(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'js' || ext === 'mjs') return 'js';
  if (ext === 'html') return 'html';
  if (ext === 'css') return 'css';
  if (ext === 'json') return 'json';
  return 'text';
}

// The page's module scripts in load order (a tiny static-import scan),
// then the remaining sources by path — the same order buildDossier uses.
function sourceOrder(sources: string[], indexHtml: string): string[] {
  const order: string[] = ['index.html'];
  const seen = new Set(order);
  const byPath = new Set(sources);
  const importsOf = (text: string): string[] => {
    const found: string[] = [];
    const re = /(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) found.push(m[1] ?? m[2] ?? '');
    return found;
  };
  const resolveRel = (spec: string, from: string): string | null => {
    if (!spec.startsWith('./') && !spec.startsWith('../')) return null;
    const parts = from.split('/').slice(0, -1);
    for (const seg of spec.split('/')) {
      if (seg === '' || seg === '.') continue;
      if (seg === '..') {
        if (parts.length === 0) return null;
        parts.pop();
        continue;
      }
      parts.push(seg);
    }
    return parts.join('/');
  };
  const visit = (path: string): void => {
    if (seen.has(path) || !byPath.has(path)) return;
    seen.add(path);
    order.push(path);
    const text = readFileSync(join(out, 'game', path), 'utf8');
    for (const spec of importsOf(text)) {
      const target = resolveRel(spec, path);
      if (target !== null) visit(target);
    }
  };
  const scriptSrcs = [...indexHtml.matchAll(/<script[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]);
  for (const src of scriptSrcs) {
    const target = resolveRel(src, 'index.html');
    if (target !== null) visit(target);
  }
  for (const p of sources) if (!seen.has(p)) order.push(p);
  return order;
}

function fallbackDossier(dir: string): Uint8Array {
  const gameDir = join(dir, 'game');
  const { files, dirs } = walkGame(gameDir);
  const sources = files.filter(isSourceFile);
  const vendored = files.filter((f) => !isSourceFile(f) && (f.split('/').slice(0, -1).includes('vendor') || /\.min\.(?:js|mjs|css)$/i.test(f)));
  const assets = files.filter((f) => !isSourceFile(f) && !vendored.includes(f));
  const sumBytes = (list: string[]): number => list.reduce((n, f) => n + lstatSync(join(gameDir, f)).size, 0);
  const totalBytes = files.reduce((n, f) => n + lstatSync(join(gameDir, f)).size, 0);
  const indexHtml = readFileSync(join(gameDir, 'index.html'), 'utf8');
  const order = sourceOrder(sources, indexHtml);

  let text = '## Game\n\n';
  text += `Source files: ${sources.length} (${sumBytes(sources)} bytes)\n`;
  text += `Vendored files: ${vendored.length} (${sumBytes(vendored)} bytes)\n`;
  if (vendored.length > 0) text += `  ${vendored.map((f) => `game/${f} (${lstatSync(join(gameDir, f)).size} bytes)`).join(', ')}\n`;
  const byExt = new Map<string, { n: number; bytes: number }>();
  for (const f of assets) {
    const ext = f.split('.').pop()?.toLowerCase() ?? '(none)';
    const at = byExt.get(ext) ?? { n: 0, bytes: 0 };
    at.n++;
    at.bytes += lstatSync(join(gameDir, f)).size;
    byExt.set(ext, at);
  }
  text += `Assets: ${[...byExt].sort().map(([e, a]) => `${e} ${a.n} (${a.bytes} bytes)`).join(', ') || 'none'}\n`;
  text += `Totals: ${files.length + dirs} files and directories (${totalBytes} bytes)\n\n## Sources\n\n`;

  for (const path of order) {
    const bytes = readFileSync(join(gameDir, path));
    const body = new TextDecoder().decode(bytes);
    const lineCount = body === '' ? 0 : (body.match(/\n/g) ?? []).length + (body.endsWith('\n') ? 0 : 1);
    text += `### game/${path} (${lineCount} ${lineCount === 1 ? 'line' : 'lines'}, ${bytes.length} bytes)\n\n`;
    text += `\`\`\`${languageOf(path)}\n${body}${body.endsWith('\n') ? '' : '\n'}\`\`\`\n\n`;
  }
  // The text cap: keep the whole text when it fits (this game's sources are
  // far under it); never silently ship a cut text without saying so.
  if (Buffer.byteLength(text, 'utf8') > CAPS.text_max_bytes) {
    throw new Error(`fallback dossier: text ${Buffer.byteLength(text, 'utf8')} bytes over the ${CAPS.text_max_bytes} cap`);
  }

  const shotNames = readdirSync(join(dir, 'screenshots'), { withFileTypes: true })
    .filter((e) => e.isFile() && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort();
  if (shotNames.length === 0) throw new Error('fallback dossier: screenshots/ holds no image');
  if (shotNames.length > CAPS.screenshots.max) throw new Error(`fallback dossier: ${shotNames.length} screenshots over the ${CAPS.screenshots.max} cap`);
  const images = shotNames.map((name) => {
    const bytes = readFileSync(join(dir, 'screenshots', name));
    if (bytes.length > CAPS.screenshots.max_bytes) throw new Error(`fallback dossier: screenshots/${name} over the byte cap`);
    const mediaType = bytes[0] === 0x89 ? 'image/png' : bytes[0] === 0xff ? 'image/jpeg' : null;
    if (mediaType === null) throw new Error(`fallback dossier: screenshots/${name} is neither PNG nor JPEG`);
    return { name, media_type: mediaType, sha256: createHash('sha256').update(bytes).digest('hex'), base64: bytes.toString('base64') };
  });

  const doc = { schema: 'makefun/dossier/v1', cover: 0, text: text.replace(/\n+$/, '\n'), images };
  return new Uint8Array(Buffer.from(canonicalJson(doc), 'utf8'));
}

// ---------------------------------------------------------------- hand-in

let dossier: Uint8Array;
let usedVendor = false;
const vendorPath = join(here, 'vendor', 'makefun-game.ts');
if (existsSync(vendorPath)) {
  const vendor = await import('./vendor/makefun-game.ts');
  dossier = vendor.buildDossier(out, CAPS);
  usedVendor = true;
} else {
  dossier = fallbackDossier(out);
}

writeFileSync(join(out, 'dossier.json'), dossier);
console.log(
  `GILDED HEIST: wrote ${join(out, 'dossier.json')} (${dossier.length} bytes) via ${usedVendor ? 'vendor/makefun-game.ts (buildDossier)' : 'built-in fallback — vendor/makefun-game.ts MISSING, dossier is a stand-in, add the vendor file and re-run before submitting'}`,
);
