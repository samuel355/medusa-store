---
id: commerce-007
scope: legacy-commerce-cleanup
status: pending
depends-on: [commerce-002, commerce-003, commerce-004, commerce-005, commerce-006]
---

# Objective

Remove redundant custom commerce routes, SQL modules, and tables only after every Medusa-backed path passes verification and data-retention requirements are confirmed.

# Context

- `docs/architecture/commerce.md`

# Path

- `src/app/api/`
- `src/lib/db/`
- `database/supabase/`
- `docs/`

# Verification

- Full typecheck/build, route smoke tests, migration audit, and confirmation that no storefront import references removed modules.

