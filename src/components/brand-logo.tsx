import Image from "next/image";
import { siteLogoPath } from "@/lib/book-assets";

type BrandLogoProps = {
  size?: number;
  className?: string;
};

export function BrandLogo({ size = 46, className = "brand-avatar-image" }: BrandLogoProps) {
  return (
    <Image
      src={siteLogoPath}
      alt="Visd AR"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
