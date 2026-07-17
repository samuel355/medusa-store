"use client";

import { BadgeCheck, Bell, Heart, PackageCheck, Search, ShoppingBag, SlidersHorizontal, Star, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { type StoreProduct } from "@/lib/db/products";
import { addToCart as addVariantToCart } from "@/lib/utils/cart";
import { formatMoney } from "@/lib/utils/money";
import { fetchWishlist, toggleWishlistItem } from "@/lib/utils/wishlist";

type ProductCatalogProps = {
  departments: string[];
  products: StoreProduct[];
};

const colorSwatches: Record<string, string> = {
  Black: "#111827",
  Blue: "#2563eb",
  Brown: "#92400e",
  Cream: "#f5f0e8",
  Gold: "#d97706",
  Green: "#15803d",
  Grey: "#6b7280",
  Navy: "#1e3a8a",
  Orange: "#ea580c",
  Pink: "#ec4899",
  Purple: "#7c3aed",
  Red: "#dc2626",
  Tan: "#c19a6b",
  White: "#ffffff",
  Yellow: "#facc15",
};

function getSwatchColor(colorName: string) {
  return colorSwatches[colorName] ?? "#f97316";
}

export function ProductCatalog({ departments, products: catalogProducts }: ProductCatalogProps) {
  const [category, setCategory] = useState("All categories");
  const [delivery, setDelivery] = useState("Any delivery speed");
  const [payment, setPayment] = useState("Paystack enabled");
  const [activePill, setActivePill] = useState("New arrivals");
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
  const [notice, setNotice] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const pageSize = 8;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const categoryParam = params.get("category");
    const queryParam = params.get("q");
    const storedQuery = window.localStorage.getItem("sobalshop_search");
    if (categoryParam && departments.includes(categoryParam)) {
      setCategory(categoryParam);
    }
    if (queryParam) {
      setQuery(queryParam);
    } else if (storedQuery) {
      setQuery(storedQuery);
      window.localStorage.removeItem("sobalshop_search");
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

  const products = useMemo(() => {
    const filtered = catalogProducts.filter((product) => {
      const categoryMatch =
        category === "All categories" ||
        product.category === category ||
        product.subcategory === category ||
        product.collection === category;
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
      const merchandisingMatch =
        (activePill !== "New arrivals" || product.isNewArrival) &&
        (activePill !== "Best sellers" || product.isBestSeller) &&
        (activePill !== "Sale" || product.discountEligible);
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
          (discount === "Discount eligible" ? product.discountEligible : !product.discountEligible));
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
    occasion,
    priceBand,
    query,
    size,
    sort,
  ]);

  const pageCount = Math.max(1, Math.ceil(products.length / pageSize));
  const paginatedProducts = products.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [activePill, availability, brand, category, color, delivery, discount, fabric, fit, occasion, priceBand, query, size, sort]);

  async function addToCart(product: StoreProduct) {
    const defaultSize = product.sizes[0];
    const defaultColor = product.colors[0];
    await addVariantToCart(product.variantId, 1);
    setNotice(`${product.name} added to cart${defaultSize || defaultColor ? ` (${[defaultSize, defaultColor].filter(Boolean).join(" / ")})` : ""}.`);
  }

  function resetFilters() {
    setCategory("All categories");
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
    setActivePill("New arrivals");
    setQuery("");
  }

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
    <section id="products" className="market-section shop-catalog-section">
      <div className="shop-catalog-head">
        <div className="shop-title-block">
          <p className="kicker">Shop the store</p>
          <h2>All products</h2>
        </div>
        <div className="shop-toolbar">
          <label className="shop-search-row">
            <Search size={18} />
            <input
              aria-label="Search shop products"
              placeholder="Search shirts, dresses, kaftans..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="shop-sort-control">
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
        {notice ? <p className="inline-notice shop-notice">{notice}</p> : null}
      </div>
      <div className="shop-shelf-bar">
        <div className="filter-pills">
          {["New arrivals", "Best sellers", "Sale", "In stock", "Top rated", "Same-day Accra"].map((pill) => (
            <button className={activePill === pill ? "active" : ""} key={pill} onClick={() => setActivePill(pill)}>
              {pill}
            </button>
          ))}
        </div>
        <button type="button" className="mobile-filter-trigger" onClick={() => setIsFilterOpen(true)}>
          <SlidersHorizontal size={16} />
          Filters
          {activeFilterCount > 0 ? <span className="filter-count-badge">{activeFilterCount}</span> : null}
        </button>
        <div className="shop-result-count">
          <strong>{products.length}</strong>
          <span>{products.length === 1 ? "item" : "items"}</span>
        </div>
      </div>
      <div className="market-layout shop-catalog-layout">
        <button
          type="button"
          className={`filter-backdrop ${isFilterOpen ? "open" : ""}`}
          aria-label="Close filters"
          onClick={() => setIsFilterOpen(false)}
        />
        <aside className={`filter-panel ${isFilterOpen ? "open" : ""}`}>
          <div className="filter-panel-head">
            <h3>
              <SlidersHorizontal size={18} />
              Refine
            </h3>
            <button type="button" onClick={resetFilters}>
              Reset
            </button>
            <button type="button" className="mobile-filter-close" aria-label="Close filters" onClick={() => setIsFilterOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <div className="active-filter-count">
            <strong>{activeFilterCount}</strong>
            <span>active {activeFilterCount === 1 ? "filter" : "filters"}</span>
          </div>
          <div className="filter-group">
            <p>Category</p>
            <label>
              Department
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option>All categories</option>
                {departments.slice(0, 10).map((department) => (
                  <option key={department}>{department}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="filter-group filter-grid-2">
            <p>Style</p>
            <label>
              Size
              <select value={size} onChange={(event) => setSize(event.target.value)}>
                <option>Any size</option>
                {facets.sizes.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Color
              <select value={color} onChange={(event) => setColor(event.target.value)}>
                <option>Any color</option>
                {facets.colors.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Fit
              <select value={fit} onChange={(event) => setFit(event.target.value)}>
                <option>Any fit</option>
                {facets.fits.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Occasion
              <select value={occasion} onChange={(event) => setOccasion(event.target.value)}>
                <option>Any occasion</option>
                {facets.occasions.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="filter-group">
            <p>Price & stock</p>
            <label>
              Price
              <select value={priceBand} onChange={(event) => setPriceBand(event.target.value)}>
                <option>Any price</option>
                <option>Under GH₵200</option>
                <option>Under GH₵300</option>
                <option>GH₵300 - GH₵500</option>
                <option>Over GH₵500</option>
              </select>
            </label>
            <label>
              Availability
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
              Discount
              <select value={discount} onChange={(event) => setDiscount(event.target.value)}>
                <option>Any discount</option>
                <option>Discount eligible</option>
                <option>Full-price only</option>
              </select>
            </label>
          </div>
          <div className="filter-group">
            <p>Details</p>
            <label>
              Fabric
              <select value={fabric} onChange={(event) => setFabric(event.target.value)}>
                <option>Any fabric</option>
                {facets.fabrics.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Brand
              <select value={brand} onChange={(event) => setBrand(event.target.value)}>
                <option>Any brand</option>
                {facets.brands.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label>
              Delivery
              <select value={delivery} onChange={(event) => setDelivery(event.target.value)}>
                <option>Any delivery speed</option>
                <option>Same-day Accra</option>
                <option>Nationwide dispatch</option>
              </select>
            </label>
            <label>
              Payment
              <select value={payment} onChange={(event) => setPayment(event.target.value)}>
                <option>Paystack enabled</option>
                <option>Mobile money</option>
                <option>Cards</option>
              </select>
            </label>
          </div>
          <div className="filter-checks">
            <span>
              <BadgeCheck size={16} /> SobalShop verified
            </span>
            <span>
              <PackageCheck size={16} /> {delivery}
            </span>
            <span>
              <Bell size={16} /> {payment}
            </span>
          </div>
          <button type="button" className="filter-panel-apply" onClick={() => setIsFilterOpen(false)}>
            Show {products.length} {products.length === 1 ? "result" : "results"}
          </button>
        </aside>

        <div className="wholesale-grid">
          {paginatedProducts.map((product, index) => {
            const discountPercent =
              product.oldPrice > product.price
                ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
                : 0;

            return (
              <article className="wholesale-card shop-product-card" key={product.slug}>
                <button
                  className={`wish-button ${saved.includes(product.id) ? "active" : ""}`}
                  aria-label={`Save ${product.name}`}
                  onClick={async () => {
                    const result = await toggleWishlistItem(product.id);
                    if (result.requiresAuth) {
                      setNotice("Sign in to save products to your wishlist.");
                      return;
                    }
                    setSaved((current) =>
                      result.inWishlist ? [...current, product.id] : current.filter((id) => id !== product.id)
                    );
                  }}
                >
                  <Heart size={17} />
                </button>
                <a className={`wholesale-art shop-product-art product-${index + 1}`} href={`/products/${product.slug}`}>
                  <img src={product.image} alt={product.name} />
                  <div className="shop-product-badges">
                    <span>{product.badge}</span>
                    {discountPercent > 0 ? <span>-{discountPercent}%</span> : null}
                  </div>
                </a>
                <div className="wholesale-copy shop-product-copy">
                  <div className="shop-product-topline shop-card-rating-row">
                    <p>{product.brand}</p>
                    <span>
                      <Star size={13} fill="currentColor" />
                      {product.rating}
                    </span>
                  </div>
                  <a className="shop-product-name" href={`/products/${product.slug}`}>
                    {product.name}
                  </a>
                  <div className="shop-price-row">
                    <strong>{formatMoney(product.price)}</strong>
                    {product.oldPrice ? <s>{formatMoney(product.oldPrice)}</s> : null}
                  </div>
                  <div className="shop-card-bottom-row">
                    <div className="shop-color-row" aria-label={`Available colors: ${product.colors.join(", ")}`}>
                    {product.colors.slice(0, 4).map((item) => (
                      <span
                        aria-label={item}
                        key={item}
                        style={{ background: getSwatchColor(item) }}
                        title={item}
                      />
                    ))}
                    </div>
                    <span className="shop-size-summary">{product.sizes.slice(0, 3).join(" ")}</span>
                  </div>
                  <div className="shop-stock-line">
                    <span>{product.subcategory}</span>
                    <span>{product.stock}</span>
                  </div>
                  <div className="shop-card-actions">
                    <button aria-label={`Add ${product.name} to cart`} onClick={() => addToCart(product)}>
                      <ShoppingBag size={17} />
                      Quick add
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      {!paginatedProducts.length ? (
        <div className="dashboard-panel empty-results">
          <h2>No products match those filters.</h2>
          <p>Clear the search or choose another category, delivery speed, or price range.</p>
          <button
            className="primary-action"
            onClick={resetFilters}
          >
            Reset filters
          </button>
        </div>
      ) : null}
      <div className="pagination-row shop-pagination" aria-label="Product pages">
        <button className="pager-edge" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
          <span aria-hidden="true">‹</span>
          Previous
        </button>
        {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
          <button
            className={page === pageNumber ? "active" : ""}
            key={pageNumber}
            onClick={() => setPage(pageNumber)}
          >
            {pageNumber}
          </button>
        ))}
        <button className="pager-edge" disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>
          Next
          <span aria-hidden="true">›</span>
        </button>
      </div>
    </section>
  );
}
