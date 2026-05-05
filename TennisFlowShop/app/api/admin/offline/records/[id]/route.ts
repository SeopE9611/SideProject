import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin.guard";
import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { appendAudit } from "@/lib/audit";
import { offlineRecordPatchSchema } from "@/lib/offline/validators";

const oid=(id:string)=>(ObjectId.isValid(id)?new ObjectId(id):null);
export async function GET(req:Request, ctx:{params:Promise<{id:string}>}){const guard=await requireAdmin(req);if(!guard.ok)return guard.res;const _id=oid((await ctx.params).id);if(!_id)return NextResponse.json({message:"invalid id"},{status:400});const doc=await guard.db.collection("offline_service_records").findOne({_id});if(!doc)return NextResponse.json({message:"not found"},{status:404});return NextResponse.json({item:{...doc,id:String(doc._id),_id:undefined}})}
export async function PATCH(req:Request, ctx:{params:Promise<{id:string}>}){const guard=await requireAdmin(req);if(!guard.ok)return guard.res;const csrf=verifyAdminCsrf(req);if(!csrf.ok)return csrf.res;const _id=oid((await ctx.params).id);if(!_id)return NextResponse.json({message:"invalid id"},{status:400});const body=await req.json().catch(()=>null);const parsed=offlineRecordPatchSchema.safeParse(body);if(!parsed.success)return NextResponse.json({message:"invalid body"},{status:400});const $set:Record<string,any>={...parsed.data,updatedAt:new Date(),updatedBy:guard.admin._id};if(parsed.data.payment?.paidAt)$set["payment.paidAt"]=new Date(parsed.data.payment.paidAt);await guard.db.collection("offline_service_records").updateOne({_id},{$set});await appendAudit(guard.db,{type:"offline_record_update",actorId:guard.admin._id,targetId:_id,message:"오프라인 작업/매출 수정",diff:$set},req);const doc=await guard.db.collection("offline_service_records").findOne({_id});return NextResponse.json({item:{...doc,id:String(doc?._id),_id:undefined}})}
