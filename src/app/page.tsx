import {
  ArrowRight,
  BadgeCheck,
  Bell,
  CreditCard,
  Grid3X3,
  Heart,
  MapPin,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Star,
  Timer,
  Zap
} from "lucide-react";
import { AppShell } from "@/components/store/AppShell";
import {
  dealProducts,
  heroSlides,
  marketplaceDepartments,
  marketplaceStats,
  trendingSearches,
  wholesaleProducts
} from "@/lib/store/catalog";
import { formatMoney } from "@/lib/utils/money";

export default function Home() {
  return (
    <AppShell className="storefront">
      <section className="store-hero">
        <aside id="categories" className="department-panel" aria-label="Departments">
          <div className="panel-title">
            <Grid3X3 size={18} />
            Shop categories
          </div>
          {marketplaceDepartments.map((department) => (
            <a href="#products" key={department}>
              <span>{department}</span>
              <ArrowRight size={15} />
            </a>
          ))}
        </aside>

        <div className="hero-carousel" aria-label="Featured store campaigns">
          <div className="hero-track">
            {heroSlides.map((slide, index) => (
              <article className={`store-slide slide-${index + 1}`} key={slide.title}>
                <p>{slide.eyebrow}</p>
                <h1>{slide.title}</h1>
                <span>{slide.description}</span>
                <div className="hero-market-actions">
                  <a className="primary-action" href="#products">
                    {slide.cta}
                    <ArrowRight size={18} />
                  </a>
                  <strong>{slide.meta}</strong>
                </div>
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
        <strong>Trending now</strong>
        <div>
          {trendingSearches.map((search) => (
            <a href="#products" key={search}>
              {search}
            </a>
          ))}
        </div>
      </section>

      <section className="market-stats" aria-label="Store stats">
        {marketplaceStats.map((stat) => (
          <div key={stat.label}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </section>

      <section id="deals" className="deal-strip">
        <div className="deal-copy">
          <p className="kicker">Flash sale</p>
          <h2>Fresh deals from one store.</h2>
          <span>
            <Timer size={17} />
            Ends in 07:42:18
          </span>
        </div>
        <div className="deal-grid">
          {dealProducts.map((deal, index) => (
            <article className="deal-card" key={deal.name}>
              <div className={`deal-art deal-${index + 1}`} />
              <span>{deal.discount}</span>
              <h3>{deal.name}</h3>
              <p>
                {formatMoney(deal.price)} <s>{formatMoney(deal.oldPrice)}</s>
              </p>
            </article>
          ))}
        </div>
      </section>

      <section id="products" className="market-section">
        <div className="market-section-head">
          <div>
            <p className="kicker">Shop the store</p>
            <h2>Products people can actually buy.</h2>
          </div>
          <div className="filter-pills">
            <button>New arrivals</button>
            <button>In stock</button>
            <button>Top rated</button>
            <button>Same-day Accra</button>
          </div>
        </div>
        <div className="market-layout">
          <aside className="filter-panel">
            <h3>Filter products</h3>
            <label>
              Category
              <select>
                <option>All categories</option>
                <option>Fashion</option>
                <option>Electronics</option>
                <option>Beauty</option>
              </select>
            </label>
            <label>
              Delivery
              <select>
                <option>Any delivery speed</option>
                <option>Same-day Accra</option>
                <option>Nationwide dispatch</option>
              </select>
            </label>
            <label>
              Payment
              <select>
                <option>Paystack enabled</option>
                <option>Mobile money</option>
                <option>Cards</option>
              </select>
            </label>
            <div className="filter-checks">
              <span>
                <BadgeCheck size={16} /> Store verified
              </span>
              <span>
                <PackageCheck size={16} /> In stock
              </span>
              <span>
                <Bell size={16} /> SMS updates
              </span>
            </div>
          </aside>

          <div className="wholesale-grid">
            {wholesaleProducts.map((product, index) => (
              <article className="wholesale-card" key={product.name}>
                <button className="wish-button" aria-label={`Save ${product.name}`}>
                  <Heart size={17} />
                </button>
                <div className={`wholesale-art product-${index + 1}`}>
                  <span>{product.badge}</span>
                </div>
                <div className="wholesale-copy">
                  <p>{product.category}</p>
                  <h3>{product.name}</h3>
                  <strong>{formatMoney(product.price)}</strong>
                  <span>
                    <s>{formatMoney(product.oldPrice)}</s> {product.stock}
                  </span>
                  <div className="product-meta">
                    <span>
                      <Star size={14} fill="currentColor" />
                      {product.rating}
                    </span>
                    <span>{product.orders}</span>
                  </div>
                  <div className="card-actions">
                    <button>View details</button>
                    <button aria-label={`Add ${product.name} to cart`}>
                      <ShoppingBag size={17} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="rfq-checkout-grid store-checkout-grid">
        <div id="auth" className="auth-band inline-auth">
          <div>
            <p className="kicker">Customer account</p>
            <h2>Login with phone, email, or Google.</h2>
            <p>Use Supabase Auth to keep carts, orders, addresses, and wishlists connected.</p>
          </div>
          <div className="login-card">
            <div className="login-tabs" role="tablist" aria-label="Login methods">
              <button className="active">Phone</button>
              <button>Email</button>
              <button>Google</button>
            </div>
            <label>
              Mobile number
              <input type="tel" placeholder="+233 24 000 0000" />
            </label>
            <button className="primary-action full-width">
              Send secure code
              <Smartphone size={18} />
            </button>
          </div>
        </div>

        <div id="checkout" className="checkout-panel">
          <div className="checkout-head">
            <div>
              <p className="kicker">Checkout</p>
              <h2>Fast local payment.</h2>
            </div>
            <CreditCard size={30} />
          </div>
          <div className="checkout-lines">
            <div>
              <span>Cart subtotal</span>
              <strong>GH₵2,840</strong>
            </div>
            <div>
              <span>Same-day Accra delivery</span>
              <strong>GH₵45</strong>
            </div>
            <div>
              <span>Payment method</span>
              <strong>Paystack</strong>
            </div>
          </div>
          <button className="pay-button">
            <CreditCard size={19} />
            Pay with card or mobile money
          </button>
          <div className="checkout-trust">
            <span>
              <ShieldCheck size={17} /> Secure checkout
            </span>
            <span>
              <PackageCheck size={17} /> Fulfillment queued
            </span>
          </div>
        </div>
      </section>

      <section className="ops-strip">
        <div>
          <Zap size={20} />
          <strong>Redis cache</strong>
          <span>Fast catalog reads and rate limits</span>
        </div>
        <div>
          <PackageCheck size={20} />
          <strong>BullMQ workers</strong>
          <span>Fulfillment and SMS workflows</span>
        </div>
        <div>
          <Bell size={20} />
          <strong>Arkesel SMS</strong>
          <span>Order and delivery updates</span>
        </div>
        <div>
          <MapPin size={20} />
          <strong>R2 storage</strong>
          <span>Product images and receipts</span>
        </div>
      </section>

    </AppShell>
  );
}
