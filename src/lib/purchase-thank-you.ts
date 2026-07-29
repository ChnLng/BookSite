export const purchaseThankYouMessages = [
  "🌸 Oh, très bon choix ! Paiement réussi.",
  "Très bon choix. Passez une excellente journée. ☕",
] as const;

export function randomPurchaseThankYouMessage() {
  return purchaseThankYouMessages[Math.floor(Math.random() * purchaseThankYouMessages.length)];
}
