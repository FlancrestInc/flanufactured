# Changelog

All notable changes to Flanufactured are documented here.

---

## [1.0.0] — Initial Release

### Backend

- FastAPI application with Uvicorn serving on port 8000
- Multi-stage Docker build (Node 20 → Python 3.12 slim)
- Three API routers: `generate`, `schemas`, `settings`
- File-based schema storage — one JSON file per schema in `DATA_DIR`
- Single shared API key authentication via `X-API-Key` header
- API key manageable via environment variable or Settings UI; UI-set key persists to `DATA_DIR/.config` and takes effect immediately without restart
- Key creation date tracked; `/api/settings/key-status` exposes age for UI warning
- `generator.py` field type registry with 115 types across 9 categories
- Row context propagation — city/state, car make/model/year, email/username ← name fields all stay consistent within a row
- JSON and CSV output formats
- Seed support for reproducible output
- Locale support via Faker (20+ locales)
- Hard row cap configurable via `MAX_ROWS` environment variable
- Interactive API docs at `/docs` (Swagger) and `/redoc`
- Health check endpoint at `/health`

### Field Types (109 total, 16 advanced)

- **Core (13):** row_number, guid, boolean, null_boolean†, fixed_value, custom_list, weighted_list, number, sequence, regex, md5, sha256, sha1†
- **Personal (19):** first_name, last_name, full_name, name_male, name_female, prefix, suffix, email, username, password, gender, date_of_birth, age, phone, ssn, language_name, avatar_url, job_title, locale_code†
- **Location (13):** street_address, street_name, building_number†, address_line_2, city, state, postal_code, country, latitude, longitude, timezone, military_apo†, local_latlng†
- **Internet (16):** url, uri, uri_path†, slug, domain, tld, ip_address_v4, ip_address_v6, mac_address, port_number, http_method, http_status_code, user_agent, mime_type, android_platform_token†, ios_platform_token†
- **Finance (14):** currency_code, price, pricetag, credit_card, iban, swift, bban†, cryptocurrency_name, cryptocurrency_code, company_name, catch_phrase, bs, industry, department
- **Vehicle (4):** car_make, car_model, car_year, car_vin
- **DateTime (4):** date, time, datetime, unix_timestamp
- **Text (22):** word, words, sentence, paragraph, text, lorem_ipsum, version, hex_color, rgb_color, rgb_css_color†, color_name, safe_color_name†, safe_hex_color†, json_blob, file_name, file_extension, file_path†, mime_type, isbn13, isbn10†, ean13, ean8†, language_name
- **Wacky (9):** animal, spirit_animal, sworn_enemy, favorite_drug, last_meal, favorite_word, takes_naps, enemy_of_state, rival_city

*† = advanced (hidden by default in the type picker)*

### Frontend

- React 18 single-page application, built with Vite
- Three pages: Builder, Schema Library, Settings
- **Builder page**
  - Drag-and-drop field reordering via `@dnd-kit`
  - Searchable field type picker modal with categorised list and hover-preview panel showing description and example values
  - Advanced types toggle in the picker
  - Per-field options panels for configurable types (number ranges, date formats, custom/weighted lists, etc.)
  - Live preview pane with configurable row count
  - Resizable split pane (drag divider to adjust fields/preview ratio, clamped 25%–75%)
  - Fields with no name auto-assigned their type as a name on export/preview; duplicates get `_1`, `_2` suffixes
  - Schema save/update, import from file, export schema JSON, download data as JSON or CSV
- **Schema Library page**
  - Cards showing schema name, field count, created/modified dates
  - Load into Builder, Export Schema, Download Data, Delete (with optional confirmation)
  - Library downloads routed through `/api/generate/{id}` (schema endpoint)
- **Settings page**
  - Appearance: dark/light theme toggle, phosphor accent color picker (green, amber, cyan, white, pink, custom hex)
  - Export defaults: row count, format, locale, JSON pretty-print toggle
  - Max rows session cap
  - Preview row count (1–100, default 10)
  - Confirm-before-delete toggle
  - Usage stats: schemas saved, previews/downloads/rows this session
  - API key: status badge, creation date with >365-day warning, reveal/copy/roll controls, first-run setup flow
- **Theming** — CSS custom properties written directly to `:root` by `applyTheme()`; changes apply instantly without re-renders; persists across sessions via `localStorage`
- **API key** stored in `sessionStorage` (cleared on browser close)
- Field type picker rendered via React portal (`createPortal`) to escape DOM stacking context
- Toast notification system (success/error/info/warning)
- Phosphor green terminal aesthetic with scanline overlay; dark/light mode supported
