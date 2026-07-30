import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type StoreProduct } from "@/lib/db/products";

type HomeHeroProps = {
  featured?: StoreProduct;
};

export function HomeHero({ featured }: HomeHeroProps) {
  if (!featured) return null;

  return (
    <section className="ed-hero">
      <Image
        src={featured.image}
        alt={featured.name}
        fill
        sizes="100vw"
        priority
        className="ed-hero-image"
      />
      <div className="ed-hero-scrim" />
      <div className="ed-hero-copy">
        <p>{featured.badge || "New this week"}</p>
        <h1>Curated style for everyday Ghana</h1>
        <Link className="ed-text-link" href="/shop">
          Shop the collection
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
