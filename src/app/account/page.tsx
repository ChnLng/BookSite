"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { PasswordSettingsCard } from "@/components/password-settings-card";
import { TopNav } from "@/components/top-nav";
import { useAuth } from "@/components/auth-provider";
import { bookIdFromDownload } from "@/lib/purchase-access";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type CommentRecord = {
  id: string;
  content: string | null;
  author_name: string | null;
  created_at: string | null;
};

type LikedCommentRecord = {
  likeId: string;
  commentId: string;
  content: string | null;
  authorName: string | null;
  createdAt: string | null;
};

type EvaluationRecord = {
  id: string;
  kind: "book" | "resource";
  itemId: string;
  slug: string;
  title: string;
  imageUrl: string;
  authorName: string | null;
  rating: number;
  reviewText: string;
  createdAt: string | null;
};

type DownloadRecord = {
  id: string;
  download_kind: string | null;
  book_id: string | null;
  book_title: string | null;
  resource_id: string | null;
  resource_title: string | null;
  download_url: string | null;
  created_at: string | null;
  amount_paid?: number | null;
  currency?: string | null;
  payment_status?: string | null;
  paid_at?: string | null;
  refunded_at?: string | null;
  invoice_number?: string | null;
  download_count?: number | null;
  last_downloaded_at?: string | null;
};

type DonationRecord = {
  id: string;
  amount: number | null;
  note: string | null;
  created_at: string | null;
};

