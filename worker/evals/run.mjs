import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

const endpoint = process.env.MIRECIBO_ENDPOINT?.replace(/\/$/, '');
const token = process.env.MIRECIBO_ACCESS_TOKEN;
const installId = process.env.MIRECIBO_INSTALL_ID || crypto.randomUUID();
const imagePaths = process.argv.slice(2);

if (!endpoint || imagePaths.length !== 2) {
  console.error('Uso: MIRECIBO_ENDPOINT=... node worker/evals/run.mjs <ticket-combustible> <ticket-compra>');
  process.exit(2);
}

const cases = JSON.parse(await readFile(new URL('./ground-truth.json', import.meta.url), 'utf8'));
const normalize = value => String(value ?? '').toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const close = (actual, expected, tolerance = 0.011) => typeof actual === 'number' && Math.abs(actual - expected) <= tolerance;
const mime = path => ({ '.png': 'image/png', '.webp': 'image/webp' }[extname(path).toLowerCase()] ?? 'image/jpeg');
const nameMatches = (actual, expected) => {
  const actualText = normalize(actual);
  const expectedText = normalize(expected);
  if (actualText.includes(expectedText) || expectedText.includes(actualText)) return true;
  const wanted = expectedText.split(' ').filter(token => token.length >= 2 && !/^\d+$/.test(token));
  if (!wanted.length) return false;
  const found = actualText.split(' ');
  const matches = wanted.filter(token => found.some(value => value === token || (Math.min(value.length, token.length) >= 4 && (value.startsWith(token) || token.startsWith(value)))));
  return matches.length / wanted.length >= 0.6;
};

async function analyze(path, requestedKind) {
  const imageBase64 = (await readFile(path)).toString('base64');
  const response = await fetch(`${endpoint}/v1/receipts/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : { 'X-Install-Id': installId })
    },
    body: JSON.stringify({ imageBase64, mimeType: mime(path), requestedKind })
  });
  const payload = await response.json();
  if (!response.ok || !payload.data) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload.data;
}

function checkCase(testCase, actual) {
  const expected = testCase.expected;
  const failures = [];
  const check = (condition, message) => { if (!condition) failures.push(message); };
  check(actual.kind === expected.kind, `kind: ${actual.kind}`);
  check(normalize(actual.merchant?.name).includes(normalize(expected.merchantContains)), `merchant: ${actual.merchant?.name}`);
  check(actual.transaction?.date === expected.date, `date: ${actual.transaction?.date}`);
  check(actual.transaction?.time === expected.time, `time: ${actual.transaction?.time}`);
  check(close(actual.transaction?.total, expected.total), `total: ${actual.transaction?.total}`);
  check(close(actual.transaction?.tax, expected.tax), `tax: ${actual.transaction?.tax}`);
  if (typeof expected.itemCount === 'number') check(actual.items?.length === expected.itemCount, `itemCount: ${actual.items?.length}`);
  if (expected.itemCountRange) check(actual.items?.length >= expected.itemCountRange[0] && actual.items?.length <= expected.itemCountRange[1], `itemCount: ${actual.items?.length}`);
  if (expected.fuel) {
    check(normalize(actual.fuel?.fuelType).includes(normalize(expected.fuel.fuelTypeContains)), `fuelType: ${actual.fuel?.fuelType}`);
    check(close(actual.fuel?.liters, expected.fuel.liters), `liters: ${actual.fuel?.liters}`);
    check(close(actual.fuel?.pricePerLiter, expected.fuel.pricePerLiter, 0.0011), `pricePerLiter: ${actual.fuel?.pricePerLiter}`);
  }
  for (const landmark of expected.landmarkItems ?? []) {
    const item = actual.items.find(value => nameMatches(value.name, landmark.nameContains));
    check(Boolean(item), `missing item: ${landmark.nameContains}`);
    if (!item) continue;
    check(close(item.quantity, landmark.quantity, 0.0011), `${landmark.nameContains} quantity: ${item.quantity}`);
    check(close(item.unitPrice, landmark.unitPrice, 0.0011), `${landmark.nameContains} unitPrice: ${item.unitPrice}`);
    check(close(item.total, landmark.total), `${landmark.nameContains} total: ${item.total}`);
    if (landmark.unit) check(normalize(item.unit).includes(normalize(landmark.unit)), `${landmark.nameContains} unit: ${item.unit}`);
  }
  for (const expectedName of expected.expectedItemNames ?? []) {
    check(actual.items.some(value => nameMatches(value.name, expectedName)), `missing item name: ${expectedName}`);
  }
  for (const forbidden of expected.forbiddenItemNames ?? []) {
    check(!actual.items.some(value => normalize(value.name) === normalize(forbidden)), `forbidden item: ${forbidden}`);
  }
  return failures;
}

let failed = false;
for (let index = 0; index < cases.length; index += 1) {
  const testCase = cases[index];
  try {
    const actual = await analyze(imagePaths[index], testCase.requestedKind);
    const failures = checkCase(testCase, actual);
    if (failures.length) {
      failed = true;
      console.error(`FAIL ${testCase.id}\n- ${failures.join('\n- ')}`);
    } else console.log(`PASS ${testCase.id}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${testCase.id}: ${error.message}`);
  }
}
process.exitCode = failed ? 1 : 0;
