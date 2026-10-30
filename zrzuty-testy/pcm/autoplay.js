const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const res = [];
  for (const [w, h] of [[375, 600], [1280, 720]]) {
    const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
    await p.goto('http://localhost:8765/'); await p.waitForSelector('#pcm-s1 svg.wyk path', { state: 'attached', timeout: 8000 }).catch(() => {});
    for (const s of ['#pcm-s1', '#pcm-s2', '#pcm-s3']) {
      await p.evaluate(s => document.querySelector(s).scrollIntoView({ block: 'center' }), s);
      await p.waitForTimeout(2600);
      res.push({ w, h, s, krok: +(await p.locator(s + ' input[type=range]').inputValue()), wysokosc: await p.evaluate(s => Math.round(document.querySelector(s).getBoundingClientRect().height), s) });
    }
  }
  console.log(JSON.stringify(res)); await b.close();
})();
