'use client';

import { useCallback, useMemo, useState } from 'react';

export type CollectionMethod = 'self_ship' | 'courier_pickup' | 'visit';

export type ApplicationLine = {
  id: string;
  racketType: string;
  stringProductId: string;
  stringName: string;
  tensionMain: string;
  tensionCross: string;
  note: string;
  mountingFee: number;
};

export interface ApplyFormData {
  name: string;
  email: string;
  phone: string;
  racketType: string;
  stringTypes: string[];
  customStringType: string;
  stringUseCounts: Record<string, number>;
  preferredDate: string;
  preferredTime: string;
  requirements: string;
  shippingName: string;
  shippingPhone: string;
  shippingEmail: string;
  shippingAddress: string;
  shippingAddressDetail: string;
  shippingPostcode: string;
  shippingDepositor: string;
  shippingRequest: string;
  shippingBank: string;
  packageOptOut: boolean;
  collectionMethod: CollectionMethod;
  pickupDate: string;
  pickupTime: string;
  pickupNote: string;
  lines: ApplicationLine[];
  pdpMountingFee?: number;
  defaultMainTension?: string;
  defaultCrossTension?: string;
}

type UseStringingApplySharedStateParams = {
  fromPDP: boolean;
  orderId: string | null | undefined;
  rentalId: string | null | undefined;
  order: any;
  pdpProductId: string | null | undefined;
  pdpProduct: { name?: string | null } | null;
  pdpMountingFee: number;
  lockedStringStock?: number | null;
  lockedRacketQuantity?: number | null;
  isRentalBased: boolean;
};

const normalizePhone = (s: string) => (s || '').replace(/[^0-9]/g, '');

const formatPhoneForDisplay = (raw: string) => {
  const digits = normalizePhone(raw).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
};

const parseTimeToMinutes = (time: string | null | undefined) => {
  if (!time || typeof time !== 'string') return null;
  const [h, m] = time.split(':').map((v) => Number(v));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
};

