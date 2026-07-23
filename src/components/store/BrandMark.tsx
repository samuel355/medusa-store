import Image from "next/image";

export function BrandMark({ size = 34 }: Readonly<{ size?: number }>) {
  return (
    <Image
      src="/icons/icon-192.png"
      alt=""
      width={size}
      height={size}
      className="brand-mark-image"
      priority
    />
  );
}
