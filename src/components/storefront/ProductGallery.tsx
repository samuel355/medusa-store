"use client";

import { useState } from "react";
import Image from "next/image";

type ProductGalleryProps = {
  images: string[];
  alt: string;
};

export function ProductGallery({ images, alt }: ProductGalleryProps) {
  const [active, setActive] = useState(0);
  const selected = images[active] ?? images[0];

  return (
    <div className="ed-gallery">
      {images.length > 1 ? (
        <div className="ed-gallery-thumbs">
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              className={`ed-gallery-thumb ${index === active ? "is-active" : ""}`}
              aria-label={`View image ${index + 1} of ${images.length}`}
              aria-current={index === active}
              onClick={() => setActive(index)}
            >
              <Image src={image} alt="" fill sizes="80px" />
            </button>
          ))}
        </div>
      ) : null}
      <div className="ed-gallery-main">
        <Image src={selected} alt={alt} fill sizes="(max-width: 900px) 100vw, 50vw" priority />
      </div>
    </div>
  );
}
