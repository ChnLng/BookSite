export const purchaseThankYouMessages = [
  "🌸  Oh, trės bon choix ! Paiement réussi.",
  "Trės bon choix. Passez une excellente journée. ☕",
] as const;

export function randomPurchaseThankYouMessage() {
  return purchaseThankYouMessages[Math.floor(Math.random() * purchaseThankYouMessages.length)];
}
