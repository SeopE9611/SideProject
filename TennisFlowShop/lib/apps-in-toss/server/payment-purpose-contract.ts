export type AppsPaymentPurpose = "stringing_service" | "racket_purchase" | "racket_rental";

export function getAppsInTossPaymentPurpose(intent: { paymentPurpose?: AppsPaymentPurpose }): AppsPaymentPurpose {
  return intent.paymentPurpose ?? "stringing_service";
}
