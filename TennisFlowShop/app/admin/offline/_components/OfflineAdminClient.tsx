"use client";
import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authenticatedSWRFetcher } from "@/lib/fetchers/authenticatedSWRFetcher";
import { adminMutator } from "@/lib/admin/adminFetcher";

export default function OfflineAdminClient() {
  const [query, setQuery] = useState({ name: "", phone: "", email: "" });
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ kind: "stringing", status: "received", racketName: "", stringName: "", tensionMain: "", tensionCross: "", memo: "", amount: 0, method: "cash", payStatus: "pending" });
  const key = `/api/admin/offline/lookup?name=${encodeURIComponent(query.name)}&phone=${encodeURIComponent(query.phone)}&email=${encodeURIComponent(query.email)}`;
  const { data, mutate } = useSWR<{onlineUsers:any[];offlineCustomers:any[]}>(key, authenticatedSWRFetcher);
  const { data: records, mutate: mutateRecords } = useSWR<{items:any[]}>("/api/admin/offline/records", authenticatedSWRFetcher);

  return <div className="space-y-4">
    <Card><CardHeader><CardTitle>고객 검색/선택</CardTitle></CardHeader><CardContent className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2"><Input placeholder="이름" value={query.name} onChange={(e)=>setQuery({...query,name:e.target.value})}/><Input placeholder="휴대폰 번호" value={query.phone} onChange={(e)=>setQuery({...query,phone:e.target.value})}/><Input placeholder="이메일" value={query.email} onChange={(e)=>setQuery({...query,email:e.target.value})}/><Button onClick={()=>mutate()}>검색</Button></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><p className="font-medium">온라인 회원 결과</p>{(data?.onlineUsers||[]).map((u:any)=><div key={u.id} className="flex justify-between py-1 text-sm"><span>{u.name} / {u.phone}</span><Button size="sm" variant="outline" onClick={()=>setSelected({name:u.name,phone:u.phone,email:u.email,userId:u.id})}>선택</Button></div>)}</div><div><p className="font-medium">오프라인 명부 결과</p>{(data?.offlineCustomers||[]).map((c:any)=><div key={c.id} className="flex justify-between py-1 text-sm"><span>{c.name} / {c.phoneMasked}</span><Button size="sm" variant="outline" onClick={()=>setSelected(c)}>선택</Button></div>)}</div></div>
      <Button variant="secondary" onClick={async()=>{const name=prompt("이름")||"";const phone=prompt("휴대폰")||"";if(!name||!phone)return;await adminMutator("/api/admin/offline/customers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,phone,email:query.email||null})});mutate();}}>신규 오프라인 고객 등록</Button>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>오프라인 작업/매출 수기 등록</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
      <div>선택 고객: {selected ? `${selected.name} (${selected.phone ?? selected.phoneMasked})` : "없음"}</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2"><Input placeholder="작업 유형" value={form.kind} onChange={(e)=>setForm({...form,kind:e.target.value})}/><Input placeholder="라켓명" value={form.racketName} onChange={(e)=>setForm({...form,racketName:e.target.value})}/><Input placeholder="스트링명" value={form.stringName} onChange={(e)=>setForm({...form,stringName:e.target.value})}/><Input placeholder="결제금액" type="number" value={form.amount} onChange={(e)=>setForm({...form,amount:Number(e.target.value)})}/></div>
      <Button onClick={async()=>{if(!selected?.id)return;await adminMutator('/api/admin/offline/records',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({offlineCustomerId:selected.id,userId:selected.userId||null,kind:form.kind,status:form.status,customerSnapshot:{name:selected.name,phone:selected.phone||query.phone,email:selected.email||null},lines:[{racketName:form.racketName,stringName:form.stringName,tensionMain:form.tensionMain,tensionCross:form.tensionCross,note:form.memo}],payment:{status:form.payStatus,method:form.method,amount:form.amount},memo:form.memo})});mutateRecords();}}>저장</Button>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>최근 오프라인 작업/매출 목록</CardTitle></CardHeader><CardContent><table className="w-full text-sm"><thead><tr><th>날짜</th><th>고객명</th><th>휴대폰</th><th>유형</th><th>내용</th><th>금액</th><th>결제</th><th>상태</th></tr></thead><tbody>{(records?.items||[]).map((r:any)=><tr key={r.id}><td>{new Date(r.occurredAt).toLocaleDateString()}</td><td>{r.customerName}</td><td>{r.customerPhoneMasked}</td><td>{r.kind}</td><td>{r.lineSummary}</td><td>{r.payment?.amount}</td><td>{r.payment?.status}</td><td>{r.status}</td></tr>)}</tbody></table></CardContent></Card>
  </div>;
}
