"use client";
import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { adminMutator } from "@/lib/admin/adminFetcher";
import type { OfflineCustomerDto } from "@/types/admin/offline";

type SelectedCustomer =
  | { source: "offline"; offlineCustomerId: string; userId?: string | null; name: string; phone: string; email?: string | null }
  | { source: "online"; userId: string; name: string; phone: string; email?: string | null; offlineCustomerId?: string | null };

const kindLabels = { stringing: "스트링 작업", package_sale: "패키지 판매", etc: "기타" } as const;
const statusLabels = { received: "접수", in_progress: "작업중", completed: "완료", picked_up: "수령완료", canceled: "취소" } as const;
const paymentStatusLabels = { pending: "미결제", paid: "결제완료", refunded: "환불" } as const;
const paymentMethodLabels = { cash: "현금", card: "카드", bank_transfer: "계좌이체", etc: "기타" } as const;

export default function OfflineAdminClient() {
  const [query, setQuery] = useState({ name: "", phone: "", email: "" });
  const [submittedQuery, setSubmittedQuery] = useState<{ name: string; phone: string; email: string } | null>(null);
  const [selected, setSelected] = useState<SelectedCustomer | null>(null);
  const [form, setForm] = useState({ kind: "stringing", status: "received", racketName: "", stringName: "", tensionMain: "", tensionCross: "", memo: "", amount: 0, method: "cash", payStatus: "pending" });
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", email: "", memo: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const key = submittedQuery
    ? `/api/admin/offline/lookup?name=${encodeURIComponent(submittedQuery.name)}&phone=${encodeURIComponent(submittedQuery.phone)}&email=${encodeURIComponent(submittedQuery.email)}`
    : null;
  const { data, mutate } = useSWR<{ onlineUsers: any[]; offlineCustomers: any[] }>(key, authenticatedSWRFetcher);
  const { data: records, mutate: mutateRecords } = useSWR<{ items: any[] }>("/api/admin/offline/records", authenticatedSWRFetcher);

  async function selectOfflineCustomer(id: string) {
    const res = await authenticatedSWRFetcher(`/api/admin/offline/customers/${id}`) as { item: OfflineCustomerDto };
    setSelected({ source: "offline", offlineCustomerId: res.item.id, userId: res.item.linkedUserId ?? null, name: res.item.name, phone: res.item.phone, email: res.item.email ?? null });
  }

  return <div className="space-y-4">
    <Card><CardHeader><CardTitle>고객 검색/선택</CardTitle></CardHeader><CardContent className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2"><Input placeholder="이름" value={query.name} onChange={(e)=>setQuery({...query,name:e.target.value})}/><Input placeholder="휴대폰 번호" value={query.phone} onChange={(e)=>setQuery({...query,phone:e.target.value})}/><Input placeholder="이메일" value={query.email} onChange={(e)=>setQuery({...query,email:e.target.value})}/><Button onClick={()=>{if(!query.name.trim()&&!query.phone.trim()&&!query.email.trim())return;setSubmittedQuery({...query});}}>검색</Button></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><p className="font-medium">온라인 회원 결과</p>{(data?.onlineUsers||[]).map((u:any)=><div key={u.id} className="flex justify-between py-1 text-sm"><span>{u.name} / {u.phone}</span><Button size="sm" variant="outline" onClick={()=>setSelected({source:"online",name:u.name,phone:u.phone,email:u.email,userId:u.id,offlineCustomerId:u.offlineCustomerId??null})}>선택</Button></div>)}</div><div><p className="font-medium">오프라인 명부 결과</p>{(data?.offlineCustomers||[]).map((c:any)=><div key={c.id} className="flex justify-between py-1 text-sm"><span>{c.name} / {c.phoneMasked}</span><Button size="sm" variant="outline" onClick={()=>selectOfflineCustomer(c.id)}>선택</Button></div>)}</div></div>
    </CardContent></Card>

    <Card><CardHeader><CardTitle>신규 오프라인 고객 등록</CardTitle></CardHeader><CardContent className="space-y-2"><div className="grid grid-cols-1 md:grid-cols-2 gap-2"><Input placeholder="이름" value={newCustomer.name} onChange={(e)=>setNewCustomer({...newCustomer,name:e.target.value})}/><Input placeholder="휴대폰 번호" value={newCustomer.phone} onChange={(e)=>setNewCustomer({...newCustomer,phone:e.target.value})}/><Input placeholder="이메일(선택)" value={newCustomer.email} onChange={(e)=>setNewCustomer({...newCustomer,email:e.target.value})}/><Input placeholder="메모(선택)" value={newCustomer.memo} onChange={(e)=>setNewCustomer({...newCustomer,memo:e.target.value})}/></div><Button variant="secondary" onClick={async()=>{try{const res = await adminMutator("/api/admin/offline/customers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:newCustomer.name,phone:newCustomer.phone,email:newCustomer.email||null,memo:newCustomer.memo||""})}) as { item: OfflineCustomerDto };const item:OfflineCustomerDto=res.item;setSelected({source:"offline",offlineCustomerId:item.id,userId:item.linkedUserId??null,name:item.name,phone:item.phone,email:item.email??null});setNewCustomer({name:"",phone:"",email:"",memo:""});if(submittedQuery)mutate();}catch(e:any){alert(e?.message?.includes("duplicate")?"중복 고객입니다.":"고객 등록 실패");}}}>등록</Button></CardContent></Card>

    <Card><CardHeader><CardTitle>오프라인 작업/매출 수기 등록</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
      <div>선택 고객: {selected ? `${selected.name} (${selected.phone})` : "없음"}</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <select className="border rounded px-2" value={form.kind} onChange={(e)=>setForm({...form,kind:e.target.value})}>{Object.entries(kindLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
        <select className="border rounded px-2" value={form.status} onChange={(e)=>setForm({...form,status:e.target.value})}>{Object.entries(statusLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
        <select className="border rounded px-2" value={form.payStatus} onChange={(e)=>setForm({...form,payStatus:e.target.value})}>{Object.entries(paymentStatusLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
        <select className="border rounded px-2" value={form.method} onChange={(e)=>setForm({...form,method:e.target.value})}>{Object.entries(paymentMethodLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
        <Input placeholder="라켓명" value={form.racketName} onChange={(e)=>setForm({...form,racketName:e.target.value})}/><Input placeholder="스트링명" value={form.stringName} onChange={(e)=>setForm({...form,stringName:e.target.value})}/><Input placeholder="메인 텐션" value={form.tensionMain} onChange={(e)=>setForm({...form,tensionMain:e.target.value})}/><Input placeholder="크로스 텐션" value={form.tensionCross} onChange={(e)=>setForm({...form,tensionCross:e.target.value})}/><Input placeholder="결제금액" type="number" value={form.amount} onChange={(e)=>setForm({...form,amount:Number(e.target.value)})}/>
      </div>
      <textarea className="w-full border rounded p-2" placeholder="작업 메모" value={form.memo} onChange={(e)=>setForm({...form,memo:e.target.value})} />
      <Button disabled={isSubmitting} onClick={async()=>{if(!selected||isSubmitting)return;try{setIsSubmitting(true);let offlineCustomerId=selected.source==="offline"?selected.offlineCustomerId:selected.offlineCustomerId;if(selected.source==="online"&&!offlineCustomerId){const ensured = await adminMutator("/api/admin/offline/customers/ensure",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:selected.userId})}) as { item: OfflineCustomerDto };offlineCustomerId=ensured.item.id;setSelected({...selected,offlineCustomerId});}if(!offlineCustomerId){alert("오프라인 고객 연결에 실패했습니다.");return;}await adminMutator('/api/admin/offline/records',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({offlineCustomerId,userId:selected.source==="online"?selected.userId:selected.userId||null,kind:form.kind,status:form.status,lines:[{racketName:form.racketName,stringName:form.stringName,tensionMain:form.tensionMain,tensionCross:form.tensionCross,note:form.memo}],payment:{status:form.payStatus,method:form.method,amount:form.amount},memo:form.memo})});setForm({ kind: "stringing", status: "received", racketName: "", stringName: "", tensionMain: "", tensionCross: "", memo: "", amount: 0, method: "cash", payStatus: "pending" });mutateRecords();}catch(e:any){const message=String(e?.message||"");if(message.includes("휴대폰 번호")){alert("온라인 회원에 휴대폰 번호가 없어 오프라인 명부 연결이 필요합니다.");}else{alert(message||"오프라인 작업 저장에 실패했습니다.");}}finally{setIsSubmitting(false);}}}>{isSubmitting?"저장 중...":"저장"}</Button>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>최근 오프라인 작업/매출 목록</CardTitle></CardHeader><CardContent><table className="w-full text-sm"><thead><tr><th>날짜</th><th>고객명</th><th>휴대폰</th><th>유형</th><th>내용</th><th>금액</th><th>결제</th><th>상태</th></tr></thead><tbody>{(records?.items||[]).map((r:any)=><tr key={r.id}><td>{new Date(r.occurredAt).toLocaleDateString()}</td><td>{r.customerName}</td><td>{r.customerPhoneMasked}</td><td>{kindLabels[r.kind as keyof typeof kindLabels] ?? r.kind}</td><td>{r.lineSummary}</td><td>{r.payment?.amount}</td><td>{paymentStatusLabels[r.payment?.status as keyof typeof paymentStatusLabels] ?? r.payment?.status}</td><td>{statusLabels[r.status as keyof typeof statusLabels] ?? r.status}</td></tr>)}</tbody></table></CardContent></Card>
  </div>;
}
