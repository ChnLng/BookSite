const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isWatermarkableImageUpload(file: File) {
  return imageTypes.has(file.type.toLowerCase());
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image impossible à préparer pour le filigrane."));
    image.src = source;
  });
}

export async function addVisdArImageWatermark(file: File) {
  if (!isWatermarkableImageUpload(file)) return file;
  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(sourceUrl);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas indisponible pour le filigrane.");

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const fontSize = Math.max(13, Math.round(Math.min(canvas.width, canvas.height) * 0.028));
    const inset = Math.max(14, Math.round(fontSize * 1.45));
    context.save();
    context.globalAlpha = 0.28;
    context.fillStyle = "#526a84";
    context.shadowColor = "rgba(255,255,255,0.86)";
    context.shadowBlur = Math.max(2, Math.round(fontSize * 0.26));
    context.font = `600 ${fontSize}px sans-serif`;
    context.textBaseline = "middle";
    context.translate(inset, canvas.height / 2);
    context.rotate(-Math.PI / 2);
    context.fillText("Auteur · Visd AR", 0, 0);
    context.restore();

    context.save();
    context.globalAlpha = 0.28;
    context.fillStyle = "#526a84";
    context.shadowColor = "rgba(255,255,255,0.86)";
    context.shadowBlur = Math.max(2, Math.round(fontSize * 0.26));
    context.font = `600 ${fontSize}px sans-serif`;
    context.textBaseline = "middle";
    context.translate(canvas.width - inset, canvas.height / 2);
    context.rotate(Math.PI / 2);
    context.fillText("Auteur · Visd AR", 0, 0);
    context.restore();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type, 0.95));
    if (!blob) throw new Error("Création du filigrane image impossible.");
    return new File([blob], file.name, { type: file.type, lastModified: file.lastModified });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
