import { Fragment } from "react";

function inlineText(value: string) {
  return value.split(/(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith("***") && part.endsWith("***")) {
      return <strong key={index}><em>{part.slice(3, -3)}</em></strong>;
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

export function FormattedInlineText({ text }: { text: string | null | undefined }) {
  const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
  return (
    <>
      {lines.map((line, index) => (
        <Fragment key={`${line}-${index}`}>
          {index > 0 ? <br /> : null}
          {inlineText(line)}
        </Fragment>
      ))}
    </>
  );
}

export function FormattedText({ text }: { text: string | null | undefined }) {
  const paragraphs = String(text || "").replace(/\r\n?/g, "\n").split(/\n{2,}/).filter(Boolean);
  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <p className="formatted-text-paragraph" key={`${paragraph}-${index}`}>
          <FormattedInlineText text={paragraph} />
        </p>
      ))}
    </>
  );
}