const formatMinutesToTime = (minutes: number) => {
  if (!Number.isFinite(minutes)) return '';
  const total = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${pad(h)}:${pad(m)}`;
};

export default function useStringingApplySharedState({ fromPDP, orderId, rentalId, order, pdpProductId, pdpProduct, pdpMountingFee, lockedStringStock, lockedRacketQuantity, isRentalBased }: UseStringingApplySharedStateParams) {
  const [formData, setFormData] = useState<ApplyFormData>({
    name: '',
    email: '',
    phone: '',
    racketType: '',
    stringTypes: [] as string[],
    customStringType: '',
    stringUseCounts: {},
    preferredDate: '',
    preferredTime: '',
    requirements: '',
    shippingName: '',
    shippingPhone: '',
    shippingEmail: '',
    shippingAddress: '',
    shippingAddressDetail: '',
    shippingPostcode: '',
    shippingDepositor: '',
    shippingRequest: '',
    shippingBank: '',
    packageOptOut: false,
    collectionMethod: 'self_ship',
    pickupDate: '',
    pickupTime: '',
    pickupNote: '',
    lines: [],
  });

  const [visitDurationMinutesUi, setVisitDurationMinutesUi] = useState<number | null>(null);

  const orderRemainingSlots = typeof (order as any)?.stringService?.remainingSlots === 'number' ? (order as any).stringService.remainingSlots : undefined;

  const isCombinedPdpMode = useMemo(() => {
    if (!orderId || !order) return false;
    const items = (order as any)?.items;
    if (!Array.isArray(items)) return false;
    const hasRacket = items.some((it: any) => it?.kind === 'racket' || it?.kind === 'used_racket');
    const hasMountableString = items.some((it: any) => it?.kind === 'product' && Number(it?.mountingFee ?? 0) > 0);
    return hasRacket && hasMountableString;
  }, [orderId, order]);

  const maxNonOrderQty = useMemo(() => {
    if (orderId && order) return null;

    const candidates: number[] = [];
    if (typeof lockedStringStock === 'number' && lockedStringStock > 0) candidates.push(lockedStringStock);
    if (isRentalBased && typeof lockedRacketQuantity === 'number' && lockedRacketQuantity > 0) candidates.push(lockedRacketQuantity);

    if (!candidates.length) return null;
    return Math.max(1, Math.min(...candidates));
  }, [orderId, order, lockedStringStock, lockedRacketQuantity, isRentalBased]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name } = e.target;
    const rawValue = e.target.value;
    const value = name === 'phone' || name === 'shippingPhone' ? formatPhoneForDisplay(rawValue) : rawValue;

    setFormData((prev) => {
      const next: any = { ...prev, [name]: value };

      if (name === 'name') next.shippingName = value;
      if (name === 'email') next.shippingEmail = value;
      if (name === 'phone') next.shippingPhone = value;

      return next;
    });
  }, []);

  const handleStringTypesChange = useCallback(
    (ids: string[]) => {
      if (fromPDP && !orderId && !rentalId) return;

      setFormData((prev) => {
        const nextUseCounts: Record<string, number> = { ...prev.stringUseCounts };

        const selectedSet = new Set(ids);
        Object.keys(nextUseCounts).forEach((key) => {
          if (!selectedSet.has(key)) {
            delete nextUseCounts[key];
          }
        });

        if (orderId && order) {
          let remaining: number | undefined = typeof orderRemainingSlots === 'number' ? orderRemainingSlots : undefined;

          ids.forEach((id) => {
            if (id === 'custom') {
              if (nextUseCounts[id] == null) {
                const base = remaining != null ? Math.min(1, Math.max(remaining, 0)) : 1;
                nextUseCounts[id] = base;
                if (remaining != null) remaining -= base;
              }
              return;
            }

            const item = order.items.find((it: any) => it.id === id);
            const orderQty = item?.quantity ?? 1;
            const current = nextUseCounts[id];

            if (current == null || current > orderQty) {
              let base = orderQty;

              if (remaining != null) {
                const allowedForThis = Math.min(orderQty, Math.max(remaining, 0));
                base = allowedForThis;
                remaining -= allowedForThis;
              }

              nextUseCounts[id] = base;
            }
          });

          ids.forEach((id) => {
            const v = nextUseCounts[id];
            if (typeof v !== 'number' || v <= 0) nextUseCounts[id] = 1;
          });
        } else {
          ids.forEach((id) => {
            if (nextUseCounts[id] == null) {
              nextUseCounts[id] = 1;
            }
          });
        }

        return {
          ...prev,
          stringTypes: ids,
          stringUseCounts: nextUseCounts,
        };
      });
    },
    [fromPDP, orderId, rentalId, order, orderRemainingSlots],
  );

  const handleCustomInputChange = useCallback((val: string) => {
    setFormData((prev) => ({ ...prev, customStringType: val }));
  }, []);

  const getFallbackBaseMountingFee = useCallback(
    (data: ApplyFormData): number => {
      if (data.stringTypes.includes('custom')) {
        return 15000;
      }

      if (data.stringTypes.length > 0) {
        const firstId = data.stringTypes[0];

        if (orderId && order && firstId) {
          const selected = order.items.find((it: any) => it.id === firstId);
          if (selected?.mountingFee != null) {
            return selected.mountingFee;
          }
        }

        if (Number.isFinite(data.pdpMountingFee as number)) {
          return Number(data.pdpMountingFee);
        }

        return 35000;
      }

      return 0;
    },
    [orderId, order],
  );

  const linesForSubmit = useMemo<ApplicationLine[]>(() => {
    if (Array.isArray(formData.lines) && formData.lines.length > 0) {
      return formData.lines;
    }

    const stringIds = (formData.stringTypes || []).filter(Boolean);
    if (!stringIds.length) {
      return [];
    }

    const baseFee = getFallbackBaseMountingFee(formData);
    const isOrderMode = !!orderId && !!order;

    const getStringName = (prodId: string): string => {
      if (isOrderMode && order) {
        const found = order.items.find((it: any) => it.id === prodId);
        if (found?.name) return found.name;
      }
      if (prodId === pdpProductId && pdpProduct?.name) {
        return pdpProduct.name;
      }
      if (prodId === 'custom') {
        return formData.customStringType || '커스텀 스트링';
      }
      return '선택한 스트링';
    };

    const getMountingFee = (prodId: string): number => {
      if (prodId === 'custom') {
        return 15000;
      }

      if (isOrderMode && order) {
        const found = order.items.find((it: any) => it.id === prodId);
        if (found?.mountingFee != null) {
          return found.mountingFee;
        }
      }

      if (prodId === pdpProductId && Number.isFinite(pdpMountingFee)) {
        return pdpMountingFee;
      }

      return baseFee || 35000;
    };

    const lines: ApplicationLine[] = [];

    let racketNameFromOrder: string | undefined;
    if (isOrderMode && order) {
      const items = (order as any)?.items;
      if (Array.isArray(items)) {
        const racketItems = items.filter((it: any) => it?.kind === 'racket' || it?.kind === 'used_racket');
        if (racketItems.length === 1) {
          const r = racketItems[0] as any;
          racketNameFromOrder = (r.name ?? r.productName ?? '').trim() || undefined;
        }
      }
    }

    stringIds.forEach((prodId, index) => {
      const stringName = getStringName(prodId);
      const lineFee = getMountingFee(prodId);

      if (prodId === 'custom') {
        const useQtyRaw = formData.stringUseCounts.custom;
        const useQty = typeof useQtyRaw === 'number' ? useQtyRaw : 1;

        for (let i = 0; i < Math.max(useQty, 0); i++) {
          lines.push({
            id: `custom-${index}-${i}`,
            racketType: '',
            stringProductId: prodId,
            stringName,
            tensionMain: '',
            tensionCross: '',
            note: formData.requirements,
            mountingFee: lineFee,
          });
        }

        return;
      }

      if (isOrderMode && order) {
        const found = order.items.find((it: any) => it.id === prodId);
        const orderQty = found?.quantity ?? 1;
        const useQty = formData.stringUseCounts[prodId] ?? orderQty;

        for (let i = 0; i < useQty; i++) {
          const alias = (formData.racketType || '').trim() || racketNameFromOrder || `라켓 ${lines.length + 1}`;

          lines.push({
            id: `${prodId}-${i}`,
            racketType: alias,
            stringProductId: prodId,
            stringName,
            tensionMain: '',
            tensionCross: '',
            note: formData.requirements,
            mountingFee: lineFee,
          });
        }
        return;
      }

      const useQty = formData.stringUseCounts[prodId] ?? 1;

      for (let i = 0; i < useQty; i++) {
        const alias = (formData.racketType || '').trim() || `라켓 ${lines.length + 1}`;

        lines.push({
          id: `${prodId}-${i}`,
          racketType: alias,
          stringProductId: prodId,
          stringName,
          tensionMain: '',
          tensionCross: '',
          note: formData.requirements,
          mountingFee: lineFee,
        });
      }
    });
    return lines;
  }, [formData, getFallbackBaseMountingFee, order, orderId, pdpProductId, pdpProduct, pdpMountingFee]);

  const lineCount = linesForSubmit.length || (formData.stringTypes.length ? 1 : 0);

  const handleLineFieldChange = useCallback(
    <K extends keyof ApplicationLine>(index: number, field: K, value: ApplicationLine[K]) => {
      setFormData((prev) => {
        const baseLines = Array.isArray(prev.lines) && prev.lines.length > 0 ? prev.lines : (linesForSubmit ?? []);

        const nextLines = baseLines.map((line, i) => (i === index ? { ...line, [field]: value } : line));

        const next: ApplyFormData = { ...prev, lines: nextLines };
        if (index === 0 && field === 'tensionMain') {
          next.defaultMainTension = String(value ?? '');
        }
        if (index === 0 && field === 'tensionCross') {
          next.defaultCrossTension = String(value ?? '');
        }
        return next;
      });
    },
    [linesForSubmit],
  );

  const handleUseQtyChange = useCallback(
    (id: string, value: number) => {
      if (orderId && order && isCombinedPdpMode) {
        if (typeof orderRemainingSlots !== 'number') return;

        const ids = (formData.stringTypes ?? []).filter((t) => t && t !== 'custom');
        const sumOrderQty = ids.reduce((sum, sid) => {
          const found = order.items.find((it: any) => it.id === sid);
          const q = Number((found as any)?.quantity ?? 0);
          return sum + (Number.isFinite(q) ? q : 0);
        }, 0);

        if (!Number.isFinite(sumOrderQty) || sumOrderQty <= 0) return;
        if (orderRemainingSlots === sumOrderQty) return;
      }

      const raw = Number.isFinite(value) ? value : 0;
      const min = 0;
      let max: number;

      if (orderId && order) {
        if (id === 'custom') {
          max = 99;
        } else {
          const item = order.items.find((it: any) => it.id === id);
          max = item?.quantity ?? 1;
        }

        if (typeof orderRemainingSlots === 'number') {
          const otherTotal = Object.entries(formData.stringUseCounts)
            .filter(([key]) => key !== id)
            .reduce((sum, [, v]) => sum + (typeof v === 'number' ? v : 0), 0);
          const remainForThis = Math.max(orderRemainingSlots - otherTotal, 0);
          max = Math.min(max, remainForThis);
        }
      } else {
        if (id === 'custom') {
          max = 99;
        } else {
          max = typeof maxNonOrderQty === 'number' ? maxNonOrderQty : 99;
        }
      }

      const safe = Math.min(Math.max(raw, min), max);

      setFormData((prev) => {
        if (safe <= 0) {
          const nextTypes = prev.stringTypes.filter((t) => t !== id);
          const { [id]: _removed, ...restCounts } = prev.stringUseCounts;
          return {
            ...prev,
            stringTypes: nextTypes,
            stringUseCounts: restCounts,
          };
        }

        return {
          ...prev,
          stringUseCounts: {
            ...prev.stringUseCounts,
            [id]: safe,
          },
        };
      });
    },
    [formData.stringTypes, formData.stringUseCounts, isCombinedPdpMode, maxNonOrderQty, order, orderId, orderRemainingSlots],
  );

  const visitTimeRange = useMemo(() => {
    if (!formData.preferredTime || !visitDurationMinutesUi) return null;
    const startMin = parseTimeToMinutes(formData.preferredTime);
    if (startMin == null) return null;

    return {
      start: formData.preferredTime,
      end: formatMinutesToTime(startMin + visitDurationMinutesUi),
    };
  }, [formData.preferredTime, visitDurationMinutesUi]);

  return {
    formData,
    setFormData,
    handleInputChange,
    handleStringTypesChange,
    handleCustomInputChange,
    handleUseQtyChange,
    handleLineFieldChange,
    linesForSubmit,
    lineCount,
    visitTimeRange,
    setVisitDurationMinutesUi,
    maxNonOrderQty,
  };
}
