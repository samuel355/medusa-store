import { Heart, ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type StoreProduct } from "@/lib/db/products";
import { formatMoney } from "@/lib/utils/money";

type ProductCardProps = {
  product: StoreProduct;
  priority?: boolean;
  saved?: boolean;
  onWishlistToggle?: () => void;
  onQuickAdd?: () => void;
};

function discountPercent(product: StoreProduct) {
  if (!product.oldPrice || product.oldPrice <= product.price) return 0;
  return Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
}

export function ProductCard({
  product,
  priority = false,
  saved = false,
  onWishlistToggle,
  onQuickAdd,
}: ProductCardProps) {
  const discount = discountPercent(product);

  return (
    <article className="ed-product-card">
      <div className="ed-product-image">
        <Link href={`/products/${product.slug}`} tabIndex={-1} aria-hidden="true" className="ed-product-image-link">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 22vw"
            priority={priority}
          />
        </Link>

        {(product.badge || discount > 0) && (
          <div className="ed-product-tags">
            {product.badge ? <span>{product.badge}</span> : null}
            {discount > 0 ? <span className="ed-product-tag-discount">-{discount}%</span> : null}
          </div>
        )}

        {onWishlistToggle ? (
          <button
            type="button"
            className={`ed-wish-btn ${saved ? "is-active" : ""}`}
            aria-label={`Save ${product.name}`}
            onClick={onWishlistToggle}
          >
            <Heart size={15} />
          </button>
        ) : null}

        {onQuickAdd ? (
          <button type="button" className="ed-quickadd" onClick={onQuickAdd}>
            <ShoppingBag size={14} />
            Add to Cart
          </button>
        ) : null}
      </div>

      <Link href={`/products/${product.slug}`} className="ed-product-card-body">
        <em>{product.brand || product.category}</em>
        <strong>{product.name}</strong>
        <span className="ed-product-price">
          {formatMoney(product.price)}
          {product.oldPrice ? <s>{formatMoney(product.oldPrice)}</s> : null}
        </span>
      </Link>
    </article>
  );
}
