'use client';

import { useState } from 'react';

export type RacketForm = {
  brand: string;
  model: string;
  year: number | null;
  price: number;
  condition: 'A' | 'B' | 'C';
  status: 'available' | 'rented' | 'sold' | 'inactive';
  spec: { weight: number | null; balance: number | null; headSize: number | null; pattern: string; gripSize: string };
  rental: { enabled: boolean; deposit: number; fee: { d7: number; d15: number; d30: number } };
  images: string[]; // Supabase 업로드로 교체 예정
};

type Props = {
  initial?: Partial<RacketForm>;
  submitLabel: string;
  onSubmit: (data: RacketForm) => Promise<void>;
};

export default function AdminRacketForm({ initial, submitLabel, onSubmit }: Props) {
  const [form, setForm] = useState<RacketForm>({
    brand: initial?.brand ?? '',
    model: initial?.model ?? '',
    year: initial?.year ?? null,
    price: initial?.price ?? 0,
    condition: (initial?.condition as any) ?? 'B',
    status: (initial?.status as any) ?? 'available',
    spec: {
      weight: initial?.spec?.weight ?? null,
      balance: initial?.spec?.balance ?? null,
      headSize: initial?.spec?.headSize ?? null,
      pattern: initial?.spec?.pattern ?? '',
      gripSize: initial?.spec?.gripSize ?? '',
    },
    rental: {
      enabled: initial?.rental?.enabled ?? false,
      deposit: initial?.rental?.deposit ?? 0,
      fee: {
        d7: initial?.rental?.fee?.d7 ?? 0,
        d15: initial?.rental?.fee?.d15 ?? 0,
        d30: initial?.rental?.fee?.d30 ?? 0,
      },
    },
    images: Array.isArray(initial?.images) ? initial!.images! : [],
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    // 숫자 필드 캐스팅 안전하게 한 번 더 (사용자 입력이 문자열일 수 있으므로)
    const normalized: RacketForm = {
      ...form,
      year: form.year ? Number(form.year) : null,
      price: Number(form.price || 0),
      spec: {
        weight: form.spec.weight ? Number(form.spec.weight) : null,
        balance: form.spec.balance ? Number(form.spec.balance) : null,
        headSize: form.spec.headSize ? Number(form.spec.headSize) : null,
        pattern: form.spec.pattern,
        gripSize: form.spec.gripSize,
      },
      rental: {
        enabled: !!form.rental.enabled,
        deposit: Number(form.rental.deposit || 0),
        fee: {
          d7: Number(form.rental.fee.d7 || 0),
          d15: Number(form.rental.fee.d15 || 0),
          d30: Number(form.rental.fee.d30 || 0),
        },
      },
      images: form.images || [],
    };
    await onSubmit(normalized);
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* 기본 정보 */}
      <div className="grid grid-cols-2 gap-3">
        <input className="border rounded h-10 px-3" placeholder="브랜드" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
        <input className="border rounded h-10 px-3" placeholder="모델" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
        <input className="border rounded h-10 px-3" placeholder="연식(숫자)" value={form.year ?? ''} onChange={(e) => setForm({ ...form, year: e.target.value ? Number(e.target.value) : null })} />
        <input className="border rounded h-10 px-3" placeholder="가격(원)" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value || 0) })} />
        <select className="border rounded h-10 px-3" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value as any })}>
          <option value="A">A(최상)</option>
          <option value="B">B(양호)</option>
          <option value="C">C(보통)</option>
        </select>
        <select className="border rounded h-10 px-3" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
          <option value="available">판매가능</option>
          <option value="rented">대여중</option>
          <option value="sold">판매완료</option>
          <option value="inactive">비노출</option>
        </select>
      </div>

      {/* 스펙 */}
      <div className="grid grid-cols-2 gap-3">
        <input className="border rounded h-10 px-3" placeholder="무게(g)" value={form.spec.weight ?? ''} onChange={(e) => setForm({ ...form, spec: { ...form.spec, weight: e.target.value ? Number(e.target.value) : null } })} />
        <input className="border rounded h-10 px-3" placeholder="밸런스(mm)" value={form.spec.balance ?? ''} onChange={(e) => setForm({ ...form, spec: { ...form.spec, balance: e.target.value ? Number(e.target.value) : null } })} />
        <input className="border rounded h-10 px-3" placeholder="헤드사이즈(in²)" value={form.spec.headSize ?? ''} onChange={(e) => setForm({ ...form, spec: { ...form.spec, headSize: e.target.value ? Number(e.target.value) : null } })} />
        <input className="border rounded h-10 px-3" placeholder="패턴(예: 16x19)" value={form.spec.pattern} onChange={(e) => setForm({ ...form, spec: { ...form.spec, pattern: e.target.value } })} />
        <input className="border rounded h-10 px-3" placeholder="그립(G2 등)" value={form.spec.gripSize} onChange={(e) => setForm({ ...form, spec: { ...form.spec, gripSize: e.target.value } })} />
      </div>

      {/* 대여 설정 */}
      <div className="space-y-2">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={form.rental.enabled} onChange={(e) => setForm({ ...form, rental: { ...form.rental, enabled: e.target.checked } })} />
          대여 가능
        </label>
        <div className="grid grid-cols-4 gap-3">
          <input className="border rounded h-10 px-3" placeholder="보증금" value={form.rental.deposit} onChange={(e) => setForm({ ...form, rental: { ...form.rental, deposit: Number(e.target.value || 0) } })} />
          <input className="border rounded h-10 px-3" placeholder="7일 수수료" value={form.rental.fee.d7} onChange={(e) => setForm({ ...form, rental: { ...form.rental, fee: { ...form.rental.fee, d7: Number(e.target.value || 0) } } })} />
          <input className="border rounded h-10 px-3" placeholder="15일 수수료" value={form.rental.fee.d15} onChange={(e) => setForm({ ...form, rental: { ...form.rental, fee: { ...form.rental.fee, d15: Number(e.target.value || 0) } } })} />
          <input className="border rounded h-10 px-3" placeholder="30일 수수료" value={form.rental.fee.d30} onChange={(e) => setForm({ ...form, rental: { ...form.rental, fee: { ...form.rental.fee, d30: Number(e.target.value || 0) } } })} />
        </div>
      </div>

      {/* 이미지 URL (임시)- 업로더로 교체예정 */}
      <div className="space-y-2">
        <div className="text-sm text-gray-600">이미지 URL(줄바꿈으로 여러 개)</div>
        <textarea
          className="w-full border rounded p-2 h-24"
          value={(form.images ?? []).join('\n')}
          onChange={(e) =>
            setForm({
              ...form,
              images: e.target.value
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="https://.../img1.jpg\nhttps://.../img2.jpg"
        />
      </div>

      <div className="flex justify-end">
        <button onClick={handleSubmit} disabled={loading} className="h-10 px-5 rounded bg-emerald-600 text-white disabled:opacity-50">
          {loading ? '저장 중…' : submitLabel}
        </button>
      </div>
    </div>
  );
}
