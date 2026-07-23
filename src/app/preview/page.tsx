import Link from "next/link";
import { ArrowRight, BookOpen, Sparkles, ShieldCheck, LayoutGrid } from "lucide-react";
import { books } from "@/data/books";
import { previewPlanSections, visualPillars } from "@/data/preview-plan";

export default function PreviewPage() {
  return (
    <main className="page-shell preview-shell">
      <header className="topbar glass topbar-luxury">
        <div className="brand-mark">
          <div className="brand-avatar" />
          <div>
            <div className="tiny">Design preview</div>
            <strong>Visd AR • 体验升级方案</strong>
          </div>
        </div>
        <nav className="nav-links">
          <Link href="/">首页</Link>
          <Link href="/catalogue">目录页</Link>
          <Link href="/account">账户页</Link>
        </nav>
      </header>

      <section className="preview-hero panel glass">
        <div className="preview-hero-copy">
          <span className="badge">
            <Sparkles size={16} />
            更美观大方的前端方案
          </span>
          <h1 className="section-title" style={{ fontSize: "clamp(2rem, 3.6vw, 3rem)", marginTop: 16 }}>
            把“绘本商城”变成更有温度、更有层次的双语品牌体验。
          </h1>
          <p className="section-caption">
            方案以“故事感主视觉、清晰信息层级、轻松购买路径”为核心，保留现有功能，同时让页面更像一款精致的书籍品牌。
          </p>
          <div className="actions-row">
            <Link className="cta-button" href="/catalogue">
              直接看目录预览 <ArrowRight size={16} />
            </Link>
            <a className="pill-button" href="#structure">
              查看结构建议
            </a>
          </div>
        </div>

        <div className="preview-showcase">
          <div className="showcase-card">
            <BookOpen size={20} />
            <strong>主视觉</strong>
            <span>柔和渐变 + 留白 + 玻璃质感</span>
          </div>
          <div className="showcase-card">
            <LayoutGrid size={20} />
            <strong>内容层级</strong>
            <span>Hero / 目录 / 账户 / 管理更清晰</span>
          </div>
          <div className="showcase-card">
            <ShieldCheck size={20} />
            <strong>品牌统一</strong>
            <span>统一按钮、卡片和信息条</span>
          </div>
        </div>
      </section>

      <section id="structure" className="preview-grid">
        <article className="panel glass">
          <div className="badge">结构建议</div>
          <div className="section-block">
            {previewPlanSections.map((section) => (
              <div className="preview-card" key={section.title}>
                <h3>{section.title}</h3>
                <p>{section.body}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="panel glass">
          <div className="badge">视觉支柱</div>
          <div className="section-block">
            {visualPillars.map((pillar) => (
              <div className="split-line" key={pillar}>
                <strong>{pillar}</strong>
                <span>更清楚的产品感</span>
              </div>
            ))}
          </div>

          <div className="section-block">
            <div className="tiny">推荐的内容模块</div>
            <div className="book-grid preview-book-grid">
              {books.slice(0, 2).map((book) => (
                <div className="preview-book-card" key={book.id}>
                  <div className="book-cover" style={{ background: book.accent, minHeight: 140 }}>
                    <strong>{book.titleFr}</strong>
                  </div>
                  <div className="section-block">
                    <strong>{book.titleZh}</strong>
                    <p className="muted">{book.teachingPointFr}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
