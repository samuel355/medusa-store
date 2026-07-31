"use client";

import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ProductCard } from "@/components/storefront/ProductCard";
import { useToast } from "@/components/storefront/Toast";
import { type StoreProduct } from "@/lib/db/products";
import { useCart } from "@/lib/medusa/cart";
import { fetchWishlist, toggleWishlistItem } from "@/lib/utils/wishlist";

type ProductCatalogProps = {
  departments: string[];
  products: StoreProduct[];
};

const PILLS = ["New arrivals", "Best sellers", "Sale", "In stock", "Top rated", "Same-day Accra"];
const PRICE_BANDS = ["Any price", "Under GH₵200", "Under GH₵300", "GH₵300 - GH₵500", "Over GH₵500"];
const SHOP_NAV_GENDERS = ["Men", "Women"] as const;

export function ProductCatalog({ departments, products: catalogProducts }: ProductCatalogProps) {
  const { addToCart: addVariantToCart, error: cartError } = useCart();
  const { showToast } = useToast();
  const [category, setCategory] = useState("All categories");
  // Subcategory names like "Footwear" aren't unique to a gender, so this
  // scopes the filter to the selected gender's subcategory only.
  const [genderScope, setGenderScope] = useState<string | null>(null);
  const [delivery, setDelivery] = useState("Any delivery speed");
  const [payment, setPayment] = useState("Paystack enabled");
  const [activePill, setActivePill] = useState("");
  const [sort, setSort] = useState("Featured");
  const [priceBand, setPriceBand] = useState("Any price");
  const [size, setSize] = useState("Any size");
  const [color, setColor] = useState("Any color");
  const [fit, setFit] = useState("Any fit");
  const [occasion, setOccasion] = useState("Any occasion");
  const [fabric, setFabric] = useState("Any fabric");
  const [brand, setBrand] = useState("Any brand");
  const [availability, setAvailability] = useState("Any availability");
  const [discount, setDiscount] = useState("Any discount");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [saved, setSaved] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [openNavMenu, setOpenNavMenu] = useState<string | null>(null);
  const shopNavRef = useRef<HTMLDivElement>(null);
  const pageSize = 8;

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (shopNavRef.current && !shopNavRef.current.contains(event.target as Node)) {
        setOpenNavMenu(null);
      }
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const categoryParam = params.get("category");
    const pillParam = params.get("pill");
    const priceParam = params.get("price");
    const queryParam = params.get("q");
    const storedQuery = window.localStorage.getItem("begnon_search");
    // Deferred to an effect since these read browser-only APIs unavailable during SSR.
    if (categoryParam && departments.includes(categoryParam)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCategory(categoryParam);
      if (categoryParam === "Men" || categoryParam === "Women") {
        setGenderScope(categoryParam);
      }
    }
    if (pillParam && PILLS.includes(pillParam)) {
      setActivePill(pillParam);
    }
    if (priceParam && PRICE_BANDS.includes(priceParam)) {
      setPriceBand(priceParam);
    }
    if (queryParam) {
      setQuery(queryParam);
    } else if (storedQuery) {
      setQuery(storedQuery);
      window.localStorage.removeItem("begnon_search");
    }
    fetchWishlist().then((items) => setSaved(items.map((item) => item.productId)));
  }, [departments]);

  const facets = useMemo(() => {
    const sizes = new Set<string>();
    const colors = new Set<string>();
    const fits = new Set<string>();
    const occasions = new Set<string>();
    const fabrics = new Set<string>();
    const brands = new Set<string>();

    for (const product of catalogProducts) {
      product.sizes.forEach((item) => sizes.add(item));
      product.colors.forEach((item) => colors.add(item));
      if (product.fit) fits.add(product.fit);
      product.occasion.forEach((item) => occasions.add(item));
      if (product.fabric) fabrics.add(product.fabric);
      if (product.brand) brands.add(product.brand);
    }

    return {
      sizes: Array.from(sizes),
      colors: Array.from(colors),
      fits: Array.from(fits),
      occasions: Array.from(occasions),
      fabrics: Array.from(fabrics),
      brands: Array.from(brands),
    };
  }, [catalogProducts]);

  const genderSubcategories = useMemo(() => {
    const build = (gender: string) => {
      const counts = new Map<string, number>();
      for (const product of catalogProducts) {
        if (product.category === gender && product.subcategory) {
          counts.set(product.subcategory, (counts.get(product.subcategory) ?? 0) + 1);
        }
      }
      return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
    };
    return { Men: build("Men"), Women: build("Women") };
  }, [catalogProducts]);

  const products = useMemo(() => {
    const filtered = catalogProducts.filter((product) => {
      const categoryMatch =
        category === "All categories"
          ? true
          : genderScope
            ? product.category === genderScope && (category === genderScope || product.subcategory === category)
            : product.category === category || product.subcategory === category || product.collection === category;
      const deliveryMatch =
        delivery === "Any delivery speed" || product.delivery.toLowerCase().includes(delivery.toLowerCase());
      const stockMatch =
        (activePill !== "In stock" || product.stock === "In stock") &&
        (availability === "Any availability" ||
          product.stock === availability ||
          product.branchStock.some((stock) => stock.location === availability && stock.quantity > 0));
      const ratingMatch = activePill !== "Top rated" || Number(product.rating) >= 4.8;
      const deliveryPillMatch =
        activePill !== "Same-day Accra" || product.delivery.toLowerCase().includes("same-day accra");
      const isOnSale = product.discountEligible || product.oldPrice > product.price;
      const merchandisingMatch =
        (activePill !== "New arrivals" || product.isNewArrival) &&
        (activePill !== "Best sellers" || product.isBestSeller) &&
        (activePill !== "Sale" || isOnSale);
      const priceMatch =
        priceBand === "Any price" ||
        (priceBand === "Under GH₵200" && product.price < 200) ||
        (priceBand === "Under GH₵300" && product.price < 300) ||
        (priceBand === "GH₵300 - GH₵500" && product.price >= 300 && product.price <= 500) ||
        (priceBand === "Over GH₵500" && product.price > 500);
      const attributeMatch =
        (size === "Any size" || product.sizes.includes(size)) &&
        (color === "Any color" || product.colors.includes(color)) &&
        (fit === "Any fit" || product.fit === fit) &&
        (occasion === "Any occasion" || product.occasion.includes(occasion)) &&
        (fabric === "Any fabric" || product.fabric === fabric) &&
        (brand === "Any brand" || product.brand === brand) &&
        (discount === "Any discount" ||
          (discount === "Discount eligible" ? isOnSale : !isOnSale));
      const queryMatch =
        !query.trim() ||
        [
          product.name,
          product.category,
          product.subcategory,
          product.collection,
          product.description,
          product.badge,
          product.brand,
          product.fabric,
          product.fit,
          ...product.colors,
          ...product.sizes,
          ...product.occasion,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query.trim().toLowerCase());
      return (
        categoryMatch &&
        deliveryMatch &&
        stockMatch &&
        ratingMatch &&
        deliveryPillMatch &&
        merchandisingMatch &&
        priceMatch &&
        attributeMatch &&
        queryMatch
      );
    });

    return filtered.sort((left, right) => {
      if (sort === "Price low to high") return left.price - right.price;
      if (sort === "Price high to low") return right.price - left.price;
      if (sort === "Top rated") return Number(right.rating) - Number(left.rating);
      if (sort === "Popularity") return right.popularity - left.popularity;
      if (sort === "Newest arrivals") return Number(right.isNewArrival) - Number(left.isNewArrival);
      if (sort === "Best sellers") return Number(right.isBestSeller) - Number(left.isBestSeller);
      return 0;
    });
  }, [
    activePill,
    availability,
    brand,
    catalogProducts,
    category,
    color,
    delivery,
    discount,
    fabric,
    fit,
    genderScope,
    occasion,
    priceBand,
    query,
    size,
    sort,
  ]);

  const pageCount = Math.max(1, Math.ceil(products.length / pageSize));
  const paginatedProducts = products.slice((page - 1) * pageSize, page * pageSize);

  // Reset to page 1 when filters change; adjusted during render (not an
  // effect) so it applies before this render commits.
  const filterKey = JSON.stringify([activePill, availability, brand, category, color, delivery, discount, fabric, fit, genderScope, occasion, priceBand, query, size, sort]);
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  async function addToCart(product: StoreProduct) {
    const defaultSize = product.sizes[0];
    const defaultColor = product.colors[0];
    try {
      await addVariantToCart(product.variantId, 1);
      showToast(`${product.name} added to cart${defaultSize || defaultColor ? ` (${[defaultSize, defaultColor].filter(Boolean).join(" / ")})` : ""}.`);
    } catch {
      // The shared provider exposes the mutation error in the visible alert.
    }
  }

  function resetFilters() {
    setCategory("All categories");
    setGenderScope(null);
    setDelivery("Any delivery speed");
    setPriceBand("Any price");
    setSize("Any size");
    setColor("Any color");
    setFit("Any fit");
    setOccasion("Any occasion");
    setFabric("Any fabric");
    setBrand("Any brand");
    setAvailability("Any availability");
    setDiscount("Any discount");
    setPayment("Paystack enabled");
    setSort("Featured");
    setActivePill("");
    setQuery("");
  }

  const isAllActive = category === "All categories" && !genderScope && !activePill && priceBand === "Any price";

  const activeFilterCount = [
    category !== "All categories",
    delivery !== "Any delivery speed",
    priceBand !== "Any price",
    size !== "Any size",
    color !== "Any color",
    fit !== "Any fit",
    occasion !== "Any occasion",
    fabric !== "Any fabric",
    brand !== "Any brand",
    availability !== "Any availability",
    discount !== "Any discount",
    query.trim().length > 0,
  ].filter(Boolean).length;

  return (
    <section id="products" className="ed-shop">
      <div className="ed-shop-head">
        <h1>All products</h1>
        <div className="ed-shop-toolbar">
          <label className="ed-search">
            <Search size={15} />
            <input
              aria-label="Search shop products"
              placeholder="Search products..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="ed-sort">
            <span>Sort</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option>Featured</option>
              <option>Newest arrivals</option>
              <option>Best sellers</option>
              <option>Popularity</option>
              <option>Price low to high</option>
              <option>Price high to low</option>
              <option>Top rated</option>
            </select>
          </label>
        </div>
      </div>

      <div className="ed-shop-bar">
        <div className="ed-shop-nav" ref={shopNavRef}>
          <button
            type="button"
            className={isAllActive ? "is-active" : ""}
            onClick={() => {
              setCategory("All categories");
              setGenderScope(null);
              setActivePill("");
              setPriceBand("Any price");
              setOpenNavMenu(null);
            }}
          >
            All
          </button>
          {SHOP_NAV_GENDERS.map((gender) => {
            const subcategories = genderSubcategories[gender];
            const isGenderActive =
              category === gender || (genderScope === gender && subcategories.some((sub) => sub.name === category));
            return (
              <div className="ed-shop-nav-item" key={gender}>
                <button
                  type="button"
                  className={isGenderActive ? "is-active" : ""}
                  onClick={() => {
                    if (isGenderActive) {
                      setCategory("All categories");
                      setGenderScope(null);
                      setOpenNavMenu(null);
                    } else {
                      setCategory(gender);
                      setGenderScope(gender);
                      setOpenNavMenu(gender);
                    }
                  }}
                >
                  {gender}
                  {subcategories.length > 0 ? <ChevronDown size={13} /> : null}
                </button>
                {subcategories.length > 0 && openNavMenu === gender ? (
                  <div className="ed-shop-nav-dropdown">
                    {subcategories.map((sub) => (
                      <button
                        type="button"
                        key={sub.name}
                        className={genderScope === gender && category === sub.name ? "is-active" : ""}
                        onClick={() => {
                          setCategory(sub.name);
                          setGenderScope(gender);
                          setOpenNavMenu(null);
                        }}
                      >
                        {sub.name}
                        <span>{sub.count}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
          <button
            type="button"
            className={activePill === "New arrivals" ? "is-active" : ""}
            onClick={() => setActivePill(activePill === "New arrivals" ? "" : "New arrivals")}
          >
            New Arrivals
          </button>
          <button
            type="button"
            className={priceBand === "Under GH₵200" ? "is-active" : ""}
            onClick={() => setPriceBand(priceBand === "Under GH₵200" ? "Any price" : "Under GH₵200")}
          >
            Under GH₵200
          </button>
        </div>
        <button type="button" className="ed-filter-trigger" onClick={() => setIsFilterOpen(true)}>
          <SlidersHorizontal size={15} />
          Filters
          {activeFilterCount > 0 ? <span>{activeFilterCount}</span> : null}
        </button>
        <p className="ed-shop-count">
          <strong>{products.length}</strong> {products.length === 1 ? "item" : "items"}
        </p>
      </div>

      <div className="ed-shop-layout">
        <button
          type="button"
          className={`ed-filter-backdrop ${isFilterOpen ? "is-open" : ""}`}
          aria-label="Close filters"
          onClick={() => setIsFilterOpen(false)}
        />
        <aside className={`ed-filter-panel ${isFilterOpen ? "is-open" : ""}`}>
          <div className="ed-filter-head">
            <h3>Refine</h3>
            <button type="button" onClick={resetFilters}>
              Reset
            </button>
            <button type="button" className="ed-filter-close" aria-label="Close filters" onClick={() => setIsFilterOpen(false)}>
              <X size={16} />
            </button>
          </div>

          <div className="ed-filter-section">
            <label>
              <span>Category</span>
              <select
                value={category}
                onChange={(event) => {
                  const value = event.target.value;
                  setCategory(value);
                  setGenderScope(value === "Men" || value === "Women" ? value : null);
                }}
              >
                <option>All categories</option>
                {departments.slice(0, 10).map((department) => (
                  <option key={department}>{department}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="ed-filter-section">
            <label>
              <span>Size</span>
              <select value={size} onChange={(event) => setSize(event.target.value)}>
                <option>Any size</option>
                {facets.sizes.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Color</span>
              <select value={color} onChange={(event) => setColor(event.target.value)}>
                <option>Any color</option>
                {facets.colors.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Fit</span>
              <select value={fit} onChange={(event) => setFit(event.target.value)}>
                <option>Any fit</option>
                {facets.fits.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Occasion</span>
              <select value={occasion} onChange={(event) => setOccasion(event.target.value)}>
                <option>Any occasion</option>
                {facets.occasions.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="ed-filter-section">
            <label>
              <span>Price</span>
              <select value={priceBand} onChange={(event) => setPriceBand(event.target.value)}>
                <option>Any price</option>
                <option>Under GH₵200</option>
                <option>Under GH₵300</option>
                <option>GH₵300 - GH₵500</option>
                <option>Over GH₵500</option>
              </select>
            </label>
            <label>
              <span>Availability</span>
              <select value={availability} onChange={(event) => setAvailability(event.target.value)}>
                <option>Any availability</option>
                <option>In stock</option>
                <option>Low stock</option>
                <option>Accra Flagship</option>
                <option>Kumasi Branch</option>
                <option>Takoradi Warehouse</option>
              </select>
            </label>
            <label>
              <span>Discount</span>
              <select value={discount} onChange={(event) => setDiscount(event.target.value)}>
                <option>Any discount</option>
                <option>Discount eligible</option>
                <option>Full-price only</option>
              </select>
            </label>
          </div>
          <div className="ed-filter-section">
            <label>
              <span>Fabric</span>
              <select value={fabric} onChange={(event) => setFabric(event.target.value)}>
                <option>Any fabric</option>
                {facets.fabrics.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Brand</span>
              <select value={brand} onChange={(event) => setBrand(event.target.value)}>
                <option>Any brand</option>
                {facets.brands.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Delivery</span>
              <select value={delivery} onChange={(event) => setDelivery(event.target.value)}>
                <option>Any delivery speed</option>
                <option>Same-day Accra</option>
                <option>Nationwide dispatch</option>
              </select>
            </label>
            <label>
              <span>Payment</span>
              <select value={payment} onChange={(event) => setPayment(event.target.value)}>
                <option>Paystack enabled</option>
                <option>Mobile money</option>
                <option>Cards</option>
              </select>
            </label>
          </div>

          <button type="button" className="ed-filter-apply" onClick={() => setIsFilterOpen(false)}>
            Show {products.length} {products.length === 1 ? "result" : "results"}
          </button>
        </aside>

        {paginatedProducts.length > 0 ? (
          <div className="ed-product-grid ed-shop-grid">
            {paginatedProducts.map((product) => (
              <ProductCard
                key={product.slug}
                product={product}
                saved={saved.includes(product.id)}
                onWishlistToggle={async () => {
                  const result = await toggleWishlistItem(product.id);
                  if (result.requiresAuth) {
                    showToast("Sign in to save products to your wishlist.");
                    return;
                  }
                  setSaved((current) =>
                    result.inWishlist ? [...current, product.id] : current.filter((id) => id !== product.id)
                  );
                }}
                onQuickAdd={() => addToCart(product)}
              />
            ))}
          </div>
        ) : (
          <div className="ed-empty">
            <h2>No products found.</h2>
            <p>Nothing matches these filters yet. Try clearing the search or choosing another category, delivery speed, or price range.</p>
            <button className="ed-text-link" type="button" onClick={resetFilters}>
              Reset filters
            </button>
          </div>
        )}
      </div>

      {cartError ? (
        <p className="ed-notice" role="alert">
          {cartError.message}
        </p>
      ) : null}

      {paginatedProducts.length > 0 ? (
        <div className="ed-pagination" aria-label="Product pages">
          <button disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            Previous
          </button>
          {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
            <button
              className={page === pageNumber ? "is-active" : ""}
              key={pageNumber}
              onClick={() => setPage(pageNumber)}
            >
              {pageNumber}
            </button>
          ))}
          <button disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>
            Next
          </button>
        </div>
      ) : null}
    </section>
  );
}