export default function AccountPage() {
  const { user, profile, session, loading } = useAuth();
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [likedComments, setLikedComments] = useState<LikedCommentRecord[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
  const [fetching, setFetching] = useState(true);
  const [activeTab, setActiveTab] = useState<"comments" | "purchases" | "downloads" | "donations" | "likes" | "evaluations">("comments");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [editingAuthorName, setEditingAuthorName] = useState("");
  const [commentActionMessage, setCommentActionMessage] = useState("");
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  useEffect(() => {
    if (!user) {
      setComments([]);
      setDownloads([]);
      setDonations([]);
      setLikedComments([]);
      setEvaluations([]);
    }
  }, [user]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !user) {
      setFetching(false);
      return;
    }

    const load = async () => {
      setFetching(true);
      const email = user.email || "";
      const [
        { data: commentData },
        { data: downloadByUser },
        { data: downloadByEmail },
        { data: donationData },
        { data: likedRows },
        { data: bookReviewRows },
        { data: resourceReviewRows },
      ] = await Promise.all([
        supabase.from("comments").select("id, content, author_name, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("downloads").select("id, download_kind, book_id, book_title, resource_id, resource_title, download_url, created_at, amount_paid, currency, payment_status, paid_at, refunded_at, invoice_number, download_count, last_downloaded_at").eq("user_id", user.id).order("created_at", { ascending: false }),
        email
          ? supabase.from("downloads").select("id, download_kind, book_id, book_title, resource_id, resource_title, download_url, created_at, amount_paid, currency, payment_status, paid_at, refunded_at, invoice_number, download_count, last_downloaded_at").eq("user_email", email).order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
        supabase.from("donations").select("id, amount, note, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("comment_likes").select("id, comment_id").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("book_reviews").select("id, book_id, author_name, rating, review_text, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("resource_reviews").select("id, resource_id, author_name, rating, review_text, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);

      const mergedDownloads = [...(downloadByUser || []), ...(downloadByEmail || [])].filter(
        (item, index, array) => array.findIndex((entry) => entry.id === item.id) === index,
      ) as DownloadRecord[];

      const likedCommentIds = Array.from(
        new Set(((likedRows || []) as Array<{ id: string; comment_id: string | null }>).map((row) => row.comment_id).filter(Boolean) as string[]),
      );
      const likedRowsByCommentId = new Map(
        ((likedRows || []) as Array<{ id: string; comment_id: string | null }>)
          .filter((row) => row.comment_id)
          .map((row) => [row.comment_id as string, row.id]),
      );

      const [{ data: likedCommentRows }, { data: bookRows }, { data: resourceRows }] = await Promise.all([
        likedCommentIds.length > 0
          ? supabase
              .from("comments")
              .select("id, content, author_name, created_at")
              .in("id", likedCommentIds)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
        (bookReviewRows || []).length > 0
          ? supabase
              .from("books")
              .select("id, slug, title_fr, cover_image")
          : Promise.resolve({ data: [] }),
        (resourceReviewRows || []).length > 0
          ? supabase
              .from("resource_items")
              .select("id, slug, title_fr, cover_image_url, qr_image_url")
          : Promise.resolve({ data: [] }),
      ]);

      const likedCommentRecords = ((likedCommentRows || []) as Array<{
        id: string;
        content: string | null;
        author_name: string | null;
        created_at: string | null;
      }>).map((row) => ({
        likeId: likedRowsByCommentId.get(row.id) || row.id,
        commentId: row.id,
        content: row.content,
        authorName: row.author_name,
        createdAt: row.created_at,
      }));

      const bookMetaById = new Map<string, { id: string; slug: string | null; title_fr: string | null; cover_image: string | null }>();
      ((bookRows || []) as Array<{ id: string; slug: string | null; title_fr: string | null; cover_image: string | null }>).forEach((row) => {
        bookMetaById.set(row.id, row);
        if (row.slug) bookMetaById.set(row.slug, row);
      });

      const resourceMetaById = new Map<string, {
        id: string;
        slug: string | null;
        title_fr: string | null;
        cover_image_url: string | null;
        qr_image_url: string | null;
      }>();
      ((resourceRows || []) as Array<{
          id: string;
          slug: string | null;
          title_fr: string | null;
          cover_image_url: string | null;
          qr_image_url: string | null;
        }>).forEach((row) => {
          resourceMetaById.set(row.id, row);
          if (row.slug) resourceMetaById.set(row.slug, row);
        });

      const mergedEvaluations: EvaluationRecord[] = [
        ...((bookReviewRows || []) as Array<{
          id: string;
          book_id: string | null;
          author_name: string | null;
          rating: number | null;
          review_text: string | null;
          created_at: string | null;
        }>).map((row) => {
          const meta = row.book_id ? bookMetaById.get(row.book_id) : null;
          return {
            id: row.id,
            kind: "book" as const,
            itemId: row.book_id || "",
            slug: meta?.slug || row.book_id || "",
            title: meta?.title_fr || "Livre",
            imageUrl: meta?.cover_image || "/images/logo.png",
            authorName: row.author_name,
            rating: Number(row.rating || 0),
            reviewText: row.review_text || "",
            createdAt: row.created_at,
          };
        }),
        ...((resourceReviewRows || []) as Array<{
          id: string;
          resource_id: string | null;
          author_name: string | null;
          rating: number | null;
          review_text: string | null;
          created_at: string | null;
        }>).map((row) => {
          const meta = row.resource_id ? resourceMetaById.get(row.resource_id) : null;
          return {
            id: row.id,
            kind: "resource" as const,
            itemId: row.resource_id || "",
            slug: meta?.slug || row.resource_id || "",
            title: meta?.title_fr || "Outil",
            imageUrl: meta?.cover_image_url || meta?.qr_image_url || "/images/logo.png",
            authorName: row.author_name,
            rating: Number(row.rating || 0),
            reviewText: row.review_text || "",
            createdAt: row.created_at,
          };
        }),
      ].sort((left, right) => {
        const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
        const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
        return rightTime - leftTime;
      });

      setComments((commentData || []) as CommentRecord[]);
      setDownloads(mergedDownloads);
      setDonations((donationData || []) as DonationRecord[]);
      setLikedComments(likedCommentRecords);
      setEvaluations(mergedEvaluations);
      setFetching(false);
    };

    void load();
  }, [user]);

  const greeting = useMemo(() => profile?.displayName || user?.email || "Lecteur", [profile, user]);

  const startEditingComment = (comment: CommentRecord) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content || "");
    setEditingAuthorName(comment.author_name || "");
    setCommentActionMessage("");
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditingContent("");
    setEditingAuthorName("");
  };

  const saveComment = async (commentId: string) => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !user || !editingContent.trim()) {
      return;
    }

    const { error } = await supabase
      .from("comments")
      .update({
        content: editingContent.trim(),
        author_name: editingAuthorName.trim() || null,
      })
      .eq("id", commentId)
      .eq("user_id", user.id);

    if (error) {
      setCommentActionMessage(error.message);
      return;
    }

    setComments((current) =>
      current.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              content: editingContent.trim(),
              author_name: editingAuthorName.trim() || null,
            }
          : comment,
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

  const handlePdfDownload = async (bookId: string) => {
    if (!session?.access_token) {
      return;
    }

    const response = await fetch(`/api/books/${bookId}/pdf`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      return;
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `${bookId}_book.pdf`;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  };

  const handleResourceDownload = async (resourceId: string) => {
    if (!session?.access_token) {
      return;
    }

    const response = await fetch(`/api/resources/${resourceId}/download`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const contentType = response.headers.get("content-type") || "";
    if (response.ok && !contentType.includes("application/json")) {
      const blobUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = "téléchargement";
      anchor.click();
      URL.revokeObjectURL(blobUrl);
      return;
    }

    const result = (await response.json().catch(() => null)) as { ok?: boolean; url?: string } | null;

    if (!response.ok || !result?.ok || !result.url) {
      return;
    }

    window.open(result.url, "_blank", "noopener,noreferrer");
  };

  const downloadInvoice = async (purchaseId: string, invoiceNumber?: string | null) => {
    if (!session?.access_token) return;
    const response = await fetch(`/api/account/purchases/${purchaseId}/invoice`, { headers: { Authorization: `Bearer ${session.access_token}` } });
    if (!response.ok) return;
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `facture-${invoiceNumber || purchaseId}.pdf`; anchor.click(); URL.revokeObjectURL(url);
  };

  const toggleLikedComment = async (commentId: string) => {
    if (!session?.access_token) {
      return;
    }

    const response = await fetch(`/api/messages/${commentId}/like`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      return;
    }

    setLikedComments((current) => current.filter((item) => item.commentId !== commentId));
  };

  const renderStars = (rating: number) => {
    const safeRating = Math.max(0, Math.min(5, Math.round(rating)));
    return "★".repeat(safeRating) + "☆".repeat(Math.max(0, 5 - safeRating));
  };

  const tabs = [
    { key: "comments", label: "Commentaires", count: comments.length },
    { key: "likes", label: "J'aime", count: likedComments.length },
    { key: "evaluations", label: "Évaluations", count: evaluations.length },
    { key: "purchases", label: "Achats", count: downloads.length },
    { key: "downloads", label: "Téléchargements", count: downloads.length },
    { key: "donations", label: "Donations", count: donations.length },
  ] as const;

  return (
    <main className="page-shell">
      <TopNav
        title="Visd AR"
        subtitle="Hub bilingue 🇨🇳 Chinois - Français 🇫🇷"
        showAdmin
        showLogout
      />

      <section className="panel glass" style={{ marginTop: 22 }}>
        <div className="account-header-row">
          <h1 className="section-title" style={{ fontFamily: "var(--font-heading), serif", margin: 0 }}>
            Bonjour {greeting}
          </h1>
          {user ? (
            <button
              className="pill-button account-password-toggle"
              type="button"
              onClick={() => setShowPasswordSection((current) => !current)}
              aria-expanded={showPasswordSection}
              aria-controls="account-password-section"
            >
              <LockKeyhole size={15} />
              <span>Modifier le mot de passe</span>
            </button>
          ) : null}
        </div>
        <p className="section-caption">
          Votre espace lecteur affiche vos commentaires, vos téléchargements et vos donations dans un seul panneau.
        </p>

        {loading || fetching ? (
          <p className="muted">Chargement…</p>
        ) : (
          <>
            {user && showPasswordSection ? (
              <div id="account-password-section" className="account-password-section">
                <PasswordSettingsCard
                  userEmail={user.email}
                  onSuccess={() => {
                    setShowPasswordSection(false);
                  }}
                />
              </div>
            ) : null}

            <div className="account-tab-strip" style={{ marginBottom: 18 }}>
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  className={activeTab === tab.key ? "account-tab active" : "account-tab"}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
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
                            <>
                              <input
                                className="input"
                                value={editingAuthorName}
                                onChange={(event) => setEditingAuthorName(event.target.value)}
                                placeholder="Pseudo"
                                style={{ marginBottom: 10 }}
                              />
                              <textarea
                                className="textarea"
                                value={editingContent}
                                onChange={(event) => setEditingContent(event.target.value)}
                                style={{ minHeight: 80 }}
                              />
                            </>
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

              {activeTab === "likes" ? (
                <div className="account-card">
                  <div className="split-line">
                    <strong>Commentaires aimés</strong>
                    <span>{likedComments.length}</span>
                  </div>
                  {likedComments.length === 0 ? (
                    <p className="muted">Aucun j'aime pour le moment. Revenez sur l'accueil pour soutenir les commentaires que vous aimez.</p>
                  ) : (
                    likedComments.map((item) => (
                      <div key={item.likeId} className="split-line" style={{ marginTop: 8, alignItems: "flex-start" }}>
                        <div style={{ flex: 1 }}>
                          <div className="tiny" style={{ marginBottom: 4 }}>
                            {item.authorName || "Lecteur"}
                          </div>
                          <span>{item.content || "Commentaire"}</span>
                          <div className="tiny" style={{ marginTop: 6 }}>
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString("fr-FR") : "—"}
                          </div>
                        </div>
                        <div className="actions-row" style={{ marginTop: 0, flexShrink: 0 }}>
                          <button className="pill-button" type="button" onClick={() => void toggleLikedComment(item.commentId)}>
                            Retirer le j&apos;aime
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : null}

              {activeTab === "evaluations" ? (
                <div className="account-card">
                  <div className="split-line">
                    <strong>Vos evaluations</strong>
                    <span>{evaluations.length}</span>
                  </div>
                  {evaluations.length === 0 ? (
                    <p className="muted">Aucune evaluation publiee pour le moment.</p>
                  ) : (
                    evaluations.map((evaluation) => {
                      const itemHref = evaluation.kind === "book" ? `/livres/${evaluation.slug}` : `/outils/${evaluation.slug}`;
                      return (
                        <div key={`${evaluation.kind}-${evaluation.id}`} className="account-evaluation-row">
                          <div className="account-evaluation-cover">
                            <Image
                              src={evaluation.imageUrl}
                              alt={evaluation.title}
                              fill
                              sizes="44px"
                              style={{ objectFit: "cover" }}
                            />
                          </div>
                          <Link className="account-evaluation-product" href={itemHref}>
                            {evaluation.title}
                          </Link>
                          <span className="account-evaluation-kind tiny">{evaluation.kind === "book" ? "Livre" : "Outil"}</span>
                          <span className="account-evaluation-rating tiny">
                            {renderStars(evaluation.rating)}
                            {evaluation.authorName ? ` · ${evaluation.authorName}` : ""}
                          </span>
                          <span className="account-evaluation-text tiny">
                            {evaluation.reviewText || "Evaluation sans texte."}
                          </span>
                          <span className="account-evaluation-date tiny">
                            {evaluation.createdAt ? new Date(evaluation.createdAt).toLocaleDateString("fr-FR") : "—"}
                          </span>
                        </div>
                      );
                    })
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
                    <p className="muted">Aucun téléchargement enregistré.</p>
                  ) : (
                    downloads.filter((download) => Number(download.download_count || 0) > 0 || download.last_downloaded_at).map((download) => {
                      const readBookId = bookIdFromDownload(download);
                      const isResourceDownload = download.download_kind === "resource" && download.resource_id;

                      return (
                      <div key={download.id} className="split-line" style={{ marginTop: 8 }}>
                        <div>
                          <span>{isResourceDownload ? download.resource_title || "Ressource" : download.book_title || "Livre"}</span>
                          <div className="actions-row" style={{ marginTop: 6, marginBottom: 0 }}>
                            {isResourceDownload ? (
                              <Link className="cta-button compact-submit" href={`/outils/${download.resource_id}`}>
                                Voir la fiche
                              </Link>
                            ) : null}
                            {isResourceDownload && download.resource_id ? (
                              <button
                                className="cta-button secondary compact-submit"
                                type="button"
                                onClick={() => void handleResourceDownload(download.resource_id as string)}
                              >
                                Télécharger
                              </button>
                            ) : null}
                            {!isResourceDownload && readBookId ? (
                              <Link className="cta-button compact-submit" href={`/read/${readBookId}`}>
                                Lire en ligne
                              </Link>
                            ) : null}
                            {!isResourceDownload && readBookId ? (
                              <button
                                className="cta-button secondary compact-submit"
                                type="button"
                                onClick={() => void handlePdfDownload(readBookId)}
                              >
                                Télécharger le PDF
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <span className="tiny">{download.last_downloaded_at ? new Date(download.last_downloaded_at).toLocaleDateString("fr-FR") : "—"} · {download.download_count || 0}</span>
                      </div>
                      );
                    })
                  )}
                </div>
              ) : null}

              {activeTab === "purchases" ? (
                <div className="account-card">
                  <div className="split-line"><strong>Historique des achats 购买记录</strong><span>{downloads.length}</span></div>
                  {downloads.length === 0 ? <p className="muted">Aucun achat enregistré.</p> : downloads.map((purchase) => {
                    const isResource = purchase.download_kind === "resource" && purchase.resource_id;
                    const bookId = bookIdFromDownload(purchase);
                    const downloadable = purchase.payment_status !== "refunded" && purchase.payment_status !== "refund_pending";
                    return <div key={`purchase-${purchase.id}`} className="account-purchase-row">
                      <strong className="account-purchase-title">{isResource ? purchase.resource_title || "Ressource" : purchase.book_title || "Livre"}</strong>
                      <span className="account-purchase-date">Acheté le {new Date(purchase.paid_at || purchase.created_at || Date.now()).toLocaleString("fr-FR")}</span>
                      <span className="account-purchase-status">{Number(purchase.amount_paid || 0) > 0 ? "Payé" : "Gratuit"}</span>
                      <strong className="account-purchase-amount">{Number(purchase.amount_paid || 0).toFixed(2)} {purchase.currency || "EUR"}</strong>
                      <div className="account-purchase-actions">
                        {downloadable && isResource ? <button className="pill-button" type="button" onClick={() => void handleResourceDownload(purchase.resource_id as string)}>Télécharger</button> : null}
                        {downloadable && !isResource && bookId ? <button className="pill-button" type="button" onClick={() => void handlePdfDownload(bookId)}>Télécharger</button> : null}
                        <button className="pill-button" type="button" onClick={() => void downloadInvoice(purchase.id, purchase.invoice_number)}>Facture PDF</button>
                      </div>
                    </div>;
                  })}
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
