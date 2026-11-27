import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { GENRES } from '../../lib/util';

export async function getStaticPaths() {
  const all = await getCollection('performances');
  return all.map((p) => ({ params: { id: p.id }, props: { p } }));
}

const stamp = (s: string) => s.replace(/[-:]/g, '') + '00';

export const GET: APIRoute = ({ props }) => {
  const d = (props as any).p.data;
  const events = d.sessions.map((s: string, i: number) => {
    const [date, time] = s.split('T');
    const [h, m] = time.split(':').map(Number);
    const end = `${date}T${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return [
      'BEGIN:VEVENT',
      `UID:${(props as any).p.id}-${i}@ccaf.or.kr`,
      `DTSTAMP:${stamp(s)}`,
      `DTSTART;TZID=Asia/Seoul:${stamp(s)}`,
      `DTEND;TZID=Asia/Seoul:${stamp(end)}`,
      `SUMMARY:[춘천공연예술제] ${d.artist} <${d.title}>`,
      `LOCATION:${d.venue}`,
      `DESCRIPTION:${GENRES[d.genre].ko} · 예매 ${d.ticketUrl ?? 'https://bookon.kr/shows'}`,
      'END:VEVENT',
    ].join('\r\n');
  });
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CCAF//KO', ...events, 'END:VCALENDAR'].join('\r\n');
  return new Response(body, { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } });
};
