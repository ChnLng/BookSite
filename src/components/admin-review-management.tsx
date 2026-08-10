"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";

type ReviewSource = "home" | "book" | "resource";

type AdminReview = {
  id: string;
  source: ReviewSource;
  entityId: string | null;
  locationLabel: string;
  locationHref: string;
  authorName: string;
  userEmail: string;
  rating: number | null;
  content: string;
  visible: boolean;
  createdAt: string | null;
};

type AdminReviewManagementProps = {
  onCountChange?: (count: number) => void;
};

function formatReviewDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function renderRating(rating: number | null) {
  if (rating == null) return <span className="admin-review-no-rating">—</span>;
  const safeRating = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span className="admin-review-rating" aria-label={`${safeRating} étoiles sur 5`}>
      <span aria-hidden="true">{"★".repeat(safeRating)}{"☆".repeat(5 - safeRating)}</span>
      <strong>{safeRating}/5</strong>
    </span>
  );
}

export function AdminReviewManagement({ onCountChange }: AdminReviewManagementProps) {
  const { session } = useAuth();
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [homeSupportsVisibility, setHomeSupportsVisibility] = useState(true);

  const loadReviews = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);

    try {
      const response = await fetch("/api/admin/reviews", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const result = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string; reviews?: AdminReview[]; homeSupportsVisibility?: boolean }
        | null;

      if (!response.ok || !result?.ok) {
        setMessage(result?.message || "Chargement des évaluations impossible.");
        return;
      }

      const nextReviews = result.reviews || [];
      setReviews(nextReviews);
      setHomeSupportsVisibility(result.homeSupportsVisibility !== false);
      onCountChange?.(nextReviews.length);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Chargement des évaluations impossible.");
    } finally {
      setLoading(false);
    }
  }, [onCountChange, session?.access_token]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const filteredReviews = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fr-FR");
    if (!normalizedQuery) return reviews;

    return reviews.filter((review) =>
      [review.locationLabel, review.authorName, review.userEmail, review.content, formatReviewDate(review.createdAt)]
        .some((value) => value.toLocaleLowerCase("fr-FR").includes(normalizedQuery)),
    );
  }, [query, reviews]);

  const toggleVisibility = async (review: AdminReview) => {
    if (!session?.access_token) return;
    const key = `${review.source}:${review.id}`;
    setBusyKey(key);
    setMessage("");

    try {
      const response = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: review.id, source: review.source, visible: !review.visible }),
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;

      if (!response.ok || !result?.ok) {
        setMessage(result?.message || "Modification impossible.");
        return;
      }

      setReviews((current) => current.map((item) =>
        item.id === review.id && item.source === review.source
          ? { ...item, visible: !item.visible }
          : item,
      ));
      setMessage(review.visible ? "评价已隐藏。" : "评价已重新显示。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Modification impossible.");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="section-block admin-review-section">
      <div className="split-line admin-review-heading">
        <div>
          <h2>🔎 所有用户评价 Toutes les évaluations</h2>
          <p className="muted">主页、图书页和工具商品页的评价统一按最新时间排列。</p>
        </div>
        <span className="admin-review-total">总数 Total : <strong>{reviews.length}</strong></span>
      </div>

      <div className="actions-row admin-review-search">
        <input
          className="input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="位置、用户名、邮箱、内容或日期"
        />
        <button className="pill-button" type="button" onClick={() => void loadReviews()}>
          刷新 Actualiser
        </button>
      </div>

      {!homeSupportsVisibility ? (
        <p className="admin-review-migration-note" role="status">
          主页评论已读取；执行 Supabase migration 后即可使用隐藏/恢复功能。
        </p>
      ) : null}
      {message ? <p className="admin-action-status" role="status">{message}</p> : null}

      <div className="admin-table-wrap admin-review-table-wrap">
        <table className="admin-data-table admin-review-table">
          <colgroup>
            <col className="review-col-location" />
            <col className="review-col-content" />
            <col className="review-col-rating" />
            <col className="review-col-user" />
            <col className="review-col-email" />
            <col className="review-col-time" />
            <col className="review-col-action" />
          </colgroup>
          <thead>
            <tr>
              <th>位置 Emplacement</th>
              <th>评价内容 Avis</th>
              <th>星级 Note</th>
              <th>用户名</th>
              <th>邮箱 E-mail</th>
              <th>时间（精确到秒）</th>
              <th>显示管理</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="admin-table-empty" colSpan={7}>Chargement...</td></tr>
            ) : filteredReviews.length === 0 ? (
              <tr><td className="admin-table-empty" colSpan={7}>暂无评价 · Aucune évaluation.</td></tr>
            ) : filteredReviews.map((review) => {
              const key = `${review.source}:${review.id}`;
              const homeToggleUnavailable = review.source === "home" && !homeSupportsVisibility;
              return (
                <tr className={review.visible ? "" : "admin-review-row-hidden"} key={key}>
                  <td>
                    <a className="admin-review-location" href={review.locationHref} target="_blank" rel="noreferrer">
                      {review.locationLabel}
                    </a>
                    <span className={`admin-review-visibility ${review.visible ? "visible" : "hidden"}`}>
                      {review.visible ? "显示中 Visible" : "已隐藏 Masqué"}
                    </span>
                  </td>
                  <td><span className="admin-review-content">{review.content || "—"}</span></td>
                  <td>{renderRating(review.rating)}</td>
                  <td>{review.authorName || "—"}</td>
                  <td><span className="admin-review-email">{review.userEmail || "—"}</span></td>
                  <td><time dateTime={review.createdAt || undefined}>{formatReviewDate(review.createdAt)}</time></td>
                  <td>
                    <button
                      className={`pill-button admin-review-toggle ${review.visible ? "" : "restore"}`}
                      type="button"
                      disabled={busyKey === key || homeToggleUnavailable}
                      onClick={() => void toggleVisibility(review)}
                    >
                      {busyKey === key ? "..." : review.visible ? "隐藏 Masquer" : "显示 Afficher"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
