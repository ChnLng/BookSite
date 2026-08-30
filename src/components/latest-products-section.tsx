import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import type { LatestProduct } from "@/lib/latest-products";

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

export function LatestProductsSection({ products }: { products: LatestProduct[] }) {
  return (
    <section className="panel glass latest-products-panel" id="nouveautes" aria-labelledby="nouveautes-title">
      <div className="section-heading">
        <span className="section-heading-icon" aria-hidden="true"><Sparkles size={17} /></span>
        <h2 className="section-heading-text" id="nouveautes-title">Nouveauté</h2>
      </div>
      <p className="tiny muted latest-products-intro">Les dernières créations à découvrir.</p>
      <div className="latest-products-list">
        {products.map((product) => (
          <Link className="latest-product-card" href={product.href} key={product.id}>
            <span className="latest-product-image">
              <Image src={product.image} alt="" fill sizes="72px" />
            </span>
            <span className="latest-product-details">
              <span className="latest-product-kind">{product.kind === "book" ? "Livre bilingue" : "Outil numérique"}</span>
              <strong className="latest-product-title">{product.title}</strong>
              <span className="latest-product-price">{product.priceEur === 0 ? "Gratuit" : euro.format(product.priceEur)}</span>
            </span>
            <ArrowUpRight className="latest-product-arrow" size={15} aria-hidden="true" />
          </Link>
        ))}
        {products.length === 0 ? <p className="tiny muted">Retrouvez nos créations dans le catalogue.</p> : null}
      </div>
      <Link className="latest-products-catalogue" href="/catalogue">Tout le catalogue <ArrowUpRight size={14} aria-hidden="true" /></Link>
    </section>
  );
}
