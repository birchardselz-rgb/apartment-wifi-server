const baseUrl = (process.env.BASE_URL || 'http://127.0.0.1:3456').replace(/\/$/, '');

const checks = [
  { name: 'guanli home', path: '/guanli/' },
  { name: 'guanli login', path: '/guanli/login/' },
  { name: 'data api', path: '/api/data' },
];

async function check({ name, path }) {
  const url = `${baseUrl}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const body = await response.text();
    const passed = response.ok && body.length > 0;
    console.log(`${passed ? 'PASS' : 'FAIL'} ${name}: ${response.status} ${url}`);
    if (!passed) {
      console.error(`Response body was empty or not successful for ${url}`);
    }
    return passed;
  } catch (error) {
    console.error(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)} ${url}`);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

const results = [];
for (const checkDefinition of checks) {
  results.push(await check(checkDefinition));
}

if (results.every(Boolean)) {
  console.log(`All ${results.length} guanli checks passed.`);
  process.exit(0);
}

console.error(`${results.filter(Boolean).length}/${results.length} guanli checks passed.`);
process.exit(1);
