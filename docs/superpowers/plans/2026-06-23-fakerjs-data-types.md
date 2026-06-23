# FakerJS Data Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add FakerJS API module data types to Flanufactured and expose an inline per-column blank/null percentage control.

**Architecture:** Keep FastAPI as the API and schema layer. Add a Node-based FakerJS batch helper for FakerJS-backed values, while preserving existing Python utility field generators. Store field catalog metadata in Python and pass only validated catalog keys to the Node helper.

**Tech Stack:** FastAPI, Pydantic, Python `unittest`, React 18, Vite, Node 24, `@faker-js/faker`, Node test runner.

---

## File Structure

- Create `backend/fakerjs_catalog.py`: canonical FakerJS-backed field catalog grouped by API module.
- Create `backend/fakerjs_bridge.py`: Python wrapper around a Node helper, including batch request/response handling.
- Create `backend/fakerjs_generate.mjs`: Node helper that imports `@faker-js/faker`, validates catalog keys, seeds FakerJS, and returns generated values as JSON.
- Modify `backend/generator.py`: combine utility fields with FakerJS catalog, apply `blank_percent`, and route FakerJS generation through the bridge.
- Modify `backend/requirements.txt`: keep existing Python deps unchanged unless tests reveal a missing standard test dependency.
- Modify `frontend/package.json`: add `@faker-js/faker` only at repo root if the helper is managed from the frontend package; otherwise add a root `package.json`.
- Create root `package.json`: Node helper dependency and optional helper test script.
- Create `backend/test_generator.py`: backend tests for blank/null behavior and FakerJS bridge behavior.
- Create `backend/test_fakerjs_catalog.py`: backend tests for catalog grouping and field key validation.
- Create `backend/fakerjs_generate.test.mjs`: Node tests for the helper.
- Modify `frontend/src/components/FieldTypePicker.jsx`: category sidebar plus grid picker.
- Modify `frontend/src/components/FieldRow.jsx`: compact inline blank percentage input and preserve blank percentage when changing type.
- Create or modify `frontend/src/field-row.test.mjs`: React-free unit tests for small pure helpers extracted from FieldRow if direct component tests are not practical with current dependencies.

## Task 1: Backend Blank Percentage

**Files:**
- Modify: `backend/generator.py`
- Create: `backend/test_generator.py`

- [ ] **Step 1: Write failing backend tests**

Create `backend/test_generator.py`:

```python
import unittest

from models import FieldDefinition
from generator import generate_dataset


class BlankPercentTests(unittest.TestCase):
    def test_blank_percent_100_always_returns_null(self):
        fields = [
            FieldDefinition(
                name="email",
                type="email",
                options={"blank_percent": 100},
            )
        ]

        data, content_type = generate_dataset(fields, rows=5, seed=123)

        self.assertEqual(content_type, "application/json")
        self.assertEqual([row["email"] for row in data], [None, None, None, None, None])

    def test_blank_percent_0_does_not_blank_value(self):
        fields = [
            FieldDefinition(
                name="first_name",
                type="first_name",
                options={"blank_percent": 0},
            )
        ]

        data, _ = generate_dataset(fields, rows=5, seed=123)

        self.assertTrue(all(row["first_name"] for row in data))

    def test_blank_percent_is_clamped_to_100(self):
        fields = [
            FieldDefinition(
                name="name",
                type="full_name",
                options={"blank_percent": 250},
            )
        ]

        data, _ = generate_dataset(fields, rows=3, seed=123)

        self.assertEqual([row["name"] for row in data], [None, None, None])

    def test_negative_blank_percent_is_clamped_to_0(self):
        fields = [
            FieldDefinition(
                name="name",
                type="full_name",
                options={"blank_percent": -50},
            )
        ]

        data, _ = generate_dataset(fields, rows=3, seed=123)

        self.assertTrue(all(row["name"] for row in data))


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
cd backend && python -m unittest test_generator.BlankPercentTests -v
```

Expected: at least `test_blank_percent_100_always_returns_null` fails because `blank_percent` is not applied.

- [ ] **Step 3: Implement minimal blank percentage support**

In `backend/generator.py`, add this helper near `_generate_value`:

```python
def _blank_percent(options: dict) -> float:
    try:
        percent = float((options or {}).get("blank_percent", 0) or 0)
    except (TypeError, ValueError):
        percent = 0
    return max(0, min(100, percent))
```

