"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { type StoreProduct } from "@/lib/db/products";
import { formatMoney } from "@/lib/utils/money";

type HeroCarouselProps = {
  slides: StoreProduct[];
};

const SLIDE_MS = 6000;

export function HeroCarousel({ slides }: HeroCarouselProps) {
  const [active, setActive] = useState(0);
  const paused = useRef(false);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => {
      if (!paused.current) setActive((current) => (current + 1) % slides.length);
    }, SLIDE_MS);
    return () => clearInterval(id);
  }, [slides.length]);

  if (slides.length === 0) return null;

  const current = slides[active];

  return (
    <div
      className="ed-hero-carousel"
      onMouseEnter={() => {
        paused.current = true;
      }}
      onMouseLeave={() => {
        paused.current = false;
      }}
    >
      {slides.map((product, index) => (
        <Image
          key={product.slug}
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 900px) 100vw, 62vw"
          priority={index === 0}
          className={`ed-hero-carousel-image ${index === active ? "is-active" : ""}`}
        />
      ))}
      <div className="ed-hero-feature-scrim" />
      <div className="ed-hero-feature-copy" key={current.slug}>
        <p>{current.badge || current.category || "New this week"}</p>
        <h1>{current.name}</h1>
        <span className="ed-hero-feature-price">{formatMoney(current.price)}</span>
        <Link className="ed-text-link ed-hero-cta" href={`/products/${current.slug}`}>
          Shop now
          <ArrowRight size={16} />
        </Link>
      </div>
      {slides.length > 1 ? (
        <div className="ed-hero-carousel-dots">
          {slides.map((product, index) => (
            <button
              key={product.slug}
              type="button"
              aria-label={`Show ${product.name}`}
              aria-current={index === active}
              className={index === active ? "is-active" : ""}
              onClick={() => setActive(index)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
