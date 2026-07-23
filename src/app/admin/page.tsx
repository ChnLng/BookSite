"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminGuard } from "@/components/admin-guard";
import { TopNav } from "@/components/top-nav";
import { useAuth } from "@/components/auth-provider";
import { bookAssetExtensions, bookCoverPath, bookPdfPath } from "@/lib/book-assets";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { isPromoActive, mapPromoRow, type PromoCode, type PromoRow } from "@/lib/promo";

type BookRow = {
  id: string;
  slug: string | null;
  title_fr: string;
  title_zh: string;
  visible: boolean;
  price_eur: number | null;
  cover_image: string | null;
  pdf_file: string | null;
  synopsis_fr: string | null;
  synopsis_zh: string | null;
  amazon_ebook_url: string | null;
  amazon_paperback_url: string | null;
  created_at?: string | null;
};

type CategoryRow = {
  id: string;
  name: string;
  description: string | null;
  created_at?: string | null;
};

type DownloadRow = {
  id: string;
  user_email: string | null;
  book_title: string | null;
  download_url: string | null;
  created_at: string | null;
};

type DonationRow = {
  id: string;
  user_email: string | null;
  amount: number | null;
  note: string | null;
  created_at: string | null;
};

type BookEditState = {
  titleFr: string;
  titleZh: string;
  priceEur: string;
  coverImage: string;
  pdfFile: string;
  synopsisFr: string;
  synopsisZh: string;
  visible: boolean;
};

const adminSections = [
  { key: "books", label: "图书 Livres" },
  { key: "categories", label: "类目 Categories" },
  { key: "promo", label: "优惠码 Codes promo" },
  { key: "downloads", label: "下载 Downloads" },
  { key: "donations", label: "赞助 Donations" },
] as const;

type AdminSectionKey = (typeof adminSections)[number]["key"];

const defaultBookForm = {
  slug: "",
  titleFr: "",
  titleZh: "",
  priceEur: "",
  coverImage: "",
  pdfFile: "",
  synopsisFr: "",
  synopsisZh: "",
  visible: true,
};

const defaultPromoForm = {
  code: "",
  discountPercent: "10",
  validFrom: "",
  validUntil: "",
  active: true,
  showBanner: false,
  bannerTextFr: "",
  bannerTextZh: "",
};

function bookEditFromRow(book: BookRow): BookEditState {
  const slug = book.slug || book.id;
  const ext = bookAssetExtensions[slug] || "jpg";

  return {
    titleFr: book.title_fr,
    titleZh: book.title_zh,
    priceEur: String(book.price_eur ?? 0),
    coverImage: book.cover_image || bookCoverPath(slug, ext),
    pdfFile: book.pdf_file || bookPdfPath(slug),
    synopsisFr: book.synopsis_fr || "",
    synopsisZh: book.synopsis_zh || "",
    visible: Boolean(book.visible),
  };
}