Then change the top of `_generate_value` to:

```python
    t = field.type
    opts = field.options or {}

    if _blank_percent(opts) and random.random() < (_blank_percent(opts) / 100):
        return None
```

- [ ] **Step 4: Run tests to verify pass**

Run:

```bash
cd backend && python -m unittest test_generator.BlankPercentTests -v
```

Expected: all four tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/generator.py backend/test_generator.py
git commit -m "Add backend blank percentage generation"
```

## Task 2: FakerJS Dependency and Helper

**Files:**
- Create: `package.json`
- Create: `backend/fakerjs_generate.mjs`
- Create: `backend/fakerjs_generate.test.mjs`

- [ ] **Step 1: Add Node package manifest**

Create root `package.json`:

```json
{
  "name": "flanufactured-fakerjs-helper",
  "private": true,
  "type": "module",
  "scripts": {
    "test:fakerjs": "node --test backend/fakerjs_generate.test.mjs"
  },
  "dependencies": {
    "@faker-js/faker": "^10.5.0"
  }
}
```

- [ ] **Step 2: Install dependency**

Run:

```bash
npm install
```

Expected: `package-lock.json` is created and `@faker-js/faker` is installed.

- [ ] **Step 3: Write failing Node helper tests**

Create `backend/fakerjs_generate.test.mjs`:

```javascript
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
```

- [ ] **Step 4: Run Node tests to verify failure**

Run:

```bash
npm run test:fakerjs
```

Expected: fails because `backend/fakerjs_generate.mjs` does not exist.

- [ ] **Step 5: Implement Node helper**

Create `backend/fakerjs_generate.mjs`:

```javascript
import { faker } from '@faker-js/faker';

function getByPath(root, path) {
  return path.split('.').reduce((value, part) => value?.[part], root);
}

