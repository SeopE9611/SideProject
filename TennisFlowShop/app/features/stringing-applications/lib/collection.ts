export const COLLECTION_METHODS = ['self_ship','courier_pickup','visit'] as const;
export type CollectionMethod = typeof COLLECTION_METHODS[number];

// 문자열·옛 포맷을 표준값으로 변환
export const normalizeCollection = (v: any): CollectionMethod => {
  const s = String(v || '').toLowerCase();
  if (['self_send','self-ship','self_ship'].includes(s)) return 'self_ship';
  if (['courier_pickup','courier-pickup','courier','pickup'].includes(s)) return 'courier_pickup';
  if (['visit','방문','매장'].includes(s)) return 'visit';
  return 'self_ship';
};
