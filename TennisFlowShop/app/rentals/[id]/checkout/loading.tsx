import CheckoutLoadingShell from "@/components/checkout/CheckoutLoadingShell";

const rentalCheckoutSectionKeys = [
  "racket",
  "delivery",
  "shipping",
  "payment",
  "refund",
  "agreements",
] as const;

export default function Loading() {
  return <CheckoutLoadingShell layout="aside" sectionKeys={rentalCheckoutSectionKeys} />;
}
