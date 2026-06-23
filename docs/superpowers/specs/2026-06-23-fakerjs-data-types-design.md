# FakerJS Data Types Design

## Goal

Expand Flanufactured so its generated data types match the FakerJS API catalog at https://fakerjs.dev/api/ and make those types easy to browse in the existing builder UI. Add a compact per-column blank/null percentage control, without adding a formula button.

## Scope

The target catalog is FakerJS v10.5.0 API modules:

- Airline
- Animal
- Book
- Color
- Commerce
- Company
- Database
- Datatype
- Date
- Finance
- Food
- Git
- Hacker
- Image
- Internet
- Location
- Lorem
- Music
- Number
- Person
- Phone
- Science
- String
- System
- Vehicle
- Word

Exclude FakerJS documentation sections that are not normal data generators, such as Faker, SimpleFaker, Randomizer, Utilities, and Helpers, except where an existing Flanufactured field already provides equivalent builder behavior.

Keep existing Flanufactured utility fields because they are useful schema controls:

- Row Number
- Fixed Value
- Custom List
- Weighted List
- Sequence
- Regex Pattern

## Architecture

The FastAPI backend remains the public API layer. FakerJS-backed values are generated through a small Node helper that imports `@faker-js/faker`. Python continues to own request validation, schema storage, CSV/JSON serialization, seeding orchestration, and row context.

Backend changes:

- Add `@faker-js/faker` as a project dependency for the generation helper.
- Add a structured FakerJS field catalog with category, label, FakerJS path, description, examples, and optional argument defaults.
- Update `/api/field-types` to serve the expanded grouped catalog.
- Route FakerJS field generation through the Node helper while preserving existing Python implementations for Flanufactured utility fields.
- Apply blank/null percentage before field-specific generation.

Frontend changes:

- Update the field type picker to resemble the provided modal pattern: left category navigation with counts, top search, and a multi-column type grid.
- Use FakerJS module names as picker categories.
- Keep search matching label, type key, description, and category.
- Preserve existing keyboard escape close and body-scroll lock behavior.
- Add compact inline `blank: [0] %` controls in each selected field row.
- Do not add a formula button.

## Blank/Null Behavior

Each field stores its blank percentage in `field.options.blank_percent`.

Generation behavior:

- Missing value defaults to `0`.
- Values are clamped to `0` through `100`.
- On each row and field, the backend rolls once before normal generation.
- If the roll succeeds, JSON output contains `null`.
- CSV output writes the cell as blank through the existing CSV writer behavior for `None`.

Changing a field type should preserve `blank_percent` and reset only type-specific options where needed.

## Data Flow

1. Builder loads grouped field types from `/api/field-types`.
2. User selects a type from the category/search modal.
3. User can set the field name and blank percentage inline.
4. Preview/download sends fields with `options.blank_percent`.
5. Backend generates each row in field order.
6. Backend applies blank percentage, then either calls the Python utility generator or the FakerJS helper.
7. Backend returns JSON or CSV as it does today.

## Error Handling

If a FakerJS field path is missing or generation fails, the backend should return a clear generation error rather than silently emitting bad values. The helper should validate requested field keys against the catalog so arbitrary method execution is not exposed through the API.

If Node or `@faker-js/faker` is unavailable, startup or the first generation attempt should fail with an actionable message.

## Testing

Backend tests:

- `blank_percent: 100` always emits `None`.
- `blank_percent: 0` never blanks due to the blank control.
- invalid or out-of-range blank percentages are clamped.
- a representative FakerJS field generates successfully through the helper.
- unknown field types return `None` or the existing fallback behavior only where that is already intentional.

Frontend tests:

- field rows render the inline blank percentage control.
- changing blank percentage updates `field.options.blank_percent`.
- choosing a new type preserves `blank_percent`.
- picker groups and filters FakerJS categories correctly.

## Open Decisions

The implementation plan should decide whether the Node helper is invoked per value, per row, or per batch. Prefer batching enough work to avoid avoidable process overhead while keeping the first implementation simple and testable.
