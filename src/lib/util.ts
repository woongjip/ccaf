import site from '../data/site.json';

export const GENRES: Record<string, { ko: string; en: string }> = {
  dance: { ko: '무용', en: 'Dance' },
  music: { ko: '음악', en: 'Music' },
  theater: { ko: '연극', en: 'Theater' },
  kids: { ko: '어린이', en: 'Kids' },
  etc: { ko: '기타', en: 'Etc' },
};

const WD = ['일', '월', '화', '수', '목', '금', '토'];

/** "2026-08-11T19:30" → parts (KST, no timezone conversion) */
export function parseSession(s: string) {
  const [d, t = ''] = s.split('T');
  const [y, m, day] = d.split('-').map(Number);
  const wd = WD[new Date(Date.UTC(y, m - 1, day)).getUTCDay()];
  return { date: d, y, m, day, wd, time: t.slice(0, 5) };
}

export function fmtSession(s: string) {
  const p = parseSession(s);
  return `${p.m}.${p.day}. ${p.wd} ${p.time}`;
}

export function fmtDate(d: Date) {
  const k = new Date(d.getTime() + 9 * 3600e3);
  return `${k.getUTCFullYear()}.${String(k.getUTCMonth() + 1).padStart(2, '0')}.${String(k.getUTCDate()).padStart(2, '0')}`;
}

export function slugify(s: string) {
  return s.replace(/\.md$/, '');
}

export { site };
