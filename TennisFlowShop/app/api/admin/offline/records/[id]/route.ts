import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAudit } from "@/lib/audit";
import { offlineRecordPatchSchema } from "@/lib/offline/validators";

const oid=(id:string)=>(ObjectId.isValid(id)?new ObjectId(id):null);
export async function GET(req:Request, ctx:{params:Promise<{id:string}>}){const guard=await requireAdmin(req);if(!guard.ok)return guard.res;const _id=oid((await ctx.params).id);if(!_id)return NextResponse.json({message:"invalid id"},{status:400});const doc=await guard.db.collection("offline_service_records").findOne({_id});if(!doc)return NextResponse.json({message:"not found"},{status:404});return NextResponse.json({item:{...doc,id:String(doc._id),_id:undefined}})}
export async function PATCH(req:Request, ctx:{params:Promise<{id:string}>}){const guard=await requireAdmin(req);if(!guard.ok)return guard.res;const csrf=verifyAdminCsrf(req);if(!csrf.ok)return csrf.res;const _id=oid((await ctx.params).id);if(!_id)return NextResponse.json({message:"invalid id"},{status:400});const body=await req.json().catch(()=>null);const parsed=offlineRecordPatchSchema.safeParse(body);if(!parsed.success)return NextResponse.json({message:"invalid body"},{status:400});const existingRecord=await guard.db.collection("offline_service_records").findOne({_id});if(!existingRecord)return NextResponse.json({message:"record not found"},{status:404});const $set:Record<string,any>={updatedAt:new Date(),updatedBy:guard.admin._id};
if (parsed.data.kind) $set.kind = parsed.data.kind;
if (parsed.data.status) $set.status = parsed.data.status;
if (parsed.data.occurredAt) $set.occurredAt = new Date(parsed.data.occurredAt);
if ("lines" in parsed.data) $set.lines = parsed.data.lines ?? [];
if ("memo" in parsed.data) $set.memo = parsed.data.memo ?? "";
if (parsed.data.payment?.status) $set["payment.status"] = parsed.data.payment.status;
if (parsed.data.payment?.method) $set["payment.method"] = parsed.data.payment.method;
if (typeof parsed.data.payment?.amount === "number") $set["payment.amount"] = parsed.data.payment.amount;
if (parsed.data.payment?.paidAt) $set["payment.paidAt"] = new Date(parsed.data.payment.paidAt);
const oldPayment=existingRecord.payment??{};const nextPayment={...oldPayment,...(parsed.data.payment??{})};const oldPaidAmount=oldPayment.status==="paid"?Number(oldPayment.amount||0):0;const newPaidAmount=nextPayment.status==="paid"?Number(nextPayment.amount||0):0;const totalPaidDelta=newPaidAmount-oldPaidAmount;const updateResult=await guard.db.collection("offline_service_records").updateOne({_id},{$set});if(updateResult.matchedCount===0)return NextResponse.json({message:"record not found"},{status:404});if(totalPaidDelta!==0&&existingRecord.offlineCustomerId){await guard.db.collection("offline_customers").updateOne({_id:existingRecord.offlineCustomerId},{$inc:{"stats.totalPaid":totalPaidDelta},$set:{updatedAt:new Date(),updatedBy:guard.admin._id}});}await appendAudit(guard.db,{type:"offline_record_update",actorId:guard.admin._id,targetId:_id,message:"오프라인 작업/매출 수정",diff:$set},req);const doc=await guard.db.collection("offline_service_records").findOne({_id});if(!doc)return NextResponse.json({message:"record not found"},{status:404});return NextResponse.json({item:{...doc,id:String(doc._id),_id:undefined}})}
