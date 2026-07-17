import {
  ArrowRight,
  Briefcase,
  CreditCard,
  Cpu,
  Grid3X3,
  Headset,
  Home as HomeIcon,
  Package,
  RotateCcw,
  Shirt,
  Smartphone,
  Sparkles,
  Tag,
  Timer,
  Truck,
} from "lucide-react";
import { AppShell } from "@/components/store/AppShell";
import { getActiveProducts, getFlashDeals, type StoreProduct } from "@/lib/db/products";
import { getActiveCategories, type StoreCategory } from "@/lib/db/categories";
import { getActiveHeroBanners } from "@/lib/db/hero";
import { formatMoney } from "@/lib/utils/money";
import { storeBrand } from "@/lib/store/brand";

function discountLabel(product: StoreProduct) {
  if (!product.oldPrice || product.oldPrice <= product.price) return "";
  const percent = Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
  return `-${percent}%`;
}

function categoryIcon(name: string) {
  const key = name.toLowerCase();
  if (key.includes("electronic")) return Cpu;
  if (key.includes("fashion") || key.includes("apparel")) return Shirt;
  if (key.includes("beauty") || key.includes("personal")) return Sparkles;
  if (key.includes("home") || key.includes("kitchen")) return HomeIcon;
  if (key.includes("phone")) return Smartphone;
  if (key.includes("office")) return Briefcase;
  if (key.includes("packaging")) return Package;
  return Tag;
}

function categoryProductCount(category: StoreCategory, products: StoreProduct[]) {
  return products.filter((product) => product.categoryId === category.id).length;
}

export default async function Home() {
  const [products, categories, heroBanners, dealProducts] = await Promise.all([
    getActiveProducts(),
    getActiveCategories(),
    getActiveHeroBanners(),
    getFlashDeals(4),
  ]);

  const featuredProducts = products.slice(0, 8);
  const categoryCards = categories.slice(0, 8);
  const trendingProducts = [...products]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 6);

  const slides =
    heroBanners.length > 0
      ? heroBanners.map((banner) => ({
          key: banner.id,
          eyebrow: banner.subtitle || "SobalShop",
          title: banner.title,
          cta: banner.ctaLabel || "Shop now",
          href: banner.ctaHref,
          meta: "",
          image: banner.imageUrl,
        }))
      : featuredProducts.slice(0, 3).map((product) => ({
          key: product.id,
          eyebrow: product.badge || "New arrival",
          title: product.name,
          cta: "Shop now",
          href: `/products/${product.slug}`,
          meta: formatMoney(product.price),
          image: product.image,
        }));

  return (
    <AppShell className="storefront">
      <section className="store-hero">
        <aside id="categories" className="department-panel" aria-label="Departments">
          <div className="panel-title">
            <Grid3X3 size={18} />
            Shop categories
          </div>
          {categories.map((category) => (
            <a href={`/shop?category=${encodeURIComponent(category.name)}`} key={category.id}>
              <span>{category.name}</span>
              <ArrowRight size={15} />
            </a>
          ))}
        </aside>

        <div className="hero-carousel" aria-label="Featured store campaigns">
          <div className="hero-track">
            {slides.map((slide, index) => (
              <article className={`store-slide slide-${index + 1}`} key={slide.key}>
                <div className="store-slide-copy">
                  <p>{slide.eyebrow}</p>
                  <h1>{slide.title}</h1>
                  <div className="hero-market-actions">
                    <a className="primary-action" href={slide.href}>
                      {slide.cta}
                      <ArrowRight size={18} />
                    </a>
                    {slide.meta ? <strong>{slide.meta}</strong> : null}
                  </div>
                </div>
                {slide.image ? (
                  <div className="store-slide-media">
                    <img src={slide.image} alt="" />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
          <div className="carousel-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      </section>

      <section className="hero-trends store-trends">
        <strong>Trending</strong>
        <div>
          {trendingProducts.map((product) => (
            <a href={`/products/${product.slug}`} key={product.id}>
              {product.name}
            </a>
          ))}
        </div>
      </section>

      <section className="market-section featured-store-products">
        <div className="market-section-head">
          <div>
            <p className="kicker">New in</p>
            <h2>Fresh arrivals</h2>
          </div>
          <a href="/shop">
            View all products
            <ArrowRight size={17} />
          </a>
        </div>
        <div className="featured-product-grid">
          {featuredProducts.map((product) => (
            <a className="featured-product-card" href={`/products/${product.slug}`} key={product.slug}>
              <img src={product.image} alt={product.name} />
              <span>{product.category}{product.subcategory ? ` / ${product.subcategory}` : ""}</span>
              <h3>{product.name}</h3>
              <strong>{formatMoney(product.price)}</strong>
            </a>
          ))}
        </div>
      </section>

      {dealProducts.length > 0 ? (
        <section id="deals" className="deal-strip">
          <div className="deal-copy">
            <p className="kicker">Flash sale</p>
            <h2>Weekend deals.</h2>
            <span>
              <Timer size={17} />
              Limited stock
            </span>
          </div>
          <div className="deal-grid">
            {dealProducts.map((deal, index) => (
              <a className="deal-card" href={`/products/${deal.slug}`} key={deal.slug}>
                <div className={`deal-art deal-${index + 1}`}>
                  <img src={deal.image} alt={deal.name} />
                </div>
                <span>{discountLabel(deal)}</span>
                <h3>{deal.name}</h3>
                <p>
                  {formatMoney(deal.price)} {deal.oldPrice ? <s>{formatMoney(deal.oldPrice)}</s> : null}
                </p>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section className="market-section trust-strip">
        <div className="market-section-head">
          <div>
            <p className="kicker">Why SobalShop</p>
            <h2>Built for fast, trustworthy checkout.</h2>
          </div>
        </div>
        <div className="product-confidence-grid">
          <article>
            <CreditCard size={24} />
            <h2>Mobile Money & card</h2>
            <p>Paystack-powered checkout supports Mobile Money and cards, confirmed instantly by signed webhook.</p>
          </article>
          <article>
            <Truck size={24} />
            <h2>Delivery you can track</h2>
            <p>Every order gets a real order number with live status on the tracking page from confirmation to delivery.</p>
          </article>
          <article>
            <Headset size={24} />
            <h2>SMS order updates</h2>
            <p>Payment and delivery updates are sent by SMS so you always know where your order stands.</p>
          </article>
          <article>
            <RotateCcw size={24} />
            <h2>Easy exchanges</h2>
            <p>Reach us at {storeBrand.phone} or {storeBrand.email}. Support hours: {storeBrand.hours}.</p>
          </article>
        </div>
      </section>

      <section className="market-section category-showcase">
        <div className="market-section-head">
          <div>
            <p className="kicker">Departments</p>
            <h2>Shop categories</h2>
          </div>
        </div>
        <div className="category-card-grid">
          {categoryCards.map((category) => {
            const Icon = categoryIcon(category.name);
            const count = categoryProductCount(category, products);
            return (
              <a href={`/shop?category=${encodeURIComponent(category.name)}`} key={category.id}>
                <span className="category-card-icon">
                  <Icon size={20} />
                </span>
                <strong>{category.name}</strong>
                <small>{count} {count === 1 ? "product" : "products"}</small>
                <ArrowRight size={17} />
              </a>
            );
          })}
        </div>
      </section>

    </AppShell>
  );
}
