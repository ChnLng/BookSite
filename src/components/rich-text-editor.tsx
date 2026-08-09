"use client";

import { useRef } from "react";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  ariaLabel?: string;
};

/**
 * A deliberately small Markdown-style editor. It stores plain text plus
 * **bold**, *italic* and line breaks, so existing database columns remain
 * compatible and no raw HTML ever needs to be saved or rendered.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  rows = 5,
  className = "textarea",
  ariaLabel,
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insert = (before: string, after = "", fallback = "texte") => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || fallback;
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    const selectionStart = start + before.length;

    onChange(next);
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(selectionStart, selectionStart + selected.length);
    });
  };

  const insertBreak = (breakValue: string) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const next = `${value.slice(0, start)}${breakValue}${value.slice(end)}`;
    const caret = start + breakValue.length;
    onChange(next);
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(caret, caret);
    });
  };

  return (
    <div className="rich-text-editor">
      <div className="rich-text-editor-toolbar" aria-label="Mise en forme du texte">
        <button type="button" className="pill-button" onClick={() => insert("**", "**", "texte important")} title="Gras">
          <strong>G</strong>
        </button>
        <button type="button" className="pill-button" onClick={() => insert("*", "*", "texte en italique")} title="Italique">
          <em>I</em>
        </button>
        <button type="button" className="pill-button" onClick={() => insertBreak("\n")} title="Retour à la ligne">
          ↵ Ligne
        </button>
        <button type="button" className="pill-button" onClick={() => insertBreak("\n\n")} title="Nouveau paragraphe">
          ¶ Paragraphe
        </button>
        <span className="tiny">Gras, italique et retours à la ligne visibles sur la fiche produit.</span>
      </div>
      <textarea
        ref={textareaRef}
        className={className}
        rows={rows}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
