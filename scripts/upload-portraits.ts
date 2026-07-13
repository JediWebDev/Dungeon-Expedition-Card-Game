/**
 * Upload local portrait files into the Cloudflare R2 bucket.
 *
 * Usage:
 *   npx tsx scripts/upload-portraits.ts ./assets/portraits
 *
 * Expected folder layout (mirrors object keys under portraits/):
 *   ./assets/portraits/heroes/warrior/default.webp
 *   ./assets/portraits/heroes/rogue/default.webp
 *   ./assets/portraits/monsters/goblin.webp
 *   ...
 *
 * Requires R2_* env vars in .env (see .env.example).
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { isR2Configured, uploadObject } from '../server/r2';

const CONTENT_TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

async function main() {
  const root = process.argv[2];
  if (!root) {
    console.error('Usage: npx tsx scripts/upload-portraits.ts <portraits-folder>');
    process.exit(1);
  }

  if (!isR2Configured()) {
    console.error(
      'R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME in .env.'
    );
    process.exit(1);
  }

  const absRoot = path.resolve(root);
  if (!fs.existsSync(absRoot) || !fs.statSync(absRoot).isDirectory()) {
    console.error(`Not a directory: ${absRoot}`);
    process.exit(1);
  }

  const files = walk(absRoot).filter((f) => CONTENT_TYPES[path.extname(f).toLowerCase()]);
  if (files.length === 0) {
    console.error('No image files found (.webp, .png, .jpg, .gif, .svg).');
    process.exit(1);
  }

  console.log(`Uploading ${files.length} file(s) from ${absRoot}…`);

  for (const file of files) {
    const rel = path.relative(absRoot, file).split(path.sep).join('/');
    const key = `portraits/${rel}`;
    const ext = path.extname(file).toLowerCase();
    const body = fs.readFileSync(file);
    const { publicUrl } = await uploadObject({
      key,
      body,
      contentType: CONTENT_TYPES[ext] ?? 'application/octet-stream',
    });
    console.log(`  ✓ ${key}${publicUrl ? ` → ${publicUrl}` : ''}`);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
