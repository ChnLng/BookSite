"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { useAuth } from "@/components/auth-provider";
import { bookIdFromDownload } from "@/lib/purchase-access";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type CommentRecord = {
  id: string;
  content: string | null;
  author_name: string | null;
  created_at: string | null;
};

type DownloadRecord = {
  id: string;
  book_id: string | null;
  book_title: string | null;
  download_url: string | null;
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
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [commentActionMessage, setCommentActionMessage] = useState("");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !user) {
      setFetching(false);
      return;
    }

    const load = async () => {
      setFetching(true);
      const email = user.email || "";
      const [{ data: commentData }, { data: downloadByUser }, { data: downloadByEmail }, { data: donationData }] = await Promise.all([
        supabase.from("comments").select("id, content, author_name, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("downloads").select("id, book_id, book_title, download_url, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
        email
          ? supabase.from("downloads").select("id, book_id, book_title, download_url, created_at").eq("user_email", email).order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
        supabase.from("donations").select("id, amount, note, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);

      const mergedDownloads = [...(downloadByUser || []), ...(downloadByEmail || [])].filter(
        (item, index, array) => array.findIndex((entry) => entry.id === item.id) === index,
      ) as DownloadRecord[];

      setComments((commentData || []) as CommentRecord[]);
      setDownloads(mergedDownloads);
      setDonations((donationData || []) as DonationRecord[]);
      setFetching(false);
    };

    void load();
  }, [user]);

  const greeting = useMemo(() => profile?.displayName || user?.email || "Lecteur", [profile, user]);

  const startEditingComment = (comment: CommentRecord) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content || "");
    setCommentActionMessage("");
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditingContent("");
  };

  const saveComment = async (commentId: string) => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !user || !editingContent.trim()) {
      return;
    }

    const { error } = await supabase
      .from("comments")
      .update({ content: editingContent.trim() })
      .eq("id", commentId)
      .eq("user_id", user.id);

    if (error) {
      setCommentActionMessage(error.message);
      return;
    }

    setComments((current) =>
      current.map((comment) =>
        comment.id === commentId ? { ...comment, content: editingContent.trim() } : comment,
      ),
    );
    cancelEditingComment();
    setCommentActionMessage("Commentaire mis à jour.");
  };

  const deleteComment = async (commentId: string) => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !user) {
      return;
    }

    const { error } = await supabase.from("comments").delete().eq("id", commentId).eq("user_id", user.id);

    if (error) {
      setCommentActionMessage(error.message);
      return;
    }

    setComments((current) => current.filter((comment) => comment.id !== commentId));
    if (editingCommentId === commentId) {
      cancelEditingComment();
    }
    setCommentActionMessage("Commentaire supprimé.");
  };

  const tabs = [
    { key: "comments", label: "Commentaires", count: comments.length },
    { key: "downloads", label: "Telechargements", count: downloads.length },
    { key: "donations", label: "Donations", count: donations.length },
  ] as const;

  return (
    <main className="page-shell">
      <header className="topbar glass">
        <div className="brand-mark">
          <BrandLogo />
          <div>
            <div className="tiny">Ma page</div>
            <strong>Ma page</strong>
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
                    <p className="muted">Aucun commentaire pour le moment. Laissez-en un depuis l&apos;accueil.</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="split-line" style={{ marginTop: 8, alignItems: "flex-start" }}>
                        <div style={{ flex: 1 }}>
                          {comment.author_name ? (
                            <div className="tiny" style={{ marginBottom: 4 }}>{comment.author_name}</div>
                          ) : null}
                          {editingCommentId === comment.id ? (
                            <textarea
                              className="textarea"
                              value={editingContent}
                              onChange={(event) => setEditingContent(event.target.value)}
                              style={{ minHeight: 80 }}
                            />
                          ) : (
                            <span>{comment.content || "Commentaire"}</span>
                          )}
                          <div className="tiny" style={{ marginTop: 6 }}>
                            {comment.created_at ? new Date(comment.created_at).toLocaleDateString("fr-FR") : "—"}
                          </div>
                        </div>
                        <div className="actions-row" style={{ marginTop: 0, flexShrink: 0 }}>
                          {editingCommentId === comment.id ? (
                            <>
                              <button className="pill-button" type="button" onClick={() => void saveComment(comment.id)}>
                                Enregistrer
                              </button>
                              <button className="pill-button" type="button" onClick={cancelEditingComment}>
                                Annuler
                              </button>
                            </>
                          ) : (
                            <>
                              <button className="pill-button" type="button" onClick={() => startEditingComment(comment)}>
                                Modifier
                              </button>
                              <button className="pill-button" type="button" onClick={() => void deleteComment(comment.id)}>
                                Supprimer
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  {commentActionMessage ? <p className="tiny">{commentActionMessage}</p> : null}
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
                    downloads.map((download) => {
                      const readBookId = bookIdFromDownload(download);

                      return (
                      <div key={download.id} className="split-line" style={{ marginTop: 8 }}>
                        <div>
                          <span>{download.book_title || "Livre"}</span>
                          <div className="actions-row" style={{ marginTop: 6, marginBottom: 0 }}>
                            {readBookId ? (
                              <Link className="cta-button compact-submit" href={`/read/${readBookId}`}>
                                Lire en ligne
                              </Link>
                            ) : null}
                            {download.download_url ? (
                              <a className="cta-button secondary compact-submit" href={download.download_url} target="_blank" rel="noreferrer">
                                Telecharger le PDF
                              </a>
                            ) : null}
                          </div>
                        </div>
                        <span className="tiny">{download.created_at ? new Date(download.created_at).toLocaleDateString("fr-FR") : "—"}</span>
                      </div>
                      );
                    })
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