function normalizeValue(value) {
  if (value instanceof Date) {
    return value.toISOString();
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
```

- [ ] **Step 6: Run Node tests to verify pass**

Run:

```bash
npm run test:fakerjs
```

Expected: both tests pass.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json backend/fakerjs_generate.mjs backend/fakerjs_generate.test.mjs
git commit -m "Add FakerJS generation helper"
```

## Task 3: FakerJS Catalog and Python Bridge

**Files:**
- Create: `backend/fakerjs_catalog.py`
- Create: `backend/fakerjs_bridge.py`
- Create: `backend/test_fakerjs_catalog.py`
- Modify: `backend/test_generator.py`
- Modify: `backend/generator.py`

- [ ] **Step 1: Write failing catalog and bridge tests**

Create `backend/test_fakerjs_catalog.py`:

```python
import unittest

from fakerjs_catalog import FAKERJS_FIELD_TYPES, get_fakerjs_field_types_grouped


class FakerJSCatalogTests(unittest.TestCase):
    def test_catalog_contains_api_modules(self):
        grouped = get_fakerjs_field_types_grouped()

        for category in ["Airline", "Animal", "Book", "Color", "Commerce", "Company", "Database", "Datatype", "Date", "Finance", "Food", "Git", "Hacker", "Image", "Internet", "Location", "Lorem", "Music", "Number", "Person", "Phone", "Science", "String", "System", "Vehicle", "Word"]:
            self.assertIn(category, grouped)

    def test_catalog_entries_have_required_metadata(self):
        for key, meta in FAKERJS_FIELD_TYPES.items():
            self.assertIn(".", key)
            self.assertIn("label", meta)
            self.assertIn("category", meta)
            self.assertIn("path", meta)
            self.assertIn("description", meta)
            self.assertIsInstance(meta.get("examples", []), list)


if __name__ == "__main__":
    unittest.main()
```

Append to `backend/test_generator.py`:

```python
class FakerJSGenerationTests(unittest.TestCase):
    def test_fakerjs_field_generates_value(self):
        fields = [
            FieldDefinition(name="first_name", type="person.firstName", options={})
        ]

        data, _ = generate_dataset(fields, rows=2, seed=123)

        self.assertEqual(len(data), 2)
        self.assertTrue(all(isinstance(row["first_name"], str) and row["first_name"] for row in data))
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
cd backend && python -m unittest test_fakerjs_catalog test_generator.FakerJSGenerationTests -v
```

Expected: fails because `fakerjs_catalog.py` and FakerJS generation are not implemented.

- [ ] **Step 3: Add catalog with all FakerJS API modules**

Create `backend/fakerjs_catalog.py` with a `MODULE_METHODS` dictionary whose module keys match the official FakerJS API modules listed in the approved spec. Include every method listed on the API page for those modules. Use this structure:

```python
MODULE_METHODS = {
    "Airline": ["aircraftType", "airline", "airplane", "airport", "flightNumber", "recordLocator", "seat"],
    "Animal": ["bear", "bird", "cat", "cetacean", "cow", "crocodilia", "dog", "fish", "horse", "insect", "lion", "petName", "rabbit", "rodent", "snake", "type"],
    "Book": ["author", "format", "genre", "publisher", "series", "title"],
    "Color": ["cmyk", "colorByCSSColorSpace", "cssSupportedFunction", "cssSupportedSpace", "hsl", "human", "hwb", "lab", "lch", "rgb", "space"],
    "Commerce": ["department", "isbn", "price", "product", "productAdjective", "productDescription", "productMaterial", "productName", "upc"],
    "Company": ["buzzAdjective", "buzzNoun", "buzzPhrase", "buzzVerb", "catchPhrase", "catchPhraseAdjective", "catchPhraseDescriptor", "catchPhraseNoun", "name"],
    "Database": ["collation", "column", "engine", "mongodbObjectId", "type"],
    "Datatype": ["boolean"],
    "Date": ["anytime", "between", "betweens", "birthdate", "future", "month", "past", "recent", "soon", "timeZone", "weekday"],
    "Finance": ["accountName", "accountNumber", "amount", "bic", "bitcoinAddress", "creditCardCVV", "creditCardIssuer", "creditCardNumber", "currency", "currencyCode", "currencyName", "currencyNumericCode", "currencySymbol", "ethereumAddress", "iban", "litecoinAddress", "pin", "routingNumber", "transactionDescription", "transactionType"],
    "Food": ["adjective", "description", "dish", "ethnicCategory", "fruit", "ingredient", "meat", "spice", "vegetable"],
    "Git": ["branch", "commitDate", "commitEntry", "commitMessage", "commitSha"],
    "Hacker": ["abbreviation", "adjective", "ingverb", "noun", "phrase", "verb"],
    "Image": ["avatar", "avatarGitHub", "dataUri", "personPortrait", "url", "urlLoremFlickr", "urlPicsumPhotos"],
    "Internet": ["displayName", "domainName", "domainSuffix", "domainWord", "email", "emoji", "exampleEmail", "httpMethod", "httpStatusCode", "ip", "ipv4", "ipv6", "jwt", "jwtAlgorithm", "mac", "password", "port", "protocol", "url", "userAgent", "username"],
    "Location": ["buildingNumber", "cardinalDirection", "city", "continent", "country", "countryCode", "county", "direction", "language", "latitude", "longitude", "nearbyGPSCoordinate", "ordinalDirection", "postalAddress", "secondaryAddress", "state", "street", "streetAddress", "timeZone", "zipCode"],
    "Lorem": ["lines", "paragraph", "paragraphs", "sentence", "sentences", "slug", "text", "word", "words"],
    "Music": ["album", "artist", "genre", "songName"],
    "Number": ["bigInt", "binary", "float", "hex", "int", "octal", "romanNumeral"],
    "Person": ["bio", "firstName", "fullName", "gender", "jobArea", "jobDescriptor", "jobTitle", "jobType", "lastName", "middleName", "prefix", "sex", "sexType", "suffix", "zodiacSign"],
    "Phone": ["imei", "number"],
    "Science": ["chemicalElement", "unit"],
    "String": ["alpha", "alphanumeric", "binary", "fromCharacters", "hexadecimal", "nanoid", "numeric", "octal", "sample", "symbol", "ulid", "uuid"],
    "System": ["commonFileExt", "commonFileName", "commonFileType", "cron", "directoryPath", "fileExt", "fileName", "filePath", "fileType", "mimeType", "networkInterface", "semver"],
    "Vehicle": ["bicycle", "color", "fuel", "manufacturer", "model", "type", "vehicle", "vin", "vrm"],
    "Word": ["adjective", "adverb", "conjunction", "interjection", "noun", "preposition", "sample", "verb", "words"],
}
```

Add helpers in the same file:

```python
def _module_key(category: str) -> str:
    return category[0].lower() + category[1:]


def _label(method: str) -> str:
    chars = []
    for ch in method:
        if ch.isupper():
            chars.append(" ")
        chars.append(ch)
    return "".join(chars).strip().title()


def _description(category: str, method: str) -> str:
    return f"FakerJS {category}.{method}() value"


FAKERJS_FIELD_TYPES = {
    f"{_module_key(category)}.{method}": {
        "label": _label(method),
        "category": category,
        "description": _description(category, method),
        "examples": [],
        "path": f"{_module_key(category)}.{method}",
        "args": DEFAULT_ARGS.get(f"{_module_key(category)}.{method}", []),
        "fakerjs": True,
    }
    for category, methods in MODULE_METHODS.items()
    for method in methods
}


def get_fakerjs_field_types_grouped():
    grouped = {}
    for type_key, meta in FAKERJS_FIELD_TYPES.items():
        category = meta["category"]
        grouped.setdefault(category, []).append({
            "type": type_key,
            "label": meta["label"],
            "description": meta["description"],
            "examples": meta.get("examples", []),
            "advanced": meta.get("advanced", False),
        })
    return grouped
```

- [ ] **Step 4: Implement Python bridge**

Create `backend/fakerjs_bridge.py`:

```python
import json
import subprocess
from pathlib import Path

from fakerjs_catalog import FAKERJS_FIELD_TYPES


HELPER_PATH = Path(__file__).with_name("fakerjs_generate.mjs")


def _helper_catalog():
    return {
        key: {
            "path": meta["path"],
            "args": meta.get("args", []),
        }
        for key, meta in FAKERJS_FIELD_TYPES.items()
    }


def generate_fakerjs_values(requests, seed=None):
    payload = {
        "seed": seed,
        "catalog": _helper_catalog(),
        "requests": requests,
    }
    completed = subprocess.run(
        ["node", str(HELPER_PATH)],
        input=json.dumps(payload),
        text=True,
        capture_output=True,
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError(completed.stderr.strip() or "FakerJS generation failed")
    return json.loads(completed.stdout)["values"]
```

- [ ] **Step 5: Wire FakerJS fields into generator**

In `backend/generator.py`, import:

```python
from fakerjs_catalog import FAKERJS_FIELD_TYPES, get_fakerjs_field_types_grouped
from fakerjs_bridge import generate_fakerjs_values
```

At the start of `_generate_value`, after blank percentage handling, add:

```python
    if t in FAKERJS_FIELD_TYPES:
        return generate_fakerjs_values([{"key": t, "options": opts}], seed=None)[0]
```

In `get_field_types_grouped`, merge existing `FIELD_TYPES` grouped data first and then append FakerJS groups:

```python
    fakerjs_grouped = get_fakerjs_field_types_grouped()
    for cat, entries in fakerjs_grouped.items():
        grouped.setdefault(cat, []).extend(entries)
```

- [ ] **Step 6: Run backend tests**

Run:

```bash
cd backend && python -m unittest test_fakerjs_catalog test_generator -v
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/fakerjs_catalog.py backend/fakerjs_bridge.py backend/generator.py backend/test_fakerjs_catalog.py backend/test_generator.py
git commit -m "Add FakerJS catalog and backend bridge"
```

## Task 4: Batch FakerJS Generation

**Files:**
- Modify: `backend/generator.py`
- Modify: `backend/fakerjs_bridge.py`
- Modify: `backend/test_generator.py`

- [ ] **Step 1: Write failing batch behavior test**

Add to `backend/test_generator.py`:

```python
class FakerJSBatchTests(unittest.TestCase):
    def test_multiple_fakerjs_fields_generate_for_multiple_rows(self):
        fields = [
            FieldDefinition(name="first_name", type="person.firstName", options={}),
            FieldDefinition(name="email", type="internet.email", options={}),
        ]

        data, _ = generate_dataset(fields, rows=3, seed=321)

        self.assertEqual(len(data), 3)
        self.assertTrue(all(row["first_name"] for row in data))
        self.assertTrue(all("@" in row["email"] for row in data))
```

- [ ] **Step 2: Run tests**

Run:

```bash
cd backend && python -m unittest test_generator.FakerJSBatchTests -v
```

Expected: passes with the per-value implementation, establishing baseline behavior before refactor.

- [ ] **Step 3: Refactor bridge for request lists per dataset**

Update `generate_dataset` so it seeds Python, builds rows in order, and uses `generate_fakerjs_values` for FakerJS requests in a single call per dataset. Keep `_generate_value` for utility fields. Use this outline:

```python
def generate_dataset(fields, rows, locale="en_US", seed=None, output_format="json"):
    from config import settings as cfg
    rows = min(rows, cfg.max_rows)
    fake = get_faker(locale)
    if seed is not None:
        Faker.seed(seed)
        random.seed(seed)

    records = []
    fakerjs_requests = []
    fakerjs_slots = []

    for row_index in range(rows):
        row, context = {}, {}
        records.append(row)
        for field in fields:
            opts = field.options or {}
            if _blank_percent(opts) and random.random() < (_blank_percent(opts) / 100):
                val = None
            elif field.type in FAKERJS_FIELD_TYPES:
                fakerjs_slots.append((row, context, field))
                fakerjs_requests.append({"key": field.type, "options": opts})
                val = None
            else:
                val = _generate_value(field, fake, row_index, context)
            row[field.name] = val
            context[field.type] = val
            context[field.name] = val

    if fakerjs_requests:
        values = generate_fakerjs_values(fakerjs_requests, seed=seed)
        for (row, context, field), value in zip(fakerjs_slots, values):
            row[field.name] = value
            context[field.type] = value
            context[field.name] = value

    if output_format == "csv":
        if not records:
            return "", "text/csv"
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=[f.name for f in fields])
        writer.writeheader()
        writer.writerows(records)
        return buf.getvalue(), "text/csv"
    return records, "application/json"
```

- [ ] **Step 4: Run backend tests**

Run:

```bash
cd backend && python -m unittest test_generator test_fakerjs_catalog -v
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/generator.py backend/fakerjs_bridge.py backend/test_generator.py
git commit -m "Batch FakerJS generation requests"
```

## Task 5: Type Picker UI

**Files:**
- Modify: `frontend/src/components/FieldTypePicker.jsx`

- [ ] **Step 1: Add category sidebar and grid layout**

Replace the current list-and-preview body with:

```jsx
const categories = useMemo(() => {
  const names = Object.keys(fieldTypes || {})
  return names.map(name => ({
    name,
    count: (fieldTypes[name] || []).length,
  }))
}, [fieldTypes])

const [activeCategory, setActiveCategory] = useState('All')
```

Then compute `visibleTypes`:

```jsx
const visibleTypes = useMemo(() => {
  const q = search.toLowerCase().trim()
  return allTypes.filter(t => {
    if (!showAdvanced && t.advanced) return false
    if (activeCategory !== 'All' && t.category !== activeCategory) return false
    if (!q) return true
    return (
      t.label.toLowerCase().includes(q) ||
      t.type.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    )
  })
}, [allTypes, search, showAdvanced, activeCategory])
```

Render a left sidebar with `All` plus category names and counts, and render `visibleTypes` in a CSS grid:

```jsx
<div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
  <aside style={{ width: 180, flexShrink: 0, borderRight: '1px solid var(--border)', overflowY: 'auto', background: 'var(--bg-primary)' }}>
    {[{ name: 'All', count: allTypes.length }, ...categories].map(cat => (
      <button
        key={cat.name}
        onClick={() => setActiveCategory(cat.name)}
        style={{
          width: '100%',
          padding: '10px 14px',
          border: 'none',
          borderLeft: activeCategory === cat.name ? '3px solid var(--accent)' : '3px solid transparent',
          background: activeCategory === cat.name ? 'var(--bg-elevated)' : 'transparent',
          color: 'var(--text-primary)',
          display: 'flex',
          justifyContent: 'space-between',
          cursor: 'pointer',
          fontSize: 13,
        }}
      >
        <span>{cat.name}</span>
        <span style={{ color: 'var(--text-muted)' }}>{cat.count}</span>
      </button>
    ))}
  </aside>
  <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '18px 28px' }}>
      {visibleTypes.map(t => (
        <button
          key={t.type}
          onClick={() => { onSelect(t.type); onClose() }}
          style={{
            textAlign: 'left',
            border: 'none',
            background: currentType === t.type ? 'var(--bg-elevated)' : 'transparent',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700 }}>{t.label}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45 }}>{t.description}</div>
          {t.examples?.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
              {t.examples.slice(0, 3).join(', ')}
            </div>
          )}
        </button>
      ))}
    </div>
  </div>
</div>
```

- [ ] **Step 2: Run frontend build**

Run:

```bash
cd frontend && npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/FieldTypePicker.jsx
git commit -m "Update field type picker layout"
```

## Task 6: Inline Blank Percentage UI

**Files:**
- Modify: `frontend/src/components/FieldRow.jsx`

- [ ] **Step 1: Add helper functions**

At module top in `frontend/src/components/FieldRow.jsx`, add:

```jsx
export function clampBlankPercent(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.min(100, parsed))
}

export function optionsForTypeChange(options = {}) {
  const blankPercent = clampBlankPercent(options.blank_percent ?? 0)
  return blankPercent ? { blank_percent: blankPercent } : {}
}
```

Add default arguments above `FAKERJS_FIELD_TYPES` for FakerJS methods that require input:

```python
DEFAULT_ARGS = {
    "color.colorByCSSColorSpace": [{"space": "sRGB", "format": "css"}],
    "date.between": [{"from": "2020-01-01T00:00:00.000Z", "to": "2030-01-01T00:00:00.000Z"}],
    "date.betweens": [{"from": "2020-01-01T00:00:00.000Z", "to": "2030-01-01T00:00:00.000Z", "count": 2}],
    "string.fromCharacters": ["ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"],
}
```

- [ ] **Step 2: Preserve blank percent when selecting a new type**

Change the picker `onSelect` in `FieldRow.jsx` to:

```jsx
onSelect={type => onChange({ ...field, type, options: optionsForTypeChange(field.options) })}
```

- [ ] **Step 3: Add compact inline blank input**

In the row layout, between the type picker button and options toggle, add:

```jsx
<label style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
  <span>blank:</span>
  <input
    className="input"
    type="number"
    min={0}
    max={100}
    value={field.options?.blank_percent ?? 0}
    onChange={e => onChange({
      ...field,
      options: {
        ...(field.options || {}),
        blank_percent: clampBlankPercent(e.target.value),
      },
    })}
    style={{ width: 64, textAlign: 'right', fontFamily: 'Space Mono, monospace', fontSize: 12 }}
  />
  <span>%</span>
</label>
```

- [ ] **Step 4: Run frontend build**

Run:

```bash
cd frontend && npm run build
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/FieldRow.jsx
git commit -m "Add inline blank percentage control"
```

## Task 7: End-to-End Verification

**Files:**
- Read: `backend/test_generator.py`
- Read: `backend/test_fakerjs_catalog.py`
- Read: `backend/fakerjs_generate.test.mjs`
- Read: `frontend/src/components/FieldTypePicker.jsx`
- Read: `frontend/src/components/FieldRow.jsx`

- [ ] **Step 1: Run backend tests**

Run:

```bash
cd backend && python -m unittest test_generator test_fakerjs_catalog -v
```

Expected: all tests pass.

- [ ] **Step 2: Run Node helper tests**

Run:

```bash
npm run test:fakerjs
```

Expected: all tests pass.

- [ ] **Step 3: Run frontend build**

Run:

```bash
cd frontend && npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Start backend and frontend for manual check**

Run backend in one terminal:

```bash
cd backend && uvicorn main:app --reload --port 8000
```

Run frontend in another terminal:

```bash
cd frontend && npm run dev -- --host 0.0.0.0
```

Expected: app loads, picker shows FakerJS module categories, selected field rows show `blank: 0 %`, and preview can generate a FakerJS field with `blank: 100 %` as null.

- [ ] **Step 5: Check final git status**

Run:

```bash
git status --short
```

Expected: no uncommitted changes remain except local runtime files ignored by `.gitignore`.

## Self-Review

- Spec coverage: the plan covers FakerJS API module catalog, Node helper generation, backend blank/null behavior, picker layout, inline blank percentage UI, no formula button, and verification.
- Completeness scan: no task contains unresolved implementation markers.
- Type consistency: the plan uses `field.options.blank_percent`, FakerJS catalog keys like `person.firstName`, and helper request keys consistently across backend and frontend steps.
