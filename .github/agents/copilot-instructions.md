# @voxpelli/pg-utils - GitHub Copilot Instructions

## Repository Overview

This is a personal PostgreSQL utilities library providing database helpers and test utilities. The library is published as an ESM module for Node.js 20.9.0+ and includes TypeScript type definitions.

## Core Modules

### 1. PgTestHelpers (`lib/test-helpers.js`)
- Main test helper class for PostgreSQL database testing
- Manages test database lifecycle (create/drop tables, load fixtures)
- Supports schema migration via Umzug/Umzeption
- Handles CSV fixture loading with dependency ordering
- Key methods: `initTables()`, `removeTables()`, `loadFixtures()`, `end()`

### 2. csvFromFolderToDb (`lib/csv-folder-to-db.js`)
- Utility function for importing CSV files into PostgreSQL tables
- Uses PostgreSQL COPY command with streaming for performance
- Supports dependency-ordered table insertion
- Files should be named `{table_name}.csv` in the source folder

### 3. Utils (`lib/utils.js`)
- Common utility functions and helpers
- PostgreSQL connection pool creation
- Type checking utilities

## Code Standards & Patterns

### Module System
- **ESM only**: Use `import`/`export` syntax
- **Type annotations**: Use JSDoc comments for TypeScript compatibility
- **Import types**: Use `/** @import { Type } from 'module' */` syntax

### Code Style
- **Linter**: Uses `@voxpelli/eslint-config` (neostandard-based)
- **Security**: Includes security linting rules
- **Formatting**: Consistent with neostandard JavaScript style

### Error Handling
- Use descriptive error messages with `{ cause }` for error chaining
- Custom `TypeNeverError` class for type validation failures
- Always handle async operations with proper error propagation

### Database Patterns
- Use connection pooling (`pg.Pool`) for database operations
- Release connections after use: `client.release()`
- Support both connection strings and existing pool instances
- Use parameterized queries for security

## Testing Structure

### Test Organization
- `test/unit/` - Unit tests for individual modules
- `test/integration/` - Integration tests requiring database
- Database setup in `test/db.js` with connection string configuration

### Test Framework
- **Mocha** for test runner with `chai` assertions
- **c8** for code coverage (lcov + text reports)
- Database tests use real PostgreSQL instances
- Fixtures stored as CSV files for realistic testing

### Test Patterns
```javascript
// Use .should() style assertions
result.should.deep.equal(expected);

// Database integration tests
const testHelpers = new PgTestHelpers({
  connectionString,
  schema: new URL('../schema.sql', import.meta.url),
});
```

## Build & Development

### Scripts
- `npm test` - Run all tests with linting and type checking
- `npm run check` - Lint, type check, and validate without tests
- `npm run build` - Generate TypeScript declarations
- `npm run clean` - Remove generated files

### Dependencies
- **Runtime**: `pg`, `pg-copy-streams`, `umzug`, `umzeption`
- **Dev**: ESLint, TypeScript, Mocha, Chai, c8

### Type Coverage
- Maintains 95%+ type coverage using `type-coverage`
- Types defined in JSDoc comments, compiled to `.d.ts` files
- Uses `@types/pg` for PostgreSQL type definitions

## Common Patterns to Follow

### Constructor Validation
```javascript
constructor(options) {
  if (!options || typeof options !== 'object') {
    throw new TypeNeverError(options, 'Expected an options object');
  }
  // Destructure and validate individual properties
}
```

### Async Database Operations
```javascript
export async function dbOperation(pool, ...args) {
  const client = await pool.connect();
  try {
    // Perform operations
    return result;
  } finally {
    client.release();
  }
}
```

### CSV/File Processing
```javascript
for await (const file of filesInFolder(path, '.csv')) {
  // Process each file
  const tableName = pathModule.basename(file, '.csv');
  // Use streaming for large files
}
```

## When Making Changes

1. **Maintain compatibility**: This is a public npm package
2. **Update type definitions**: JSDoc comments should be comprehensive
3. **Test with real databases**: Integration tests use actual PostgreSQL
4. **Follow semantic versioning**: Breaking changes require major version bump
5. **Document in README.md**: Update usage examples if API changes
6. **Maintain test coverage**: All new code should have corresponding tests

## Security Considerations

- Always use parameterized queries
- Validate file paths before filesystem operations
- Use `security/detect-non-literal-fs-filename` ESLint rule exceptions carefully
- Connection strings may contain credentials - handle securely

## Performance Notes

- Use PostgreSQL COPY command for bulk data imports
- Stream large files instead of loading into memory
- Connection pooling for database operations
- Order table operations to handle foreign key dependencies