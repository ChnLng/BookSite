import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type { ProductKind } from "@/lib/product-documents";

export type ProductDocumentGrantMode = "download" | "view";

function grantLifetimeSeconds(mode: ProductDocumentGrantMode) {
  return mode === "view" ? 4 * 60 * 60 : 5 * 60;
}

export function productDocumentGrantCookieName(documentId: string, mode: ProductDocumentGrantMode) {
  return `pdg_${documentId.replace(/[^a-zA-Z0-9_-]/g, "")}_${mode}`;
}

function signingSecret() {
  const secret = process.env.PRODUCT_DOWNLOAD_SIGNING_SECRET
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.GITHUB_TOKEN;
  if (!secret) throw new Error("Secret de signature des téléchargements manquant.");
  return secret;
}

function grantPayload(input: {
  productKind: ProductKind;
  productId: string;
  documentId: string;
  mode: ProductDocumentGrantMode;
  userId: string;
  expiresAt: number;
}) {
  return [
    "v1",
    input.productKind,
    input.productId,
    input.documentId,
    input.mode,
    input.userId,
    String(input.expiresAt),
  ].join(":");
}

function signPayload(payload: string) {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

export function createProductDocumentGrant(input: {
  productKind: ProductKind;
  productId: string;
  documentId: string;
  mode: ProductDocumentGrantMode;
  userId: string;
}) {
  const expiresAt = Math.floor(Date.now() / 1000) + grantLifetimeSeconds(input.mode);
  const payload = grantPayload({ ...input, expiresAt });
  return { expiresAt, signature: signPayload(payload) };
}

export function verifyProductDocumentGrant(input: {
  productKind: ProductKind;
  productId: string;
  documentId: string;
  mode: ProductDocumentGrantMode;
  userId: string;
  expiresAt: number;
  signature: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  if (
    !Number.isSafeInteger(input.expiresAt)
    || input.expiresAt < now
    || input.expiresAt > now + grantLifetimeSeconds(input.mode) + 30
  ) {
    return false;
  }
  if (!input.userId || !input.signature) return false;
  const expected = Buffer.from(signPayload(grantPayload(input)));
  const received = Buffer.from(input.signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
