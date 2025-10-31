'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminRacketNewClient() {
  const r = useRouter();
  const [form, setForm] = useState({
    brand:'', model:'', year:'', price:'', condition:'B',
    spec: { weight:'', balance:'', headSize:'', pattern:'', gripSize:'' },
    status:'available',
    rental: { enabled:false, deposit:'', fee:{ d7:'', d15:'', d30:'' } },
    images: [] as string[],
  });
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/rackets', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({
        ...form,
        year: Number(form.year||0)||null,
        price: Number(form.price||0)||0,
        spec: {
          weight: Number(form.spec.weight||0)||null,
          balance: Number(form.spec.balance||0)||null,
          headSize: Number(form.spec.headSize||0)||null,
          pattern: form.spec.pattern, gripSize: form.spec.gripSize,
        },
        rental: {
          enabled: form.rental.enabled,
          deposit: Number(form.rental.deposit||0)||0,
          fee: {
            d7: Number(form.rental.fee.d7||0)||0,
            d15: Number(form.rental.fee.d15||0)||0,
            d30: Number(form.rental.fee.d30||0)||0,
          }
        },
      }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) { alert(json?.message ?? '등록 실패'); return; }
    r.push('/admin/rackets');
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-semibold">새 라켓 등록</h1>
      {/* 여기선 핵심 입력만 배치 — 이후 이미지 업로드/디자인 정리 */}
      <div className="grid grid-cols-2 gap-3">
        <input placeholder="브랜드" value={form.brand} onChange={e=>setForm({...form, brand:e.target.value})} className="border rounded px-3 h-10" />
        <input placeholder="모델" value={form.model} onChange={e=>setForm({...form, model:e.target.value})} className="border rounded px-3 h-10" />
        <input placeholder="연식" value={form.year} onChange={e=>setForm({...form, year:e.target.value})} className="border rounded px-3 h-10" />
        <input placeholder="가격" value={form.price} onChange={e=>setForm({...form, price:e.target.value})} className="border rounded px-3 h-10" />
        <select value={form.condition} onChange={e=>setForm({...form, condition:e.target.value as any})} className="border rounded px-3 h-10">
          <option value="A">A(최상)</option><option value="B">B(양호)</option><option value="C">C(보통)</option>
        </select>
        <select value={form.status} onChange={e=>setForm({...form, status:e.target.value as any})} className="border rounded px-3 h-10">
          <option value="available">판매가능</option><option value="rented">대여중</option><option value="sold">판매완료</option><option value="inactive">비노출</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input placeholder="무게(g)" value={form.spec.weight} onChange={e=>setForm({...form, spec:{...form.spec, weight:e.target.value}})} className="border rounded px-3 h-10" />
        <input placeholder="밸런스(mm)" value={form.spec.balance} onChange={e=>setForm({...form, spec:{...form.spec, balance:e.target.value}})} className="border rounded px-3 h-10" />
        <input placeholder="헤드사이즈(in²)" value={form.spec.headSize} onChange={e=>setForm({...form, spec:{...form.spec, headSize:e.target.value}})} className="border rounded px-3 h-10" />
        <input placeholder="패턴(예: 16x19)" value={form.spec.pattern} onChange={e=>setForm({...form, spec:{...form.spec, pattern:e.target.value}})} className="border rounded px-3 h-10" />
        <input placeholder="그립(G2 등)" value={form.spec.gripSize} onChange={e=>setForm({...form, spec:{...form.spec, gripSize:e.target.value}})} className="border rounded px-3 h-10" />
      </div>

      <div className="space-y-2">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={form.rental.enabled} onChange={e=>setForm({...form, rental:{...form.rental, enabled:e.target.checked}})} />
          대여 가능
        </label>
        <div className="grid grid-cols-4 gap-3">
          <input placeholder="보증금" value={form.rental.deposit} onChange={e=>setForm({...form, rental:{...form.rental, deposit:e.target.value}})} className="border rounded px-3 h-10" />
          <input placeholder="7일 수수료" value={form.rental.fee.d7} onChange={e=>setForm({...form, rental:{...form.rental, fee:{...form.rental.fee, d7:e.target.value}}})} className="border rounded px-3 h-10" />
          <input placeholder="15일 수수료" value={form.rental.fee.d15} onChange={e=>setForm({...form, rental:{...form.rental, fee:{...form.rental.fee, d15:e.target.value}}})} className="border rounded px-3 h-10" />
          <input placeholder="30일 수수료" value={form.rental.fee.d30} onChange={e=>setForm({...form, rental:{...form.rental, fee:{...form.rental.fee, d30:e.target.value}}})} className="border rounded px-3 h-10" />
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={onSubmit} disabled={loading} className="h-10 px-5 rounded bg-emerald-600 text-white">{loading?'등록 중…':'등록'}</button>
      </div>
    </div>
  );
}
