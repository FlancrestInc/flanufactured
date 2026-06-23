# Flanufactured

A self-hosted fake data generator with a web UI and REST API. Build schemas with 115 field types, preview data instantly, save schemas for reuse, and export to JSON or CSV. Intended as a self-hosted alternative to Mockaroo.


---

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Using the Web UI](#using-the-web-ui)
- [API Reference](#api-reference)
- [Field Types](#field-types)
- [Schema File Format](#schema-file-format)
- [Architecture](#architecture)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)

---

## Features

- **115 field types** across 9 categories — personal, location, internet, finance, vehicle, datetime, text, and more
- **Relational awareness** — city/state pairs are consistent, car make/model/year are consistent, email addresses derive from name fields when present
- **Schema builder** — drag-and-drop field ordering, per-field options, live preview
- **Schema library** — save, load, export, and import schemas as portable JSON files
- **REST API** — generate data programmatically with API key authentication
- **Multiple output formats** — JSON and CSV
- **Locale support** — 20+ locales for region-appropriate names, addresses, and phone numbers
- **Reproducible output** — optional seed value for deterministic results
- **Settings** — theme (light/dark), phosphor accent color, export defaults, and more
- **Single Docker container** — multi-stage build, no external database required

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/yourname/flanufactured.git
cd flanufactured

# 2. Create your environment file
cp .env.example .env

# 3. Set a strong API key
#    Edit .env and replace "changeme" with a real secret
nano .env

# 4. Build and start
docker compose up -d

# 5. Open the UI
open http://localhost:8000
```

On first run, if `API_KEY` is still `changeme`, navigate to **Settings → API Key** to set one through the UI.

---

## Configuration

All configuration is via environment variables. Copy `.env.example` to `.env` and edit:

| Variable | Default | Description |
|---|---|---|
| `API_KEY` | `changeme` | Secret key required for all API requests. Set this before exposing the service. |
| `DEFAULT_LOCALE` | `en_US` | Default locale for generated data. |
| `MAX_ROWS` | `10000` | Hard cap on rows per generation request. |
| `DATA_DIR` | `/app/data` | Directory where schemas and config are stored. Must be a persistent volume. |

> **Important:** Never commit `.env` to version control. The `.gitignore` excludes it by default.

### API Key Management

The API key can be managed two ways:

1. **Environment variable** — set `API_KEY` in `.env` before starting the container. The key is read at startup.
2. **Settings UI** — navigate to **Settings → API Key**. You can view the current key, roll it to a new random key, or set one for the first time. Keys set or rolled through the UI are saved to the data volume (`.config` file) and take effect immediately without a restart. The UI-stored key takes precedence over the environment variable.

Key age is tracked: the Settings page shows how long ago the key was created and displays a warning if it's older than 365 days.

---

## Deployment

### Docker Compose (recommended)

```bash
docker compose up -d
```

The container exposes port `8000`. Mount `./data` as a volume for persistent schema storage.

### Behind a Reverse Proxy

Flanufactured is designed to run behind a reverse proxy or a Cloudflare Zero Trust tunnel. It does not implement its own user authentication — access control is handled at the network layer.

Example Caddy configuration:

```
flanufactured.yourdomain.com {
    reverse_proxy localhost:8000
}
```

### Portainer Stack

1. In Portainer, go to **Stacks → Add stack**
2. Paste the contents of `docker-compose.yml`
3. Add environment variables: `API_KEY=your-secret-key`
4. Deploy

### Data Persistence

Schemas and the API key config are stored as JSON files in `DATA_DIR` (`/app/data` inside the container). Map this to a host directory or named volume:

```yaml
volumes:
  - ./data:/app/data
  # or a named volume:
  # - flanufactured_data:/app/data
```

Without a persistent volume, all saved schemas are lost when the container is recreated.

---

## Using the Web UI

### Builder

The main schema construction page.

**Building a schema:**
1. Click **+ Add Field** to add a field row
2. Optionally enter a field name — if left blank, the field type is used as the name automatically (e.g. `email`, `first_name`). Duplicate auto-names get a numeric suffix (`number`, `number_1`, `number_2`)
3. Click the type selector button to open the **Field Type Picker**
4. In the picker, search or browse by category, hover any type to see a description and example values, then click to select
5. For types that have options (number ranges, custom lists, date formats, etc.), click the **chevron** (˅) that appears on the right of the row to expand the options panel
6. Drag the **⋮⋮** handle on the left of any row to reorder fields
7. Click **Preview** to generate a live sample in the right pane

**Toolbar actions:**
- **New** — clear the current schema and start fresh
- **Import** — load a `.schema.json` file from disk
- **Export Schema** — download the current field definitions as a `.schema.json` file (not the data, just the schema)
- **Preview** — generate sample rows in the preview pane (row count set in Settings)
- **Save / Update** — save the current schema to the library
- **Download Data** — open the download dialog to export real data

**Download dialog options:**
- Row count (up to the configured max)
- Format: JSON or CSV
- Locale: affects names, addresses, phone numbers
- Seed: integer seed for reproducible output
- Pretty-print: indent JSON output (set default in Settings)

**Resizing panes:** Drag the divider bar between the Fields and Preview panes to adjust the split.

### Schema Library

Lists all saved schemas. Each card shows the schema name, field count, and dates.

- **Load into Builder** — opens the schema in the Builder for editing
- **Schema** — downloads the schema definition as a `.schema.json` file
- **Data** — opens the download dialog to export data from this schema
- **Delete** — removes the schema (confirmation dialog can be toggled in Settings)

### Settings

Persistent preferences stored in your browser's `localStorage`.

| Setting | Description |
|---|---|
| **Theme** | Light or dark mode |
| **Accent color** | Phosphor terminal color: green, amber, cyan, white, pink, or custom hex |
| **Export row count** | Default rows in the Download dialog |
| **Export format** | Default format (JSON or CSV) |
| **Export locale** | Default locale |
| **JSON pretty-print** | Whether JSON downloads are indented |
| **Max rows (session cap)** | Session-level row limit, cannot exceed server `MAX_ROWS` |
| **Preview row count** | Rows shown in the Builder preview (1–100, default 10) |
| **Confirm before delete** | Whether schema deletion requires confirmation |
| **API key** | View, reveal, copy, or roll the server-side API key |

---

## API Reference

All endpoints except `/health` and `/api/settings/key-status` require an `X-API-Key` header.

Interactive documentation is available at `http://localhost:8000/docs` (Swagger UI) and `http://localhost:8000/redoc`.

### Authentication

```
X-API-Key: your-api-key
```

### Endpoints

#### System

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | No | Health check. Returns `{"status": "ok"}` |

#### Generate

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/field-types` | Yes | All available field types grouped by category |
| `POST` | `/api/generate` | Yes | Generate data from an inline schema |
| `POST` | `/api/generate/{schema_id}` | Yes | Generate data from a saved schema |

#### Schemas

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/schemas` | Yes | List all saved schemas |
| `POST` | `/api/schemas` | Yes | Create a new schema |
| `GET` | `/api/schemas/{id}` | Yes | Retrieve a schema by ID |
| `PUT` | `/api/schemas/{id}` | Yes | Update a schema's name or fields |
| `DELETE` | `/api/schemas/{id}` | Yes | Delete a schema |
| `GET` | `/api/schemas/{id}/export` | Yes | Download schema as a `.schema.json` file |
| `POST` | `/api/schemas/import` | Yes | Import a schema from a JSON file upload |

#### Settings

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/settings/key-status` | No | Key status, masked preview, and creation date |
| `GET` | `/api/settings/key-reveal` | Yes | Returns the full current API key |
| `POST` | `/api/settings/key-roll` | Yes | Generate and save a new random API key |
| `POST` | `/api/settings/key-set` | No* | Set the initial API key (blocked if a key is already configured) |

### Request/Response Examples

**Generate data from an inline schema:**

```bash
curl -X POST http://localhost:8000/api/generate \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{
    "rows": 5,
    "format": "json",
    "locale": "en_US",
    "fields": [
      { "name": "id",         "type": "row_number" },
      { "name": "full_name",  "type": "full_name" },
      { "name": "email",      "type": "email" },
      { "name": "age",        "type": "age" },
      { "name": "country",    "type": "country" }
    ]
  }'
```

**Generate CSV from a saved schema:**

```bash
curl -X POST http://localhost:8000/api/generate/YOUR-SCHEMA-ID \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"rows": 1000, "format": "csv"}' \
  --output data.csv
```

**Reproducible output with a seed:**

```bash
curl -X POST http://localhost:8000/api/generate \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{
    "rows": 10,
    "format": "json",
    "seed": 42,
    "fields": [
      { "name": "name", "type": "full_name" },
      { "name": "score", "type": "number", "options": { "min": 0, "max": 100, "decimals": 2 } }
    ]
  }'
```

**Save a schema:**

```bash
curl -X POST http://localhost:8000/api/schemas \
  -H "X-API-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "User Table",
    "fields": [
      { "name": "id",    "type": "guid" },
      { "name": "name",  "type": "full_name" },
      { "name": "email", "type": "email" },
      { "name": "city",  "type": "city" },
      { "name": "state", "type": "state" }
    ]
  }'
```

### Field Options

Certain field types accept an `options` object to configure their output:

| Type | Option | Type | Default | Description |
|---|---|---|---|---|
| `number` | `min` | float | `0` | Minimum value |
| `number` | `max` | float | `1000` | Maximum value |
| `number` | `decimals` | int | `0` | Decimal places |
| `sequence` | `start` | int | `1` | Starting value |
| `sequence` | `step` | int | `1` | Increment per row |
| `fixed_value` | `value` | string | `""` | The fixed value for every row |
| `custom_list` | `values` | string[] | `[]` | List to pick from randomly |
| `weighted_list` | `items` | `{value, weight}[]` | `[]` | Weighted random selection |
| `email` | `domain` | string | random | Force a specific email domain |
| `date` | `start_date` | string | `-5y` | Start of date range (`-5y`, `2020-01-01`) |
| `date` | `end_date` | string | `today` | End of date range |
| `date` | `format` | string | `%Y-%m-%d` | Python strftime format string |
| `price` | `min` | float | `0.99` | Minimum price |
| `price` | `max` | float | `999.99` | Maximum price |
| `words` | `count` | int | `3` | Number of words |
| `lorem_ipsum` | `sentences` | int | `3` | Number of sentences |
| `text` | `max_chars` | int | `300` | Maximum character count |
| `regex` | `pattern` | string | `???###` | Pattern using `?` (letter) and `#` (digit) |
| `gender` | `values` | string[] | see below | List of gender options to pick from |

---

## Field Types

Flanufactured includes 93 common field types and 16 advanced types (shown in the picker only when "Show advanced" is enabled). Advanced types are functional but less commonly needed.

### Core (13)
| Type | Description |
|---|---|
| `row_number` | Sequential integer starting at 1 |
| `guid` | UUID v4 |
| `boolean` | `true` or `false` |
| `null_boolean` | `true`, `false`, or `null` *(advanced)* |
| `fixed_value` | Same value for every row |
| `custom_list` | Random pick from a user-defined list |
| `weighted_list` | Weighted random pick from a user-defined list |
| `number` | Random number with configurable min, max, decimals |
| `sequence` | Incrementing number with configurable start and step |
| `regex` | String matching a pattern |
| `md5` | MD5 hash string |
| `sha256` | SHA-256 hash string |
| `sha1` | SHA-1 hash string *(advanced)* |

### Personal (18)
| Type | Description |
|---|---|
| `first_name` | Given name |
| `last_name` | Family name |
| `full_name` | First and last name |
| `name_male` | Male-presenting full name |
| `name_female` | Female-presenting full name |
| `prefix` | Name prefix (Mr., Dr., Prof.) |
| `suffix` | Name suffix (Jr., PhD, III) |
| `email` | Email address — derives from `first_name`/`last_name` fields if present in the same schema |
| `username` | Username — derives from name fields if present |
| `password` | Random password string |
| `gender` | Configurable list of gender values |
| `date_of_birth` | Date of birth, age 18–90 |
| `age` | Integer age 18–90 |
| `phone` | Locale-aware phone number |
| `ssn` | US Social Security Number format |
| `language_name` | Human language name |
| `avatar_url` | Gravatar placeholder URL |
| `job_title` | Random job title |
| `locale_code` | Locale identifier like `en_US` *(advanced)* |

### Location (13)
| Type | Description |
|---|---|
| `street_address` | Full street address line |
| `street_name` | Street name only |
| `building_number` | House or building number *(advanced)* |
| `address_line_2` | Apt/Suite/PO Box |
| `city` | City — consistent with `state` if present in the same schema |
| `state` | US state — consistent with `city` if present |
| `postal_code` | ZIP or postal code |
| `country` | Country name |
| `latitude` | Decimal latitude |
| `longitude` | Decimal longitude |
| `timezone` | Timezone name |
| `military_apo` | Military APO/FPO address *(advanced)* |
| `local_latlng` | Coordinates of a real city *(advanced)* |

### Internet (16)
| Type | Description |
|---|---|
| `url` | Full URL with protocol |
| `uri` | Full URI with path |
| `uri_path` | Path component only *(advanced)* |
| `slug` | URL-friendly slug |
| `domain` | Domain name without protocol |
| `tld` | Top-level domain (.com, .org) |
| `ip_address_v4` | IPv4 address |
| `ip_address_v6` | IPv6 address |
| `mac_address` | Network MAC address |
| `port_number` | Network port 0–65535 |
| `http_method` | HTTP verb (GET, POST, PUT, DELETE…) |
| `http_status_code` | HTTP response status code |
| `user_agent` | Browser user agent string |
| `mime_type` | MIME type string |
| `android_platform_token` | Android user-agent token *(advanced)* |
| `ios_platform_token` | iOS user-agent token *(advanced)* |

### Finance (14)
| Type | Description |
|---|---|
| `currency_code` | ISO 4217 currency code |
| `price` | Decimal amount with configurable range |
| `pricetag` | Formatted price with currency symbol |
| `credit_card` | Valid-format credit card number |
| `iban` | International Bank Account Number |
| `swift` | SWIFT/BIC bank code |
| `bban` | Basic Bank Account Number *(advanced)* |
| `cryptocurrency_name` | Cryptocurrency name |
| `cryptocurrency_code` | Cryptocurrency ticker symbol |
| `company_name` | Company name |
| `catch_phrase` | Company catch phrase |
| `bs` | Corporate buzzword phrase |
| `industry` | Business industry name |
| `department` | Company department name |

### Vehicle (4)
| Type | Description |
|---|---|
| `car_make` | Car manufacturer — sets context for model/year |
| `car_model` | Model — consistent with `car_make` if present |
| `car_year` | Production year — consistent with `car_make` if present |
| `car_vin` | Vehicle Identification Number |

### DateTime (4)
| Type | Description |
|---|---|
| `date` | Configurable date range and strftime format |
| `time` | Random time HH:MM:SS |
| `datetime` | ISO 8601 datetime string |
| `unix_timestamp` | Seconds since epoch |

### Text (22)
| Type | Description |
|---|---|
| `word` | Single random word |
| `words` | 2–5 random words (configurable) |
| `sentence` | Random sentence |
| `paragraph` | Random paragraph |
| `text` | Multi-sentence text block (configurable max chars) |
| `lorem_ipsum` | Classic placeholder text (configurable sentence count) |
| `version` | Semantic version string (e.g. `3.4.1`) |
| `hex_color` | Hex color code (#RRGGBB) |
| `rgb_color` | RGB tuple string |
| `rgb_css_color` | CSS `rgb()` string *(advanced)* |
| `color_name` | Human color name |
| `safe_color_name` | Web-safe color name *(advanced)* |
| `safe_hex_color` | Web-safe hex color *(advanced)* |
| `json_blob` | Small random JSON object |
| `file_name` | Random filename with extension |
| `file_extension` | File extension only |
| `file_path` | Random filesystem path *(advanced)* |
| `isbn13` | ISBN-13 book identifier |
| `isbn10` | ISBN-10 book identifier *(advanced)* |
| `ean13` | EAN-13 barcode number |
| `ean8` | EAN-8 barcode number *(advanced)* |
| `language_name` | Human language name |

### Wacky (9)
Absurdist fields for testing UIs, generating character data, or just having fun.

| Type | Description |
|---|---|
| `animal` | Random animal species (50+ options) |
| `spirit_animal` | Adjective + animal (e.g. "Anxious Capybara") |
| `sworn_enemy` | A job title to fear |
| `favorite_drug` | Prescription medication name |
| `last_meal` | Random food item |
| `favorite_word` | A single random word |
| `takes_naps` | Napping frequency |
| `enemy_of_state` | Boolean wanted status |
| `rival_city` | A nearby city to resent — consistent with `city`/`state` if present |

---

## Schema File Format

Schemas can be exported and imported as JSON files. The format is:

```json
{
  "id": "a3f1c2d4-...",
  "name": "My Schema",
  "created": "2024-01-15T10:30:00+00:00",
  "modified": "2024-01-15T10:30:00+00:00",
  "fields": [
    {
      "name": "id",
      "type": "guid",
      "options": null
    },
    {
      "name": "score",
      "type": "number",
      "options": {
        "min": 0,
        "max": 100,
        "decimals": 2
      }
    },
    {
      "name": "status",
      "type": "custom_list",
      "options": {
        "values": ["active", "inactive", "pending"]
      }
    }
  ]
}
```

When importing, the `id`, `created`, and `modified` fields are ignored — a new schema is created with a fresh ID. Only `name` and `fields` are required in an import file.

---

## Architecture

```
flanufactured/
├── backend/          # FastAPI application (Python 3.12)
└── frontend/         # React application (Vite + React 18)
```

### Backend

**Framework:** FastAPI with Uvicorn  
**Data generation:** [Faker](https://faker.readthedocs.io/) library  
**Storage:** JSON files on disk — no database required  
**Auth:** Single shared API key via `X-API-Key` header

The backend is structured as a standard FastAPI application with three routers:

- `routers/generate.py` — data generation endpoints
- `routers/schemas.py` — schema CRUD endpoints  
- `routers/settings.py` — API key management endpoints

**`generator.py`** is the core of the application. It contains:
- `FIELD_TYPES` — the registry of all 115 field types with labels, descriptions, categories, and example values
- `_generate_value()` — dispatches a single field value given its type, options, and row context
- `generate_row()` — generates one row by calling `_generate_value()` for each field, passing a shared `row_context` dict so relational fields (city/state, car make/model, email from name) can see what other fields in the same row have already produced
- `generate_dataset()` — generates N rows and serializes to JSON or CSV

**`schema_store.py`** provides a simple file-based CRUD layer. Each schema is stored as an individual JSON file named `{uuid}.json` in `DATA_DIR`. The settings/key config is stored in `DATA_DIR/.config`.

**`auth.py`** reads the active API key dynamically on every request (via `get_active_api_key()`) so a rolled key takes effect immediately without a restart.

### Frontend

**Framework:** React 18 with React Router v6  
**Build tool:** Vite  
**Styling:** Tailwind CSS (utility classes) + CSS custom properties for theming  
**Drag and drop:** `@dnd-kit/core` and `@dnd-kit/sortable`  
**HTTP client:** Axios (with request interceptor for API key injection)  
**Icons:** Lucide React

**Key design decisions:**

- **Theming** — All colors are CSS custom properties on `:root`. `applyTheme()` in `useSettings.js` writes directly to `document.documentElement.style`, so theme and accent color changes apply instantly to every component without re-renders.
- **Settings persistence** — A single `flanufactured_settings` key in `localStorage` stores all UI preferences. The `useSettings` hook reads this on mount and writes on every change.
- **API key storage** — The API key is stored in `localStorage` so the web UI stays authenticated across browser restarts. Use **Settings → API Key → Clear stored key** to remove it from the browser and server config.
- **Portals** — The field type picker modal renders via `createPortal` into `document.body`, escaping the DOM stacking context of its parent `FieldRow`. This ensures it renders above everything and is not clipped by the layout.
- **Auto-naming** — Fields with no name are assigned one based on their type before any API call. Duplicates get `_1`, `_2` suffixes. This happens only in the outgoing payload; the UI fields themselves are not modified.
- **Row context** — The backend passes a `row_context` dict through `generate_row()`. Each generated value is stored in it by both field name and field type, allowing downstream fields to see what was already generated for that row.

### Docker Build

The `Dockerfile` uses a two-stage build:

1. **Stage 1 (`frontend-builder`)** — Node 20 Alpine image runs `npm install && npm run build`, producing a static `dist/` directory
2. **Stage 2 (`final`)** — Python 3.12 slim image installs Python dependencies, copies the backend source, and copies the compiled frontend from stage 1 into `./frontend/dist`

At runtime, FastAPI serves the React SPA via a catch-all route that returns `index.html` for any non-API path. The React app makes all API calls to `/api/...` on the same origin, so no CORS configuration is needed in production.

---

## Development Setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Create a .env file
echo "API_KEY=dev-key-12345" > .env

# Start the dev server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Swagger UI is at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server starts on `http://localhost:5173` and proxies `/api` requests to `http://localhost:8000` (configured in `vite.config.js`).

### Running Both Together

Open two terminals:

```bash
# Terminal 1
cd backend && uvicorn main:app --reload --port 8000

# Terminal 2
cd frontend && npm run dev
```

Then open `http://localhost:5173`.

---

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for development workflow, code style notes, and guidance on adding new field types.

---

## Project Structure

```
flanufactured/
├── .env.example                 # Environment variable template
├── .gitignore
├── Dockerfile                   # Two-stage build
├── docker-compose.yml
│
├── backend/
│   ├── main.py                  # FastAPI app, router registration, SPA serving
│   ├── config.py                # Pydantic settings (reads from env / .env)
│   ├── auth.py                  # X-API-Key header validation
│   ├── models.py                # Pydantic request/response models
│   ├── generator.py             # Field type registry and data generation engine
│   ├── schema_store.py          # File-based schema CRUD
│   ├── requirements.txt
│   └── routers/
│       ├── generate.py          # POST /api/generate, GET /api/field-types
│       ├── schemas.py           # CRUD for /api/schemas
│       └── settings.py         # API key management /api/settings
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js           # Dev proxy: /api → localhost:8000
    ├── tailwind.config.js
    └── src/
        ├── main.jsx             # React entry point
        ├── App.jsx              # Root component, routing, usage stats
        ├── api.js               # All API calls, axios client, triggerDownload
        ├── useSettings.js       # Settings persistence, theme engine, accent presets
        ├── SettingsContext.jsx  # React context for settings
        │
        ├── components/
        │   ├── Navbar.jsx           # Top navigation bar
        │   ├── FieldRow.jsx         # Single draggable field row
        │   ├── FieldOptions.jsx     # Per-type options panels
        │   ├── FieldTypePicker.jsx  # Searchable type picker modal (portaled)
        │   ├── Portal.jsx           # createPortal wrapper
        │   ├── PreviewTable.jsx     # Data preview table
        │   ├── DownloadModal.jsx    # Download dialog
        │   ├── SaveSchemaModal.jsx  # Save/name dialog
        │   ├── Toast.jsx            # Notification system
        │   └── ApiKeyModal.jsx      # (legacy, unused in current flow)
        │
        └── pages/
            ├── Builder.jsx          # Schema builder page
            ├── Library.jsx          # Schema library page
            └── Settings.jsx         # Settings page
```

---

## License

MIT
