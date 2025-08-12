'use client';
import useSWR, { mutate as globalMutate } from 'swr';

export type WishlistItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  stock: number;
  createdAt: string;
};

const KEY = '/api/wishlist';

export function useWishlist() {
  const { data, isLoading, isValidating, mutate, error } = useSWR<{ items: WishlistItem[]; total: number }>(
    KEY,
    async (url) => {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('failed');
      return res.json();
    },
    { keepPreviousData: true, revalidateOnFocus: false }
  );

  const ids = new Set((data?.items ?? []).map((i) => i.id));
  const has = (productId: string) => ids.has(productId);

  async function add(productId: string) {
    const res = await fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ productId }),
    });
    if (res.status === 401) throw new Error('unauthorized');
    if (!res.ok && res.status !== 409) throw new Error('add failed');
    await mutate();
  }

  async function remove(productId: string) {
    const res = await fetch(`/api/wishlist/${productId}`, { method: 'DELETE', credentials: 'include' });
    if (res.status === 401) throw new Error('unauthorized');
    if (!res.ok) throw new Error('remove failed');
    await mutate();
  }

  async function toggle(productId: string) {
    if (has(productId)) await remove(productId);
    else await add(productId);
  }

  async function clear() {
    const res = await fetch('/api/wishlist', { method: 'DELETE', credentials: 'include' });
    if (res.status === 401) throw new Error('unauthorized');
    if (!res.ok) throw new Error('clear failed');
    await mutate();
  }

  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    has,
    add,
    remove,
    toggle,
    isLoading,
    isValidating,
    error,
    clear,
    mutateAll: () => globalMutate(KEY),
  };
}
