# Contributing to Flanufactured

## Development Setup

### Prerequisites

- Python 3.12+
- Node.js 20+
- Docker (for integration testing)

### Running Locally

Open two terminals:

```bash
# Terminal 1 — backend
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
echo "API_KEY=dev-key-12345" > .env
uvicorn main:app --reload --port 8000
```

```bash
# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

The frontend dev server starts at `http://localhost:5173` and proxies all `/api/` requests to the backend at port 8000 (configured in `vite.config.js`). The Swagger UI is available at `http://localhost:8000/docs`.

### Building the Docker image

```bash
docker compose build
docker compose up
```

---

## Project Layout

```
backend/
  generator.py        ← Field type registry + data generation engine
  schema_store.py     ← File-based schema persistence
  models.py           ← Pydantic models for all request/response types
  auth.py             ← API key validation
  config.py           ← Environment-variable settings
  routers/
    generate.py       ← Generation endpoints
    schemas.py        ← Schema CRUD endpoints
    settings.py       ← API key management endpoints

frontend/src/
  pages/
    Builder.jsx       ← Schema builder (main page)
    Library.jsx       ← Saved schema list
    Settings.jsx      ← Settings page
  components/
    FieldRow.jsx           ← Single field row (drag handle, name input, type button, options toggle)
    FieldOptions.jsx       ← Per-type options panels rendered below a field row
    FieldTypePicker.jsx    ← Searchable modal for selecting field types (rendered via Portal)
    Portal.jsx             ← createPortal wrapper for modals that must escape DOM stacking contexts
    PreviewTable.jsx       ← Data grid for the preview pane
    DownloadModal.jsx      ← Download dialog (rows, format, locale, seed)
    SaveSchemaModal.jsx    ← Name-and-save dialog
    Toast.jsx              ← Notification context + toast renderer
    Navbar.jsx             ← Top navigation
  useSettings.js      ← Settings persistence + theme/accent engine
  SettingsContext.jsx ← React context wrapping useSettings
  api.js              ← All fetch/axios calls to the backend
```

---

## Adding a New Field Type

Field types are self-contained entries in `backend/generator.py`. Adding one requires two changes:

### 1. Register it in `FIELD_TYPES`

Add an entry to the `FIELD_TYPES` dict near the top of the file. Choose the right category and set `advanced: True` if it's a niche type that should be hidden by default in the picker.

```python
FIELD_TYPES = {
    # ...
    "my_type": {
        "label": "My Type",
        "category": "Text",           # Core | Personal | Location | Internet |
                                      # Finance | Vehicle | DateTime | Text | Wacky
        "description": "One-line description shown in the picker",
        "examples": ["example1", "example2", "example3"],
        # "advanced": True,           # uncomment to hide behind "Show advanced"
    },
}
```

### 2. Handle it in `_generate_value()`

Add an `if t == "my_type":` branch anywhere in the function:

```python
def _generate_value(field, fake, row_index, row_context):
    t = field.type
    opts = field.options or {}

    # ... existing cases ...

    if t == "my_type":
        return fake.some_faker_method()
```

**Tips:**

- `fake` is a `Faker` instance for the requested locale. Use `fake.<method>()` for any [Faker provider method](https://faker.readthedocs.io/en/master/providers.html).
- `opts` is the `options` dict from the field definition. Use `opts.get("key", default)` for configurable values.
- `row_context` is a dict populated by earlier fields in the same row. It stores values both by field name and by field type, so you can check `row_context.get("first_name")` to derive values relationally.
- Return `None` if you can't produce a value — it serializes as `null` in JSON and as an empty string in CSV.

### 3. Add options support (optional)

If your field type has configurable options (e.g. a min/max range), add a case in `frontend/src/components/FieldOptions.jsx` and add your type to the `hasOptions` array in `frontend/src/components/FieldRow.jsx`.

```javascript
// FieldOptions.jsx
if (field.type === 'my_type') return (
  <div style={col}>
    <label style={labelStyle}>My option</label>
    <input className="input" type="number"
      value={opts.my_option ?? 10}
      onChange={e => set('my_option', +e.target.value)} />
  </div>
)
```

```javascript
// FieldRow.jsx
const hasOptions = [
  'custom_list', 'weighted_list', 'number', /* ... */ 'my_type'
].includes(field.type)
```

---

## Code Style

**Python:** Standard library style. No formatter is enforced but PEP 8 is expected. Type hints on public functions are appreciated.

**JavaScript/React:** The codebase uses inline styles throughout (by design — the theming system depends on CSS custom properties, and co-locating styles makes components self-contained). Avoid importing Tailwind utility classes except for the base reset; use CSS variables (`var(--accent)`, `var(--bg-surface)`, etc.) for all colors.

**Component conventions:**
- Pages (`pages/`) manage state and data fetching. Components (`components/`) are presentational.
- Modals that could be rendered inside a positioned ancestor should use `<Portal>` to escape stacking contexts.
- Settings are read from `useSettingsContext()`. Don't read from `localStorage` directly.

---

## Dependency Notes

- **Do not upgrade `faker`** past the version in `requirements.txt` without testing — the API has changed between major versions and some provider methods may move or be removed.
- **`@dnd-kit`** handles all drag-and-drop. Don't replace with HTML5 native DnD; it has poor mobile support and unpredictable behavior with custom scroll containers.
- The frontend uses **no UI component library** by design (keeping bundle size minimal and full visual control). Add icons from `lucide-react` only.
