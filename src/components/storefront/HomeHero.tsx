import Image from "next/image";
import Link from "next/link";
import { type StoreProduct } from "@/lib/db/products";
import { formatMoney } from "@/lib/utils/money";
import { HeroCarousel } from "@/components/storefront/HeroCarousel";

type HomeHeroProps = {
  slides: StoreProduct[];
  sideTop?: StoreProduct;
  sideBottom?: StoreProduct;
};

function HeroSide({ product, position }: { product: StoreProduct; position: "top" | "bottom" }) {
  return (
    <Link href={`/products/${product.slug}`} className={`ed-hero-side ed-hero-side-${position}`}>
      <Image src={product.image} alt={product.name} fill sizes="(max-width: 900px) 100vw, 38vw" />
      <div className="ed-hero-side-scrim" />
      <div className="ed-hero-side-copy">
        <em>{product.category}</em>
        <strong>{product.name}</strong>
        <span>{formatMoney(product.price)}</span>
      </div>
    </Link>
  );
}

export function HomeHero({ slides, sideTop, sideBottom }: HomeHeroProps) {
  if (slides.length === 0) return null;

  return (
    <section className="ed-hero-grid">
      <HeroCarousel slides={slides} />
      {sideTop ? <HeroSide product={sideTop} position="top" /> : null}
      {sideBottom ? <HeroSide product={sideBottom} position="bottom" /> : null}
    </section>
  );
}
