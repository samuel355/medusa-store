---
id: commerce-002
scope: storefront-catalogue
status: done
depends-on: [commerce-001]
---

# Objective

Replace storefront product and category SQL reads with cached Medusa Store API adapters while preserving current page-facing types and URLs.

# Context

- `docs/architecture/commerce.md`

# Path

- `src/lib/medusa/catalogue/`
- `src/lib/db/products.ts`
- `src/lib/db/categories.ts`
- `src/app/page.tsx`
- `src/app/shop/page.tsx`
- `src/app/products/`

# Verification

- Typecheck, adapter contract tests, and live homepage/shop/product route checks.
