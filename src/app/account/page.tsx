"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type CommentRecord = {
  id: string;
  content: string | null;
  created_at: string | null;
};

type DownloadRecord = {
  id: string;
  book_title: string | null;
  created_at: string | null;
};

type DonationRecord = {
  id: string;
  amount: number | null;
  note: string | null;
  created_at: string | null;
};

export default function AccountPage() {
  const { user, profile, loading, isAdmin, signOut } = useAuth();
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [fetching, setFetching] = useState(true);
  const [activeTab, setActiveTab] = useState<"comments" | "downloads" | "donations">("comments");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !user) {
      setFetching(false);
      return;
    }

    const load = async () => {
      setFetching(true);
      const [{ data: commentData }, { data: downloadData }, { data: donationData }] = await Promise.all([
        supabase.from("comments").select("id, content, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("downloads").select("id, book_title, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("donations").select("id, amount, note, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);

      setComments((commentData || []) as CommentRecord[]);
      setDownloads((downloadData || []) as DownloadRecord[]);
      setDonations((donationData || []) as DonationRecord[]);
      setFetching(false);
    };

    void load();
  }, [user]);

  const greeting = useMemo(() => profile?.displayName || user?.email || "Lecteur", [profile, user]);
  const tabs = [
    { key: "comments", label: "Commentaires", count: comments.length },
    { key: "downloads", label: "Telechargements", count: downloads.length },
    { key: "donations", label: "Donations", count: donations.length },
  ] as const;

  return (
    <main className="page-shell">
      <header className="topbar glass">
        <div className="brand-mark">
          <div className="brand-avatar" />
          <div>
            <div className="tiny">Espace lecteur</div>
            <strong>Mon compte</strong>
          </div>
        </div>
        <nav className="nav-links">
          <Link href="/">Accueil</Link>
          <Link href="/catalogue">Catalogue</Link>
          {isAdmin ? <Link href="/admin">Admin</Link> : null}
          <button className="nav-button" type="button" onClick={() => void signOut()}>
            Déconnexion
          </button>
        </nav>
      </header>

      <section className="panel glass">
        <h1 className="section-title" style={{ fontFamily: "var(--font-heading), serif" }}>
          Bonjour {greeting}
        </h1>
        <p className="section-caption">
          Votre espace lecteur affiche vos commentaires, vos telechargements et vos donations dans un seul panneau.
        </p>

        {loading || fetching ? (
          <p className="muted">Chargement…</p>
        ) : (
          <>
            <div className="account-tab-strip" style={{ marginBottom: 18 }}>
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  className={activeTab === tab.key ? "account-tab active" : "account-tab"}
                  type="button"
                  onClick={() => setActiveTab(tab.key as "comments" | "downloads" | "donations")}
                >
                  <span>{tab.label}</span>
                  <strong>{tab.count}</strong>
                </button>
              ))}
            </div>

            <div className="account-list account-panel-list">
              {activeTab === "comments" ? (
                <div className="account-card">
                  <div className="split-line">
                    <strong>Commentaires</strong>
                    <span>{comments.length}</span>
                  </div>
                  {comments.length === 0 ? (
                    <p className="muted">Aucun commentaire pour le moment.</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="split-line" style={{ marginTop: 8 }}>
                        <span>{comment.content || "Commentaire"}</span>
                        <span className="tiny">{comment.created_at ? new Date(comment.created_at).toLocaleDateString("fr-FR") : "—"}</span>
                      </div>
                    ))
                  )}
                </div>
              ) : null}

              {activeTab === "downloads" ? (
                <div className="account-card">
                  <div className="split-line">
                    <strong>Historique des téléchargements</strong>
                    <span>{downloads.length}</span>
                  </div>
                  {downloads.length === 0 ? (
                    <p className="muted">Aucun telechargement enregistre.</p>
                  ) : (
                    downloads.map((download) => (
                      <div key={download.id} className="split-line" style={{ marginTop: 8 }}>
                        <span>{download.book_title || "Livre"}</span>
                        <span className="tiny">{download.created_at ? new Date(download.created_at).toLocaleDateString("fr-FR") : "—"}</span>
                      </div>
                    ))
                  )}
                </div>
              ) : null}

              {activeTab === "donations" ? (
                <div className="account-card">
                  <div className="split-line">
                    <strong>Historique des donations</strong>
                    <span>{donations.length}</span>
                  </div>
                  {donations.length === 0 ? (
                    <p className="muted">Aucune donation enregistree.</p>
                  ) : (
                    donations.map((donation) => (
                      <div key={donation.id} className="split-line" style={{ marginTop: 8 }}>
                        <span>{donation.note || "Donation"}</span>
                        <span className="tiny">{donation.amount ? `${donation.amount.toFixed(2)} EUR` : "—"}</span>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
