import { ensureSchema,getD1 } from "@/db/runtime";
export async function GET(){try{await ensureSchema();await getD1().prepare("SELECT 1 AS ok").first();return Response.json({ok:true,app:"AINET Approval",version:"1.0.0"})}catch(error){return Response.json({ok:false,error:error instanceof Error?error.message:"Database unavailable"},{status:503})}}
