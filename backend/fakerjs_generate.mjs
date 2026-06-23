import { faker } from '@faker-js/faker';

function getByPath(root, path) {
  return path.split('.').reduce((value, part) => value?.[part], root);
}

function normalizeValue(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
}

export function generateBatch(payload) {
  const { seed, catalog, requests } = payload;
  if (seed !== null && seed !== undefined) {
    faker.seed(Number(seed));
  }

  return requests.map((request) => {
    const entry = catalog[request.key];
    if (!entry) {
      throw new Error(`Unknown FakerJS field key: ${request.key}`);
    }

    const fn = getByPath(faker, entry.path);
    if (typeof fn !== 'function') {
      throw new Error(`FakerJS path is not callable: ${entry.path}`);
    }

    const args = Array.isArray(entry.args) ? entry.args : [];
    return normalizeValue(fn(...args));
  });
}

async function readStdin() {
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }
  return input;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const input = await readStdin();
    const payload = JSON.parse(input);
    process.stdout.write(JSON.stringify({ values: generateBatch(payload) }));
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}
