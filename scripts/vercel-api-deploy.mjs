/**
 * Vercel REST API deployment — takım kapsamlı token ile doğrudan deploy
 * Kullanım: node scripts/vercel-api-deploy.mjs <TOKEN>
 */
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const TOKEN = process.argv[2];
if (!TOKEN) { console.error('Kullanım: node vercel-api-deploy.mjs <TOKEN>'); process.exit(1); }
const TEAM = 'hakans-projects-2ef29a32';
const PROJECT_ID = 'prj_8W2hiUzE2qEnHwAdGaihHSGhwy2s';
const ROOT = '/home/z/my-project';
const API = 'https://api.vercel.com';

const headers = { Authorization: `Bearer ${TOKEN}` };

async function api(pathname, opts = {}) {
  const sep = pathname.includes('?') ? '&' : '?';
  const res = await fetch(`${API}${pathname}${sep}teamId=${TEAM}`, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(json).slice(0, 300)}`);
  return json;
}

// 1) Takip edilen dosyaları topla
console.log('[1/4] Dosya listesi alınıyor (git ls-files)...');
const files = execSync('git ls-files -z', { cwd: ROOT, maxBuffer: 10 * 1024 * 1024 })
  .toString().split('\0').filter(Boolean);
console.log(`      ${files.length} dosya bulundu`);

// 2) sha1 hesapla ve içerikleri yükle
console.log('[2/4] Dosyalar yükleniyor...');
const fileList = [];
let uploaded = 0, skipped = 0;
for (const rel of files) {
  const abs = path.join(ROOT, rel);
  let buf;
  try { buf = fs.readFileSync(abs); } catch { continue; }
  const sha = crypto.createHash('sha1').update(buf).digest('hex');
  fileList.push({ file: rel, sha, buf });
}
// paralel yükleme (5'li gruplar)
for (let i = 0; i < fileList.length; i += 5) {
  const batch = fileList.slice(i, i + 5);
  await Promise.all(batch.map(async (f) => {
    const res = await fetch(`${API}/v2/files?teamId=${TEAM}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/octet-stream', 'x-vercel-digest': f.sha },
      body: f.buf,
    });
    const j = await res.json().catch(() => ({}));
    const url = j?.urls?.[f.sha];
    if (url) {
      const put = await fetch(url, { method: 'PUT', body: f.buf });
      if (!put.ok) throw new Error(`PUT başarısız ${f.file}: ${put.status}`);
      uploaded++;
    } else { skipped++; }
  }));
  if ((i / 5) % 8 === 0) console.log(`      ${Math.min(i + 5, fileList.length)}/${fileList.length}`);
}
console.log(`      yüklendi: ${uploaded}, sunucuda zaten var: ${skipped}`);

// 3) Deployment oluştur
console.log('[3/4] Production deployment oluşturuluyor...');
const deploy = await api('/v13/deployments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'benimicinyap',
    project: PROJECT_ID,
    target: 'production',
    files: fileList.map(({ file, sha }) => ({ file, sha })),
    projectSettings: { framework: 'nextjs' },
  }),
});
console.log(`      deployment uid: ${deploy.uid} | url: ${deploy.url}`);

// 4) Durumu yokla
console.log('[4/4] Build tamamlanıyor (2-6 dk)...');
const deadline = Date.now() + 8 * 60 * 1000;
let state = 'QUEUED', ready;
while (Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 15000));
  const d = await api(`/v13/deployments/${deploy.uid}`);
  state = d.readyState || d.state;
  console.log(`      durum: ${state} (${new Date().toLocaleTimeString('tr-TR')})`);
  if (state === 'READY') { ready = d; break; }
  if (state === 'ERROR' || state === 'CANCELED') {
    // build loglarını çek
    try {
      const ev = await api(`/v2/deployments/${deploy.uid}/events?limit=100`);
      const logs = (ev || []).filter((e) => e.type === 'stdout' || e.type === 'stderr')
        .map((e) => e.text || e.payload?.text).filter(Boolean).slice(-40);
      console.error('--- BUILD LOGLARI (son satırlar) ---');
      logs.forEach((l) => console.error(l));
    } catch (e) { console.error('Loglar alınamadı:', e.message); }
    throw new Error(`Deployment ${state}`);
  }
}
if (!ready) throw new Error('Timeout: 8 dk içinde tamamlanmadı');
console.log('\n=== DEPLOY BAŞARILI ===');
console.log('URL:', ready.url);
console.log('Aliaslar:', JSON.stringify(ready.alias || [], null, 0));
