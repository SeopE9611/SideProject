/**
 * @param {{
 *  accessSub?: string | null,
 *  orderId: string,
 *  stringingApplicationId?: string | null,
 * }} params
 */
export function buildCheckoutSuccessLinks({ accessSub, orderId, stringingApplicationId }) {
  const isLoggedIn = Boolean(accessSub);
  const normalizedApplicationId =
    typeof stringingApplicationId === 'string' && stringingApplicationId.trim() ? stringingApplicationId.trim() : null;

  return {
    isLoggedIn,
    orderDetailHref: isLoggedIn ? '/mypage' : `/order-lookup/details/${orderId}`,
    stringingApplicationHref:
      isLoggedIn && normalizedApplicationId
        ? `/mypage?tab=applications&applicationId=${encodeURIComponent(normalizedApplicationId)}`
        : null,
  };
}
