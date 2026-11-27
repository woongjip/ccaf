// 기존 QUV 사이트의 '지난 축제' 연도별 상세 페이지와 전체 페이지 목록을 가져오는 1회용 스크립트 (GitHub Actions에서 실행)
import { parse } from 'node-html-parser';
import sharp from 'sharp';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';

const BASE = 'https://ccaf.or.kr';
const CDN = 'https://cdn.quv.kr/k98f4jpyd';
const get = async (u) => { const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0' } }); if (!r.ok) throw new Error(r.status + ' ' + u); return r; };
const clean = (html) => html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h\d|tr)>/gi, '\n').replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  .split('\n').map((s) => s.trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
const imgRe = /cdn\.quv\.kr\/k98f4jpyd(?:\/|%2F)(?:up|board(?:\/|%2F)image)(?:\/|%2F)([0-9a-f]{13})_(?:800|1920)\.(jpe?g|png|gif|webp)/gi;
const SKIP = new Set(['61de6267c8d10', '61de62888fe61', '6209f2c7424cc', '61e0d167a1c34']); // 로고·공통 헤더 이미지

// 1) 지난 축제 목록: 포스터 순서와 연결 페이지
const histHtml = await (await get(BASE + '/history')).text();
const hist = parse(histHtml);
const items = hist.querySelectorAll('a[onclick*=viewGallery]').map((a) => ({
  link: a.getAttribute('data-link') || '',
  title: clean(a.querySelector('.gallery-board-caption-title')?.innerHTML || ''),
  desc: clean(a.querySelector('.gallery-board-caption-description')?.innerHTML || ''),
  poster: [...a.innerHTML.matchAll(imgRe)].map((m) => m[1] + '.' + m[2])[0] || '',
})).filter((x) => x.title);

const pageIds = [...new Set([...histHtml.matchAll(/["'](\/\d{1,4})["']/g)].map((m) => m[1]))];
// data-link 가 비어 있으면, 후보 페이지를 열어 제목으로 연결
const candidates = {};
for (const id of pageIds) {
  try { const h = await (await get(BASE + id)).text(); candidates[id] = clean((parse(h).querySelector('#doz_body') || parse(h)).innerHTML).slice(0, 4000); } catch {}
}
for (const it of items) {
  if (/\/\d+/.test(it.link)) continue;
  const hit = Object.entries(candidates).find(([, t]) => t.includes(it.title));
  if (hit) it.link = hit[0];
}
const years = [];
const images = new Map(); // id.ext → { kind }
for (const it of items) {
  const path = it.link.replace(BASE, '').split('?')[0];
  if (!/^\/\d+$/.test(path)) { years.push({ ...it, path: '', missing: true }); continue; }
  const html = await (await get(BASE + path)).text();
  const d = parse(html);
  const tabs = d.querySelectorAll('.tab-pane').map((p) => {
    const a = d.querySelector(`a[href="#${p.id}"]`);
    const links = p.querySelectorAll('a').map((x) => ({ text: clean(x.innerHTML), href: x.getAttribute('href') || '' })).filter((x) => x.href && !x.href.startsWith('#'));
    return { label: a ? clean(a.innerHTML) : '', text: clean(p.innerHTML), links };
  });
  const gallery = d.querySelectorAll('a[onclick*=viewGallery]').map((a) => {
    const m = [...a.innerHTML.matchAll(imgRe)][0];
    return { img: m ? m[1] + '.' + m[2] : '', title: clean(a.querySelector('.gallery-board-caption-title')?.innerHTML || ''), desc: clean(a.querySelector('.gallery-board-caption-description')?.innerHTML || '') };
  }).filter((g) => g.img);
  const galIds = new Set(gallery.map((g) => g.img));
  const other = [...new Set([...html.matchAll(imgRe)].map((m) => m[1] + '.' + m[2]))].filter((x) => !SKIP.has(x.split('.')[0]) && !galIds.has(x));
  gallery.forEach((g) => images.set(g.img, 1)); other.forEach((x) => images.set(x, 1)); if (it.poster) images.set(it.poster, 1);
  years.push({ ...it, path, tabs, gallery, otherImages: other });
  console.log('✓', path, it.title, 'gallery', gallery.length);
}

// 2) 사이트 전체 페이지 목록(대조용): 메뉴 링크 + 각 페이지 본문 길이·이미지
const home = await (await get(BASE + '/')).text();
const links = [...new Set([...home.matchAll(/href=["'](\/[a-zA-Z0-9_-]*)["']/g)].map((m) => m[1]))].filter((p) => !/^\/(admin|login|join|mypage|logout)/.test(p));
const audit = [];
for (const p of links) {
  try {
    const h = await (await get(BASE + p)).text(); const dd = parse(h);
    const body = dd.querySelector('#doz_body') || dd.querySelector('body');
    audit.push({ path: p, textLength: clean(body?.innerHTML || '').length, images: [...new Set([...h.matchAll(imgRe)].map((m) => m[1]))].filter((x) => !SKIP.has(x)).length, text: clean(body?.innerHTML || '').slice(0, 6000) });
  } catch (e) { audit.push({ path: p, error: e.message }); }
}

mkdirSync('migration', { recursive: true });
writeFileSync('migration/history.json', JSON.stringify({ items: items.length, years }, null, 1));
writeFileSync('migration/site-audit.json', JSON.stringify(audit, null, 1));

// 3) 이미지: 1920 원본을 받아 긴 변 1600px, 품질 80으로 줄여 저장 (없으면 800)
mkdirSync('public/images/archive', { recursive: true });
let ok = 0, fail = 0;
for (const key of images.keys()) {
  const [id] = key.split('.');
  const out = `public/images/archive/${id}.jpg`;
  if (existsSync(out)) continue;
  const ext = key.split('.')[1];
  let buf;
  for (const size of ['1920', '800']) {
    try { buf = Buffer.from(await (await get(`${CDN}/up/${id}_${size}.${ext}`)).arrayBuffer()); break; } catch {}
  }
  if (!buf) { fail++; console.log('✗', key); continue; }
  await sharp(buf).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).flatten({ background: '#ffffff' }).jpeg({ quality: 80, mozjpeg: true }).toFile(out);
  ok++;
}
console.log(`years ${years.length}, images ok ${ok}, fail ${fail}`);
