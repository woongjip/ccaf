# migration/history.json → src/content/festivals/*.md (1회용 변환)
import json, re, os
d = json.load(open('migration/history.json'))
years = d['years']
# 2020: 목록 항목(포스터 있음)과 페이지(/25)를 합침
byTitle = {}
for y in years:
    if y.get('missing'):
        continue
    byTitle[y['path']] = y
items_missing = [y for y in years if y.get('missing')]
def slug_of(y):
    t = y['title']; yr = int(t[:4])
    if '음악축제' in t: return '2023-music', yr
    return str(yr), yr
def q(s): return json.dumps(s, ensure_ascii=False)
def front_get(path):
    if not os.path.exists(path): return {}, ''
    s = open(path).read()
    m = re.match(r'^---\n(.*?)\n---\n?(.*)$', s, re.S)
    fm = {}
    for line in m.group(1).split('\n'):
        k, _, v = line.partition(':')
        if k.strip(): fm[k.strip()] = v.strip()
    return fm, m.group(2)
SNS = re.compile(r'naver|instagram|facebook|youtube|kakao', re.I)
out = []
for y in years:
    if y.get('missing'): continue
    slug, yr = slug_of(y)
    path = f'src/content/festivals/{slug}.md'
    fm, _ = front_get(path)
    tabs = {t['label']: t for t in y['tabs']}
    ov = tabs.get('축제 개요', {}).get('text', '')
    pr = tabs.get('축제 프로그램', {}).get('text', '')
    cr = tabs.get('만든 사람들', {}).get('text', '')
    links = [l for t in y['tabs'] for l in t['links']]
    venue = ''
    m = re.search(r'^장소\s*:\s*(.+)$', ov, re.M)
    if m: venue = m.group(1).strip()
    tagline = ov.split('\n')[0].strip() if ov else ''
    if len(tagline) > 40 or tagline.startswith('20') or '축제' in tagline and len(tagline) > 30: tagline = ''
    # 프로그램 탭: 프로그램북 링크 문구는 버튼으로 대체
    pr_lines = [l for l in pr.split('\n') if l.strip() not in ('프로그램북 보기', 'ENG Program Book', '리플렛 보기')]
    pr = '\n'.join(pr_lines).strip()
    ov_lines = [l for l in ov.split('\n') if l.strip() not in ('리플렛 보기',)]
    body = '\n'.join(ov_lines).strip()
    # 링크
    pb = fm.get('programBook', '').strip('"'); pbe = fm.get('programBookEn', '').strip('"')
    extra = []
    for l in links:
        h, t = l['href'], l['text'].strip()
        if SNS.search(h) or not h.startswith('http'): continue
        if '프로그램북' in t and 'ENG' not in t:
            if not pb: pb = h
        elif 'ENG' in t:
            if not pbe: pbe = h
        else:
            extra.append({'label': t or '자료 보기', 'url': h})
    # 사진
    gal = []
    for g in y['gallery']:
        parts = [p.strip() for p in g['desc'].split('\n') if p.strip()]
        credit = ''
        if parts and re.match(r'(?i)photo\s*by', parts[-1]):
            credit = re.sub(r'(?i)^photo\s*by\s*', '', parts.pop()).strip()
        gal.append({'image': f"/images/archive/{g['img'].split('.')[0]}.jpg", 'title': g['title'], 'artist': ' '.join(parts), 'credit': credit})
    others = y.get('otherImages') or []
    poster_hi = f"/images/archive/{others[0].split('.')[0]}.jpg" if others else ''
    for o in others[1:]:
        gal.append({'image': f"/images/archive/{o.split('.')[0]}.jpg", 'title': '리플렛', 'artist': '', 'credit': ''})
    title = fm.get('title', q(y['title'])).strip('"')
    period = fm.get('period', '""').strip('"')
    poster = fm.get('poster', '').strip('"') or (f"/images/{y['poster'].replace('.', '_800.')}" if y.get('poster') else '')
    sort = fm.get('sort', str(yr))
    lines = ['---', f'year: {yr}', f'sort: {sort}', f'title: {q(title)}', f'period: {q(period)}']
    if poster: lines.append(f'poster: {q(poster)}')
    if poster_hi: lines.append(f'posterLarge: {q(poster_hi)}')
    if pb: lines.append(f'programBook: {q(pb)}')
    if pbe: lines.append(f'programBookEn: {q(pbe)}')
    if tagline: lines.append(f'tagline: {q(tagline)}')
    if venue: lines.append(f'venue: {q(venue)}')
    if extra:
        lines.append('extraLinks:')
        for e in extra: lines.append(f'  - label: {q(e["label"])}\n    url: {q(e["url"])}')
    if pr: lines.append('program: |-\n' + '\n'.join('  ' + l if l else '' for l in pr.split('\n')))
    if cr: lines.append('credits: |-\n' + '\n'.join('  ' + l if l else '' for l in cr.split('\n')))
    if gal:
        lines.append('gallery:')
        for g in gal:
            lines.append(f'  - image: {q(g["image"])}')
            for k in ('title', 'artist', 'credit'):
                if g[k]: lines.append(f'    {k}: {q(g[k])}')
    lines.append(f'source: {q("https://ccaf.or.kr" + y["path"])}')
    lines.append('---')
    paras = [p for p in re.split(r'\n\s*\n', body) if p.strip()]
    md = '\n\n'.join('  \n'.join(p.split('\n')) for p in paras)
    open(path, 'w').write('\n'.join(lines) + '\n\n' + md + '\n')
    out.append((slug, len(gal), bool(pr), bool(cr)))
print(out, len(out))
