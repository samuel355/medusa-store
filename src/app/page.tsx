import { ArrowRight, CreditCard, Headset, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AppShell } from "@/components/store/AppShell";
import { HomeHero } from "@/components/storefront/HomeHero";
import { ProductCard } from "@/components/storefront/ProductCard";
import { getActiveProducts, type StoreProduct } from "@/lib/db/products";
import { getActiveCategories } from "@/lib/db/categories";
import { storeBrand } from "@/lib/store/brand";

const UNDER_PRICE_CEDIS = 200;

function buildShopByTiles(products: StoreProduct[], categories: { id: string; name: string }[]) {
  const byCategory = (name: string) => {
    const category = categories.find((candidate) => candidate.name === name);
    if (!category) return [];
    return products.filter((product) => product.categoryId === category.id);
  };

  const candidates = [
    { label: "Men", href: "/shop?category=Men", matches: byCategory("Men") },
    { label: "Women", href: "/shop?category=Women", matches: byCategory("Women") },
    {
      label: "New Arrivals",
      href: "/shop?pill=New%20arrivals",
      matches: products.filter((product) => product.isNewArrival),
    },
    {
      label: `Under GH₵${UNDER_PRICE_CEDIS}`,
      href: `/shop?price=${encodeURIComponent(`Under GH₵${UNDER_PRICE_CEDIS}`)}`,
      matches: products.filter((product) => product.price < UNDER_PRICE_CEDIS),
    },
  ];

  // Skip tiles with no live matches instead of showing an empty segment.
  const usedImages = new Set<string>();
  return candidates
    .filter((tile) => tile.matches.length > 0)
    .map((tile) => {
      // Avoid repeating the same photo across tiles when the catalogue is small.
      const product = tile.matches.find((candidate) => !usedImages.has(candidate.image)) ?? tile.matches[0];
      usedImages.add(product.image);
      return { label: tile.label, href: tile.href, count: tile.matches.length, image: product.image };
    });
}

export default async function Home() {
  const [products, categories] = await Promise.all([getActiveProducts(), getActiveCategories()]);
  const featuredProducts = products.slice(0, 8);
  const heroSlides = products.slice(0, 3);
  const heroSideTop = products[3];
  const heroSideBottom = products[4];
  const shopByTiles = buildShopByTiles(products, categories);

  return (
    <AppShell className="storefront home">
      <HomeHero slides={heroSlides} sideTop={heroSideTop} sideBottom={heroSideBottom} />

      {shopByTiles.length > 0 ? (
        <section className="ed-section ed-categories">
          <p className="ed-eyebrow">Shop by</p>
          <div className="ed-shopby-row">
            {shopByTiles.map((tile) => (
              <Link href={tile.href} key={tile.label} className="ed-shopby-tile">
                <Image src={tile.image} alt="" fill sizes="(max-width: 1000px) 50vw, 25vw" />
                <div className="ed-shopby-scrim" />
                <div className="ed-shopby-copy">
                  <strong>{tile.label}</strong>
                  <span>
                    {tile.count} {tile.count === 1 ? "item" : "items"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="ed-section">
        <div className="ed-section-head">
          <div>
            <p className="ed-eyebrow">New in</p>
            <h2>Fresh picks from the store</h2>
          </div>
          <Link href="/shop">
            Shop all
            <ArrowRight size={15} />
          </Link>
        </div>
        <div className="ed-product-grid">
          {featuredProducts.map((product, index) => (
            <ProductCard key={product.slug} product={product} priority={index < 4} />
          ))}
        </div>
      </section>

      <section className="ed-value-band">
        <p className="ed-eyebrow">{storeBrand.tagline}</p>
        <h2>One trusted checkout for everything you love.</h2>
        <p>
          {`From fashion to electronics, beauty to home essentials — ${storeBrand.name} brings Ghana's everyday shopping into one storefront with Mobile Money-first checkout and delivery you can track from confirmation to doorstep.`}
        </p>
        <Link className="ed-text-link" href="/shop">
          Explore the shop
          <ArrowRight size={16} />
        </Link>
      </section>

      <section className="ed-trust-row">
        <div>
          <CreditCard size={20} />
          <div>
            <strong>Mobile Money & card</strong>
            <span>Paystack checkout, confirmed instantly by signed webhook.</span>
          </div>
        </div>
        <div>
          <Truck size={20} />
          <div>
            <strong>Delivery you can track</strong>
            <span>Live status from confirmation to delivery.</span>
          </div>
        </div>
        <div>
          <ShieldCheck size={20} />
          <div>
            <strong>Verified products</strong>
            <span>Clear pricing, no surprise fees at checkout.</span>
          </div>
        </div>
        <div>
          <Headset size={20} />
          <div>
            <strong>SMS order updates</strong>
            <span>Payment and delivery updates sent by SMS.</span>
          </div>
        </div>
        <div>
          <RotateCcw size={20} />
          <div>
            <strong>Easy exchanges</strong>
            <span>
              {storeBrand.phone} · {storeBrand.hours}
            </span>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
