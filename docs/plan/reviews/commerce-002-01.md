# commerce-002 verification review 01

## Conclusion

**Blocked.** The migration preserves the existing page imports, public URLs, and `StoreProduct` / `StoreCategory` TypeScript shapes, and its unit suite and typecheck pass. However, the product pagination loop can fail to terminate, and category identity is derived from an ordering that the Store API contract does not guarantee. Both defects can break public catalogue routes and should be resolved before `commerce-002` is accepted.

## Findings

### High / blocking — product pagination can loop forever on an empty page

`src/lib/medusa/catalogue/adapter.ts` advances `offset` by `response.products.length`, but its continuation guard checks cumulative `products.length > 0`. After any non-empty page, a subsequent empty page with `offset < count` leaves `offset` unchanged while cumulative `products.length` remains positive. The adapter then requests that same empty page indefinitely. A stale/changing count or an API response with no records before the advertised count is sufficient to hang `/`, `/shop`, static-param generation, and related-product reads.

The continuation condition must use the current page length (and ideally validate forward progress), and an adapter test must cover an empty/truncated later page. Existing adapter tests cover only error wrapping, not pagination.

### High / blocking — primary category and subcategory depend on undefined response order

`src/lib/medusa/catalogue/mapper.ts` assigns `product.categories[0]` as the page-facing department/category and `product.categories[1]` as the subcategory. The Medusa Store API exposes a category collection; the implementation does not establish an ordering or encode which linked category is the department. This assumption controls `StoreProduct.category`, `categoryId`, shop filtering, homepage category counts, and related-product selection. If the API returns the two links in another order, products appear under a subcategory instead of Men/Women, department filters and counts fail, and related products are selected from the wrong category.

The mapping needs a deterministic ownership rule, for example a dedicated product metadata ID/handle for the storefront department (validated against returned categories), or an explicit Medusa category hierarchy that the mapper resolves rather than array position. Add mapper coverage with reversed category order.

### Medium / non-blocking — catalogue contract errors lose their exported error type at the adapter boundary

`mapMedusaProduct` and `mapMedusaCategory` throw `MedusaCatalogueContractError`, but `createCatalogueAdapter` catches those errors and wraps them in `MedusaIntegrationError`. `MedusaCatalogueContractError` is publicly exported from `src/lib/medusa/catalogue/index.ts`, so callers cannot actually observe that type through `medusaCatalogue`. This weakens the intended distinction between a Store API transport/integration failure and an incompatible response contract.

Either preserve/rethrow `MedusaCatalogueContractError` from the adapter or document and test that all adapter failures intentionally normalize to `MedusaIntegrationError`.

### Medium / non-blocking — requested pagination bounds are silently discarded

`listProducts(query)` accepts `StoreProductListParams` but overwrites both `limit` and `offset` on every request. Consequently, `getProductBySlug(... limit: 1)` requests up to 100 records, and related-product reads intended to fetch `limit + 1` traverse the entire matching catalogue. Returned page-facing results happen to be sliced correctly, but the API contract is surprising and makes product detail requests increasingly expensive as the catalogue grows.

Separate an explicitly exhaustive `listAllProducts` path from bounded reads, or honor the caller's requested bound while paginating only when the caller requests exhaustive retrieval. Add tests that assert forwarded filters, region ID, page offsets, and termination.

## Scope and compatibility checks

- Existing routes remain at `/`, `/shop`, and `/products/[slug]`; no route rename was introduced.
- Existing imports from `src/lib/db/products.ts` and `src/lib/db/categories.ts` remain available, including re-exported `StoreProduct`, `BranchStock`, and `StoreCategory` types.
- Public product/category reads now go through the Medusa SDK Store API and use `unstable_cache` (products 60 seconds, categories 300 seconds).
- The catalogue implementation does not add cart, authentication, or checkout behavior. The working tree contains cart/auth performance edits from other work, but no such concerns are implemented under `src/lib/medusa/catalogue` or by the catalogue adapters.
- `src/app/page.tsx` derives deals from the already-loaded catalogue instead of performing a second product read; this preserves the route and visible contract.

## Verification evidence

- `npm run test:unit`: **passed**, 12/12 tests.
- `npm run typecheck`: **passed**.
- Backend health at `http://localhost:9000/health`: unavailable; no backend was listening.
- Storefront checks at `http://localhost:3000/` and `/shop`: unavailable; no storefront was listening.
- A backend start attempt first hit sandboxed Medusa CLI config storage. Retrying with a temporary `XDG_CONFIG_HOME` did not reach a listening health endpoint, so live homepage/shop/product verification could not be completed in this environment.

