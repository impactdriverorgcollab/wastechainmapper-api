// Small Overpass API client with retries. Overpass is a shared public service and often answers
// 429, 504 or 500 when busy, so every query backs off and tries again, across several mirrors.
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const UA = 'WasteChainMapper-gazetteer-builder/1.0 (https://github.com/impactdriverorgcollab/wastechainmapper-api)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function overpass(query, { attempts = 8, label = 'query' } = {}) {
  let lastError = 'no attempt made';
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const url = ENDPOINTS[(attempt - 1) % ENDPOINTS.length];
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'User-Agent': UA, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
      });
      if (res.ok) return await res.json();
      lastError = `${new URL(url).host} answered ${res.status}`;
    } catch (e) {
      lastError = `${new URL(url).host}: ${e.message}`;
    }
    const wait = Math.min(60, 5 * attempt);
    console.error(`  ${label}: ${lastError}, retrying in ${wait}s (${attempt}/${attempts})`);
    await sleep(wait * 1000);
  }
  throw new Error(`${label} failed after ${attempts} attempts: ${lastError}`);
}

export { sleep };
