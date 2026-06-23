import test from 'node:test';
import assert from 'node:assert/strict';
import { generateBatch } from './fakerjs_generate.mjs';

const catalog = {
  'person.firstName': { path: 'person.firstName' },
  'internet.email': { path: 'internet.email' },
  'number.int': { path: 'number.int', args: [{ min: 1, max: 3 }] },
};

test('generateBatch returns one value per request', () => {
  const result = generateBatch({
    seed: 42,
    catalog,
    requests: [
      { key: 'person.firstName', options: {} },
      { key: 'internet.email', options: {} },
      { key: 'number.int', options: {} },
    ],
  });

  assert.equal(result.length, 3);
  assert.equal(typeof result[0], 'string');
  assert.match(result[1], /@/);
  assert.equal(typeof result[2], 'number');
});

test('generateBatch rejects unknown keys', () => {
  assert.throws(
    () => generateBatch({
      seed: 42,
      catalog,
      requests: [{ key: 'bad.key', options: {} }],
    }),
    /Unknown FakerJS field key: bad.key/
  );
});
