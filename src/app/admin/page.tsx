"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminGuard } from "@/components/admin-guard";
import { useAuth } from "@/components/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type BookRow = {
  id: string;
  title_fr: string;
  title_zh: string;
  visible: boolean;
  price_eur: number | null;
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
  created_at: string | null;
};

type DonationRow = {
  id: string;
  user_email: string | null;
  amount: number | null;
  note: string | null;
  created_at: string | null;
};

const adminSections = [
  { key: "books", label: "图书 Livres" },
  { key: "categories", label: "类目 Categories" },
  { key: "downloads", label: "下载 Downloads" },
  { key: "donations", label: "赞助 Donations" },
] as const;

type AdminSectionKey = (typeof adminSections)[number]["key"];

function AdminPageContent() {
  const { profile, signOut } = useAuth();
  const [books, setBooks] = useState<BookRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [downloads, setDownloads] = useState<DownloadRow[]>([]);
  const [donations, setDonations] = useState<DonationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<AdminSectionKey>("books");
  const [form, setForm] = useState({ titleFr: "", titleZh: "", priceEur: "", visible: true });
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setLoading(false);
      return;
    }

    const load = async () => {
      const [{ data: booksData }, { data: categoryData }, { data: downloadData }, { data: donationData }] = await Promise.all([
        supabase.from("books").select("id, title_fr, title_zh, visible, price_eur, amazon_ebook_url, amazon_paperback_url, created_at").order("created_at", { ascending: false }),
        supabase.from("categories").select("id, name, description, created_at").order("created_at", { ascending: false }),
        supabase.from("downloads").select("id, user_email, book_title, created_at").order("created_at", { ascending: false }),
        supabase.from("donations").select("id, user_email, amount, note, created_at").order("created_at", { ascending: false }),
      ]);

      setBooks((booksData || []) as BookRow[]);
      setCategories((categoryData || []) as CategoryRow[]);
      setDownloads((downloadData || []) as DownloadRow[]);
      setDonations((donationData || []) as DonationRow[]);
      setLoading(false);
    };

    void load();
  }, []);

  const createBook = async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const { error } = await supabase.from("books").insert({
      title_fr: form.titleFr,
      title_zh: form.titleZh,
      visible: form.visible,
      price_eur: Number(form.priceEur || 0),
      amazon_ebook_url: null,
      amazon_paperback_url: null,
    });

    if (!error) {
      setForm({ titleFr: "", titleZh: "", priceEur: "", visible: true });
      window.location.reload();
    }
  };

  const toggleVisibility = async (id: string, visible: boolean) => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    await supabase.from("books").update({ visible: !visible }).eq("id", id);
    window.location.reload();
  };

  const deleteBook = async (id: string) => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    await supabase.from("books").delete().eq("id", id);
    window.location.reload();
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
    window.location.reload();
  };

  const title = useMemo(() => profile?.displayName || profile?.email || "Admin", [profile]);

  return (
    <main className="page-shell">
      <header className="topbar glass">
        <div className="brand-mark">
          <div className="brand-avatar" />
          <div>
            <div className="tiny">后台概览 Admin</div>
            <strong>Visd AR 管理台</strong>
          </div>
        </div>
        <nav className="nav-links">
          <Link href="/">Accueil</Link>
          <Link href="/catalogue">Catalogue</Link>
          <Link href="/account">Mon compte</Link>
          <button className="nav-button" type="button" onClick={() => void signOut()}>
            Déconnexion
          </button>
        </nav>
      </header>

      <section className="dashboard-grid">
        <aside className="panel glass">
          <div className="admin-list section-block">
            {adminSections.map((section) => (
              <button
                className={activeSection === section.key ? "account-tab active" : "account-tab"}
                key={section.key}
                type="button"
                onClick={() => setActiveSection(section.key)}
              >
                <strong>{section.label}</strong>
              </button>
            ))}
          </div>
        </aside>

        <section className="panel glass">
          <h1 className="section-title" style={{ fontFamily: "var(--font-heading), serif" }}>
            管理后台 Admin bilingue
          </h1>
          <p className="section-caption">Bienvenue {title} — gestion complète des livres, catégories et statistiques.</p>

          {activeSection === "books" ? (
            <>
              <div className="section-block">
                <h3>Ajouter un livre / 新增图书</h3>
                <div className="input-group" style={{ marginTop: 10 }}>
                  <input className="input" placeholder="Titre FR" value={form.titleFr} onChange={(event) => setForm({ ...form, titleFr: event.target.value })} />
                  <input className="input" placeholder="Titre ZH" value={form.titleZh} onChange={(event) => setForm({ ...form, titleZh: event.target.value })} />
                  <input className="input" placeholder="Prix EUR" value={form.priceEur} onChange={(event) => setForm({ ...form, priceEur: event.target.value })} />
                  <label className="tiny"><input type="checkbox" checked={form.visible} onChange={() => setForm({ ...form, visible: !form.visible })} /> Visible</label>
                  <button className="cta-button" type="button" onClick={() => void createBook()}>Créer</button>
                </div>
              </div>

              <div className="section-block">
                <h3>Livres / 图书</h3>
                {loading ? <p className="muted">Chargement…</p> : books.map((book) => (
                  <div className="split-line" key={book.id}>
                    <div>
                      <strong>{book.title_zh}</strong>
                      <div className="tiny">{book.title_fr}</div>
                    </div>
                    <div className="actions-row">
                      <button className="pill-button" type="button" onClick={() => void toggleVisibility(book.id, Boolean(book.visible))}>
                        {book.visible ? "Masquer" : "Publier"}
                      </button>
                      <button className="pill-button" type="button" onClick={() => void deleteBook(book.id)}>
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          {activeSection === "categories" ? (
            <>
              <div className="section-block">
                <h3>Créer une catégorie / 新增类目</h3>
                <div className="input-group" style={{ marginTop: 10 }}>
                  <input className="input" placeholder="Nom du catégorie" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} />
                  <input className="input" placeholder="Description" value={categoryDescription} onChange={(event) => setCategoryDescription(event.target.value)} />
                  <button className="cta-button" type="button" onClick={() => void createCategory()}>Créer la catégorie</button>
                </div>
              </div>

              <div className="section-block">
                <h3>Catégories dynamiques / 动态类目</h3>
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

          {activeSection === "downloads" ? (
            <div className="section-block">
              <h3>Historique de téléchargements / 下载记录</h3>
              {downloads.length === 0 ? (
                <p className="muted">Aucun téléchargement enregistré.</p>
              ) : (
                downloads.map((download) => (
                  <div className="split-line" key={download.id}>
                    <span>{download.book_title || "Livre"}</span>
                    <span className="tiny">{download.user_email || "—"}</span>
                  </div>
                ))
              )}
            </div>
          ) : null}

          {activeSection === "donations" ? (
            <div className="section-block">
              <h3>Dons / Donations</h3>
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
