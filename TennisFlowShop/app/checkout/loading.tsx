import CheckoutLoadingShell from "@/components/checkout/CheckoutLoadingShell";

const checkoutSectionKeys = [
  "items",
  "delivery",
  "recipient",
  "service",
  "payment",
  "agreements",
] as const;

export default function Loading() {
  return <CheckoutLoadingShell layout="aside" sectionKeys={checkoutSectionKeys} />;
}
