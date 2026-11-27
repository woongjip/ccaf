// 기존 QUV CDN 이미지를 public/images 로 한 번에 내려받는 스크립트.
// 사용법: npm run migrate-images   (인터넷 연결 필요, 이미 받은 파일은 건너뜀)
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';

const roots = ['src'];
const files = [];
const walk = (d) => readdirSync(d).forEach((f) => { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : /\.(md|json|astro|ts)$/.test(f) && files.push(p); });
roots.forEach(walk);

const refs = new Set();
for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(/\/images\/((?:board\/)?[0-9a-f]{13}[^"')\s\]]*\.(?:jpe?g|png|gif|webp))/gi)) refs.add(m[1]);

let ok = 0, skip = 0, fail = 0;
for (const r of refs) {
  const out = join('public/images', r);
  if (existsSync(out)) { skip++; continue; }
  const url = r.startsWith('board/') ? `https://cdn.quv.kr/k98f4jpyd/board/image/${r.slice(6)}` : `https://cdn.quv.kr/k98f4jpyd/up/${r}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, Buffer.from(await res.arrayBuffer()));
    ok++; console.log('✓', r);
  } catch (e) { fail++; console.log('✗', r, e.message); }
}
console.log(`\n완료: 새로 받음 ${ok}, 이미 있음 ${skip}, 실패 ${fail} (총 ${refs.size})`);