function AdminPageContent() {
  const { profile } = useAuth();
  const [books, setBooks] = useState<BookRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [downloads, setDownloads] = useState<DownloadRow[]>([]);
  const [donations, setDonations] = useState<DonationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<AdminSectionKey>("books");
  const [form, setForm] = useState(defaultBookForm);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [promoForm, setPromoForm] = useState(defaultPromoForm);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [bookEdits, setBookEdits] = useState<Record<string, BookEditState>>({});

  const reload = async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setLoading(false);
      return;
    }

    const [{ data: booksData }, { data: categoryData }, { data: promoData }, { data: downloadData }, { data: donationData }] =
      await Promise.all([
        supabase
          .from("books")
          .select(
            "id, slug, title_fr, title_zh, visible, price_eur, cover_image, pdf_file, synopsis_fr, synopsis_zh, amazon_ebook_url, amazon_paperback_url, created_at",
          )
          .order("created_at", { ascending: false }),
        supabase.from("categories").select("id, name, description, created_at").order("created_at", { ascending: false }),
        supabase
          .from("promo_codes")
          .select("id, code, discount_percent, valid_from, valid_until, active, show_banner, banner_text_fr, banner_text_zh")
          .order("created_at", { ascending: false }),
        supabase
          .from("downloads")
          .select("id, user_email, book_title, download_url, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("donations").select("id, user_email, amount, note, created_at").order("created_at", { ascending: false }),
      ]);

    const nextBooks = (booksData || []) as BookRow[];
    setBooks(nextBooks);
    setBookEdits(Object.fromEntries(nextBooks.map((book) => [book.id, bookEditFromRow(book)])));
    setCategories((categoryData || []) as CategoryRow[]);
    setPromoCodes(((promoData || []) as PromoRow[]).map(mapPromoRow));
    setDownloads((downloadData || []) as DownloadRow[]);
    setDonations((donationData || []) as DonationRow[]);
    setLoading(false);
  };

  useEffect(() => {
    void reload();
  }, []);

  const createBook = async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const slug = form.slug.trim() || form.titleFr.trim().toLowerCase().replace(/\s+/g, "-");
    const ext = bookAssetExtensions[slug] || "jpg";

    const { error } = await supabase.from("books").insert({
      slug,
      title_fr: form.titleFr,
      title_zh: form.titleZh,
      visible: form.visible,
      price_eur: Number(form.priceEur || 0),
      cover_image: form.coverImage || bookCoverPath(slug, ext),
      pdf_file: form.pdfFile || bookPdfPath(slug),
      synopsis_fr: form.synopsisFr || null,
      synopsis_zh: form.synopsisZh || null,
      amazon_ebook_url: null,
      amazon_paperback_url: null,
    });

    if (!error) {
      setForm(defaultBookForm);
      await reload();
    }
  };

  const saveBook = async (bookId: string) => {
    const supabase = getSupabaseBrowserClient();
    const edit = bookEdits[bookId];

    if (!supabase || !edit) {
      return;
    }

    await supabase
      .from("books")
      .update({
        title_fr: edit.titleFr,
        title_zh: edit.titleZh,
        price_eur: Number(edit.priceEur || 0),
        cover_image: edit.coverImage,
        pdf_file: edit.pdfFile,
        synopsis_fr: edit.synopsisFr || null,
        synopsis_zh: edit.synopsisZh || null,
        visible: edit.visible,
      })
      .eq("id", bookId);

    setEditingBookId(null);
    await reload();
  };

  const toggleVisibility = async (id: string, visible: boolean) => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    await supabase.from("books").update({ visible: !visible }).eq("id", id);
    await reload();
  };

  const deleteBook = async (id: string) => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    await supabase.from("books").delete().eq("id", id);
    await reload();
  };

  const createCategory = async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !categoryName.trim()) {
      return;
    }

    await supabase.from("categories").insert({
      name: categoryName.trim(),
      description: categoryDescription.trim() || null,
    });

    setCategoryName("");
    setCategoryDescription("");
    await reload();
  };

  const createPromo = async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !promoForm.code.trim() || !promoForm.validFrom || !promoForm.validUntil) {
      return;
    }

    await supabase.from("promo_codes").insert({
      code: promoForm.code.trim().toUpperCase(),
      discount_percent: Number(promoForm.discountPercent || 0),
      valid_from: new Date(promoForm.validFrom).toISOString(),
      valid_until: new Date(promoForm.validUntil).toISOString(),
      active: promoForm.active,
      show_banner: promoForm.showBanner,
      banner_text_fr: promoForm.bannerTextFr || null,
      banner_text_zh: promoForm.bannerTextZh || null,
    });

    setPromoForm(defaultPromoForm);
    await reload();
  };

  const togglePromoBanner = async (promo: PromoCode) => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    await supabase.from("promo_codes").update({ show_banner: !promo.showBanner }).eq("id", promo.id);
    await reload();
  };

  const togglePromoActive = async (promo: PromoCode) => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    await supabase.from("promo_codes").update({ active: !promo.active }).eq("id", promo.id);
    await reload();
  };

  const deletePromo = async (id: string) => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    await supabase.from("promo_codes").delete().eq("id", id);
    await reload();
  };

  const title = useMemo(() => profile?.displayName || profile?.email || "Admin", [profile]);

  return (
    <main className="page-shell">
      <TopNav subtitle="后台概览 Admin" title="Visd AR 管理台" showLogout />

      <section className="dashboard-grid">
        <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-title">
            <strong>Admin</strong>
            <span className="tiny">后台管理</span>
          </div>
        </div>
        <div className="admin-sidebar-sections">
          {adminSections.map((section) => (
            <button
              key={section.key}
              className={activeSection === section.key ? "admin-sidebar-item active" : "admin-sidebar-item"}
              type="button"
              onClick={() => setActiveSection(section.key)}
            >
              {section.label}
            </button>
          ))}
        </div>
      </aside>

        <section className="panel glass">
          <h1 className="section-title" style={{ fontFamily: "var(--font-heading), serif" }}>
            管理后台 Admin bilingue
          </h1>
          <p className="section-caption">Bienvenue {title} — gestion complète des livres, catégories, codes promo et statistiques.</p>

          {activeSection === "books" ? (
            <>
              <div className="section-block">
                <h3>Ajouter un livre 新增图书</h3>
                <div className="input-group admin-form-grid" style={{ marginTop: 10 }}>
                  <input className="input" placeholder="Slug (lumi, jiti...)" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
                  <input className="input" placeholder="Titre FR" value={form.titleFr} onChange={(event) => setForm({ ...form, titleFr: event.target.value })} />
                  <input className="input" placeholder="Titre ZH" value={form.titleZh} onChange={(event) => setForm({ ...form, titleZh: event.target.value })} />
                  <input className="input" placeholder="Prix EUR" value={form.priceEur} onChange={(event) => setForm({ ...form, priceEur: event.target.value })} />
                  <input className="input" placeholder="Couverture /images/..." value={form.coverImage} onChange={(event) => setForm({ ...form, coverImage: event.target.value })} />
                  <input className="input" placeholder="PDF /images/..." value={form.pdfFile} onChange={(event) => setForm({ ...form, pdfFile: event.target.value })} />
                  <textarea className="textarea" placeholder="Synopsis FR" value={form.synopsisFr} onChange={(event) => setForm({ ...form, synopsisFr: event.target.value })} />
                  <textarea className="textarea" placeholder="简介 ZH" value={form.synopsisZh} onChange={(event) => setForm({ ...form, synopsisZh: event.target.value })} />
                  <label className="tiny"><input type="checkbox" checked={form.visible} onChange={() => setForm({ ...form, visible: !form.visible })} /> Visible</label>
                  <button className="cta-button" type="button" onClick={() => void createBook()}>Créer</button>
                </div>
              </div>

              <div className="section-block">
                <h3>Livres 图书</h3>
                {loading ? <p className="muted">Chargement…</p> : books.map((book) => {
                  const edit = bookEdits[book.id];
                  const isEditing = editingBookId === book.id;

                  return (
                    <div className="admin-book-card" key={book.id}>
                      <div className="admin-book-preview">
                        <Image
                          src={edit?.coverImage || bookCoverPath(book.slug || book.id, "jpg")}
                          alt={book.title_fr}
                          width={88}
                          height={118}
                          className="admin-book-cover"
                        />
                        <div>
                          <strong>{book.title_zh}</strong>
                          <div className="tiny">{book.title_fr}</div>
                          <div className="tiny">{book.price_eur?.toFixed(2)} EUR</div>
                        </div>
                      </div>

                      {isEditing && edit ? (
                        <div className="input-group admin-form-grid">
                          <input className="input" placeholder="Titre FR" value={edit.titleFr} onChange={(event) => setBookEdits({ ...bookEdits, [book.id]: { ...edit, titleFr: event.target.value } })} />
                          <input className="input" placeholder="Titre ZH" value={edit.titleZh} onChange={(event) => setBookEdits({ ...bookEdits, [book.id]: { ...edit, titleZh: event.target.value } })} />
                          <input className="input" placeholder="Prix EUR" value={edit.priceEur} onChange={(event) => setBookEdits({ ...bookEdits, [book.id]: { ...edit, priceEur: event.target.value } })} />
                          <input className="input" placeholder="Couverture" value={edit.coverImage} onChange={(event) => setBookEdits({ ...bookEdits, [book.id]: { ...edit, coverImage: event.target.value } })} />
                          <input className="input" placeholder="PDF" value={edit.pdfFile} onChange={(event) => setBookEdits({ ...bookEdits, [book.id]: { ...edit, pdfFile: event.target.value } })} />
                          <textarea className="textarea" placeholder="Synopsis FR" value={edit.synopsisFr} onChange={(event) => setBookEdits({ ...bookEdits, [book.id]: { ...edit, synopsisFr: event.target.value } })} />
                          <textarea className="textarea" placeholder="简介 ZH" value={edit.synopsisZh} onChange={(event) => setBookEdits({ ...bookEdits, [book.id]: { ...edit, synopsisZh: event.target.value } })} />
                        </div>
                      ) : (
                        <p className="muted tiny">{book.synopsis_fr || "Sans synopsis"}</p>
                      )}

                      <div className="actions-row">
                        {isEditing ? (
                          <>
                            <button className="pill-button" type="button" onClick={() => void saveBook(book.id)}>Enregistrer</button>
                            <button className="pill-button" type="button" onClick={() => setEditingBookId(null)}>Annuler</button>
                          </>
                        ) : (
                          <button className="pill-button" type="button" onClick={() => setEditingBookId(book.id)}>Modifier</button>
                        )}
                        <button className="pill-button" type="button" onClick={() => void toggleVisibility(book.id, Boolean(book.visible))}>
                          {book.visible ? "Masquer" : "Publier"}
                        </button>
                        <button className="pill-button" type="button" onClick={() => void deleteBook(book.id)}>
                          Supprimer
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}

          {activeSection === "categories" ? (
            <>
              <div className="section-block">
                <h3>Créer une catégorie 新增类目</h3>
                <div className="input-group" style={{ marginTop: 10 }}>
                  <input className="input" placeholder="Nom du catégorie" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} />
                  <input className="input" placeholder="Description" value={categoryDescription} onChange={(event) => setCategoryDescription(event.target.value)} />
                  <button className="cta-button" type="button" onClick={() => void createCategory()}>Créer la catégorie</button>
                </div>
              </div>

              <div className="section-block">
                <h3>Catégories dynamiques 动态类目</h3>
                <div className="admin-list">
                  {categories.map((category) => (
                    <div className="split-line" key={category.id}>
                      <strong>{category.name}</strong>
                      <span className="tiny">{category.description || "Sans description"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {activeSection === "promo" ? (
            <>
              <div className="section-block">
                <h3>Créer un code promo 新增优惠码</h3>
                <div className="input-group admin-form-grid" style={{ marginTop: 10 }}>
                  <input className="input" placeholder="Code" value={promoForm.code} onChange={(event) => setPromoForm({ ...promoForm, code: event.target.value })} />
                  <input className="input" placeholder="Remise %" value={promoForm.discountPercent} onChange={(event) => setPromoForm({ ...promoForm, discountPercent: event.target.value })} />
                  <input className="input" type="datetime-local" value={promoForm.validFrom} onChange={(event) => setPromoForm({ ...promoForm, validFrom: event.target.value })} />
                  <input className="input" type="datetime-local" value={promoForm.validUntil} onChange={(event) => setPromoForm({ ...promoForm, validUntil: event.target.value })} />
                  <input className="input" placeholder="Texte bannière FR" value={promoForm.bannerTextFr} onChange={(event) => setPromoForm({ ...promoForm, bannerTextFr: event.target.value })} />
                  <input className="input" placeholder="漂浮提示 ZH" value={promoForm.bannerTextZh} onChange={(event) => setPromoForm({ ...promoForm, bannerTextZh: event.target.value })} />
                  <label className="tiny"><input type="checkbox" checked={promoForm.active} onChange={() => setPromoForm({ ...promoForm, active: !promoForm.active })} /> Actif</label>
                  <label className="tiny"><input type="checkbox" checked={promoForm.showBanner} onChange={() => setPromoForm({ ...promoForm, showBanner: !promoForm.showBanner })} /> Afficher sur l&apos;accueil</label>
                  <button className="cta-button" type="button" onClick={() => void createPromo()}>Créer le code</button>
                </div>
              </div>

              <div className="section-block">
                <h3>Codes promo 优惠码管理</h3>
                {promoCodes.length === 0 ? (
                  <p className="muted">Aucun code promo pour le moment.</p>
                ) : (
                  promoCodes.map((promo) => (
                    <div className="admin-book-card" key={promo.id}>
                      <div className="split-line">
                        <div>
                          <strong>{promo.code}</strong>
                          <div className="tiny">-{promo.discountPercent}% · {new Date(promo.validFrom).toLocaleDateString("fr-FR")} → {new Date(promo.validUntil).toLocaleDateString("fr-FR")}</div>
                          <div className="tiny">{isPromoActive(promo) ? "En cours" : "Hors période"} · Bannière {promo.showBanner ? "visible" : "masquée"}</div>
                        </div>
                        <div className="actions-row">
                          <button className="pill-button" type="button" onClick={() => void togglePromoBanner(promo)}>
                            {promo.showBanner ? "Masquer accueil" : "Afficher accueil"}
                          </button>
                          <button className="pill-button" type="button" onClick={() => void togglePromoActive(promo)}>
                            {promo.active ? "Désactiver" : "Activer"}
                          </button>
                          <button className="pill-button" type="button" onClick={() => void deletePromo(promo.id)}>
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : null}

          {activeSection === "downloads" ? (
            <div className="section-block">
              <h3>Historique de téléchargements 下载记录</h3>
              {downloads.length === 0 ? (
                <p className="muted">Aucun téléchargement enregistré.</p>
              ) : (
                downloads.map((download) => (
                  <div className="split-line" key={download.id}>
                    <span>{download.book_title || "Livre"}</span>
                    <span className="tiny">{download.user_email || "—"}</span>
                    {download.download_url ? (
                      <a className="pill-button" href={download.download_url} target="_blank" rel="noreferrer">
                        PDF
                      </a>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          ) : null}

          {activeSection === "donations" ? (
            <div className="section-block">
              <h3>Dons Donations</h3>
              {donations.length === 0 ? (
                <p className="muted">Aucune donation enregistrée.</p>
              ) : (
                donations.map((donation) => (
                  <div className="split-line" key={donation.id}>
                    <span>{donation.note || "Donation"}</span>
                    <span className="tiny">{donation.amount ? `${donation.amount.toFixed(2)} EUR` : "—"}</span>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminPageContent />
    </AdminGuard>
  );
}
