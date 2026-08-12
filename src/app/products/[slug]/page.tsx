import { ArrowLeft, CreditCard, RotateCcw, Star, Truck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/store/AppShell";
import { ProductCard } from "@/components/storefront/ProductCard";
import { ProductGallery } from "@/components/storefront/ProductGallery";
import { ProductPurchasePanel } from "@/components/storefront/ProductPurchasePanel";
import { getProductBySlug, getRelatedProducts } from "@/lib/db/products";
import { formatMoney } from "@/lib/utils/money";
import { fetchProductReviews } from "@/lib/medusa/reviews";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  return {
    title: product ? `${product.name} | Begnon` : "Product | Begnon",
    description: product?.description ?? "Shop products from Begnon."
  };
}

export default async function ProductDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const galleryImages = product.images.length ? product.images : [product.image];
  const relatedProducts = await getRelatedProducts(product.categoryId, product.id, 4);
  const reviewSummary = await fetchProductReviews(product.id);

  const specs = [
    product.brand ? { label: "Brand", value: product.brand } : null,
    product.fit ? { label: "Fit", value: product.fit } : null,
    product.fabric ? { label: "Fabric", value: product.fabric } : null,
    product.material ? { label: "Material", value: product.material } : null,
    product.care ? { label: "Care", value: product.care } : null,
    product.delivery ? { label: "Delivery", value: product.delivery } : null,
    product.warranty ? { label: "Warranty", value: product.warranty } : null,
  ].filter((entry): entry is { label: string; value: string } => Boolean(entry));

  return (
    <AppShell className="ed-page">
      <section className="ed-product">
        <Link className="ed-back-link" href="/shop">
          <ArrowLeft size={15} />
          Back to products
        </Link>

        <div className="ed-product-grid-layout">
          <ProductGallery images={galleryImages} alt={product.name} />

          <div className="ed-product-main">
            <article className="ed-product-info">
              <em>{product.brand || product.category}</em>
              <h1>{product.name}</h1>
              <span className="ed-product-price">
                {formatMoney(product.price)}
                {product.oldPrice ? <s>{formatMoney(product.oldPrice)}</s> : null}
              </span>
              <p>{product.description}</p>
              {product.highlights.length > 0 ? (
                <ul className="ed-highlight-list">
                  {product.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              ) : null}
            </article>

            <ProductPurchasePanel product={product} />

            {specs.length > 0 ? (
              <dl className="ed-spec-list">
                {specs.map((spec) => (
                  <div key={spec.label}>
                    <dt>{spec.label}</dt>
                    <dd>{spec.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </div>
      </section>

      <section className="ed-trust-row ed-trust-row-3">
        <div>
          <CreditCard size={20} />
          <div>
            <strong>Local checkout</strong>
            <span>Mobile Money first, card and bank transfer ready.</span>
          </div>
        </div>
        <div>
          <Truck size={20} />
          <div>
            <strong>Delivery clarity</strong>
            <span>{product.delivery || "Delivery timelines are confirmed after checkout."}</span>
          </div>
        </div>
        <div>
          <RotateCcw size={20} />
          <div>
            <strong>Return promise</strong>
            <span>{product.warranty || "Standard return policy applies."}</span>
          </div>
        </div>
      </section>

      <section className="ed-reviews">
        <div className="ed-section-head">
          <div>
            <p className="ed-eyebrow">Customer reviews</p>
            <h2>
              {reviewSummary.count
                ? `${reviewSummary.average!.toFixed(1)} out of 5 · ${reviewSummary.count} review${reviewSummary.count === 1 ? "" : "s"}`
                : "No reviews yet"}
            </h2>
          </div>
        </div>
        {reviewSummary.reviews.length ? (
          <div className="ed-review-grid">
            {reviewSummary.reviews.map((review) => (
              <article className="ed-review-card" key={review.id}>
                <div className="ed-review-stars" aria-label={`Rated ${review.rating} out of 5`}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} size={15} fill={index < review.rating ? "currentColor" : "none"} />
                  ))}
                </div>
                <p>{review.body}</p>
                <span>
                  {review.customer_name} &middot; {new Date(review.created_at).toLocaleDateString()}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted-copy">Be the first to review this product after your order is delivered.</p>
        )}
      </section>

      {relatedProducts.length > 0 ? (
        <section className="ed-section">
          <div className="ed-section-head">
            <div>
              <p className="ed-eyebrow">Keep shopping</p>
              <h2>You may also like</h2>
            </div>
          </div>
          <div className="ed-product-grid">
            {relatedProducts.map((item) => (
              <ProductCard key={item.slug} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
