import { ensureSchema,getD1 } from "@/db/runtime";
import { getBranding } from "@/lib/branding";
export async function GET(){try{await ensureSchema();await getD1().prepare("SELECT 1 AS ok").first();const branding=await getBranding();return Response.json({ok:true,app:branding.appName,version:"1.3.1"})}catch(error){return Response.json({ok:false,error:error instanceof Error?error.message:"Database unavailable"},{status:503})}}
