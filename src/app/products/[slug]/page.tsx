import { ArrowLeft, BadgeCheck, CreditCard, PackageCheck, RotateCcw, ShieldCheck, Star, Truck } from "lucide-react";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/store/AppShell";
import { ProductPurchasePanel } from "@/components/storefront/ProductPurchasePanel";
import { getActiveProducts, getProductBySlug, getRelatedProducts } from "@/lib/db/products";
import { formatMoney } from "@/lib/utils/money";

export async function generateStaticParams() {
  const products = await getActiveProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  return {
    title: product ? `${product.name} | SobalShop` : "Product | SobalShop",
    description: product?.description ?? "Shop products from SobalShop."
  };
}

export default async function ProductDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const galleryImages = product.images.length ? product.images : [product.image, product.image, product.image];
  const relatedProducts = await getRelatedProducts(product.categoryId, product.id, 4);
  const hasSizeOrColor = product.sizes.length > 0 || product.colors.length > 0;
  const hasFabricOrCare = Boolean(product.fabric || product.care);

  return (
    <AppShell className="product-page">
      <section className="product-detail-shell">
        <a className="back-link" href="/shop">
          <ArrowLeft size={17} />
          Back to products
        </a>
        <div className="product-detail-grid">
          <div className="product-gallery">
            <div className="product-main-image">
              <img src={product.image} alt={product.name} />
              <span>{product.badge}</span>
            </div>
            <div className="product-thumbs">
              {galleryImages.slice(0, 3).map((image, index) => (
                <span key={`${image}-${index}`}>
                  <img src={image} alt={`${product.name} view ${index + 1}`} />
                </span>
              ))}
            </div>
          </div>

          <article className="product-info-panel">
            <p className="kicker">{product.category}</p>
            <h1>{product.name}</h1>
            <div className="product-rating-row">
              <span>
                <Star size={16} fill="currentColor" />
                {product.rating}
              </span>
              <span>{product.orders}</span>
              <span>{product.stock}</span>
            </div>
            <p>{product.description}</p>
            <div className="product-price-row">
              <strong>{formatMoney(product.price)}</strong>
              {product.oldPrice ? <s>{formatMoney(product.oldPrice)}</s> : null}
            </div>
            {product.highlights.length > 0 ? (
              <div className="product-highlights">
                {product.highlights.map((highlight) => (
                  <span key={highlight}>
                    <BadgeCheck size={16} />
                    {highlight}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="product-attribute-grid">
              {product.brand ? (
                <span>
                  <small>Brand</small>
                  {product.brand}
                </span>
              ) : null}
              {product.fit ? (
                <span>
                  <small>Fit</small>
                  {product.fit}
                </span>
              ) : null}
              {product.fabric ? (
                <span>
                  <small>Fabric</small>
                  {product.fabric}
                </span>
              ) : null}
              {product.sku ? (
                <span>
                  <small>SKU</small>
                  {product.sku}
                </span>
              ) : null}
            </div>
          </article>

          <aside className="product-buy-box">
            <ProductPurchasePanel product={product} />
            <div className="product-service-list">
              {product.delivery ? (
                <span>
                  <Truck size={17} /> {product.delivery}
                </span>
              ) : null}
              <span>
                <CreditCard size={17} /> Mobile Money primary, card ready
              </span>
              {product.warranty ? (
                <span>
                  <ShieldCheck size={17} /> {product.warranty}
                </span>
              ) : null}
              <span>
                <PackageCheck size={17} /> SMS, WhatsApp, and email updates
              </span>
            </div>
          </aside>
        </div>
      </section>

      {hasSizeOrColor || hasFabricOrCare ? (
        <section className="product-fashion-grid">
          {hasSizeOrColor ? (
            <article>
              <h2>Size and color</h2>
              {product.sizes.length > 0 ? (
                <div className="fashion-chip-row">
                  {product.sizes.map((size) => (
                    <span key={size}>{size}</span>
                  ))}
                </div>
              ) : null}
              {product.colors.length > 0 ? (
                <div className="fashion-chip-row">
                  {product.colors.map((color) => (
                    <span key={color}>{color}</span>
                  ))}
                </div>
              ) : null}
              {product.occasion.length > 0 ? <p>Fit: {product.fit}. Occasion: {product.occasion.join(", ")}.</p> : null}
            </article>
          ) : null}
          {product.branchStock.length > 0 ? (
            <article>
              <h2>Branch stock</h2>
              <div className="branch-stock-list">
                {product.branchStock.map((stock) => (
                  <span key={stock.location}>
                    <strong>{stock.location}</strong>
                    {stock.quantity} available
                    {stock.quantity <= stock.lowStockThreshold ? " / low stock" : ""}
                  </span>
                ))}
              </div>
            </article>
          ) : null}
          {hasFabricOrCare ? (
            <article>
              <h2>Fabric and care</h2>
              <p>{[product.fabric, product.care].filter(Boolean).join(". ")}</p>
              {product.weight ? <p>Weight: {product.weight}g. Status: {product.status}.</p> : null}
            </article>
          ) : null}
          <article>
            <h2>Reviews</h2>
            <p>
              Rated {product.rating}/5 from verified customers. Customers highlight sizing accuracy, fabric feel, and
              delivery communication.
            </p>
          </article>
        </section>
      ) : null}

      <section className="product-confidence-grid">
        <article>
          <CreditCard size={24} />
          <h2>Local checkout</h2>
          <p>Mobile Money is first in the checkout path, with card and bank transfer architecture prepared.</p>
        </article>
        <article>
          <Truck size={24} />
          <h2>Delivery clarity</h2>
          <p>{product.delivery || "Delivery timelines are confirmed after checkout."} Tracking and confirmation pages keep the order visible.</p>
        </article>
        <article>
          <RotateCcw size={24} />
          <h2>Return promise</h2>
          <p>{product.warranty || "Standard return policy applies."} Support details stay visible across the store footer.</p>
        </article>
      </section>

      {relatedProducts.length > 0 ? (
        <section className="market-section related-products">
          <div className="market-section-head">
            <div>
              <p className="kicker">Keep shopping</p>
              <h2>Related products.</h2>
            </div>
          </div>
          <div className="deal-grid">
            {relatedProducts.map((item, index) => (
              <a className="deal-card" href={`/products/${item.slug}`} key={item.slug}>
                <div className={`deal-art deal-${(index % 4) + 1}`}>
                  <img src={item.image} alt={item.name} />
                </div>
                <span>{item.badge}</span>
                <h3>{item.name}</h3>
                <p>
                  {formatMoney(item.price)} {item.oldPrice ? <s>{formatMoney(item.oldPrice)}</s> : null}
                </p>
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
