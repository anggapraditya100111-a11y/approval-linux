import { requireApiUser } from "@/app/app-auth";
import { ensureSchema, getBucket, getD1, writeAudit } from "@/db/runtime";
import { hashSecret, randomToken } from "@/lib/security";

type ApprovalRow = {
  id: string; stepNumber: number; approverEmail: string; approverName: string;
  approverTitle: string; status: string; note: string; signatureKey: string | null;
  linkEnabled?: number;
};

function isAdmin(role: string) { return role === "admin" || role === "super_admin"; }

async function canAccess(submissionId: string, email: string, role: string) {
  if (isAdmin(role) || role === "pic") return true;
  const row = await getD1().prepare("SELECT 1 AS allowed FROM approvals WHERE submission_id = ? AND approver_email = ?")
    .bind(submissionId, email).first();
  return !!row;
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Akses tidak diberikan." }, { status: 401 });
  await ensureSchema();
  const { id } = await context.params;
  if (!(await canAccess(id, user.email, user.role))) return Response.json({ error: "Anda tidak berwenang melihat pengajuan ini." }, { status: 403 });
  const db = getD1();
  const submission = await db.prepare(`SELECT id, number, form_type_id AS formTypeId,
    form_type_name AS formTypeName, requester_name AS requesterName,
    requester_position AS requesterPosition, requester_unit AS requesterUnit,
    requester_phone AS requesterPhone, title, description, amount,
    needed_date AS neededDate, status, current_step AS currentStep,
    requester_signature_key AS requesterSignatureKey, created_at AS createdAt,
    updated_at AS updatedAt, completed_at AS completedAt, approved_at AS approvedAt
    FROM submissions WHERE id = ? AND deleted_at IS NULL`).bind(id).first();
  if (!submission) return Response.json({ error: "Pengajuan tidak ditemukan." }, { status: 404 });
  const documents = await db.prepare(`SELECT id, kind, file_name AS fileName, mime_type AS mimeType,
    size, object_key AS objectKey, created_at AS createdAt FROM documents WHERE submission_id = ? ORDER BY created_at`).bind(id).all();
  const approvals = await db.prepare(`SELECT id, step_number AS stepNumber, approver_email AS approverEmail,
    approver_name AS approverName, approver_title AS approverTitle, status, note,
    signature_key AS signatureKey, link_enabled AS linkEnabled, acted_at AS actedAt, created_at AS createdAt
    FROM approvals WHERE submission_id = ? ORDER BY step_number`).bind(id).all();
  const logs = await db.prepare(`SELECT actor_name AS actorName, action, detail, created_at AS createdAt
    FROM audit_logs WHERE submission_id = ? ORDER BY created_at DESC LIMIT 30`).bind(id).all();
  const approvers = isAdmin(user.role) ? await db.prepare(`SELECT email,name,job_title AS jobTitle,department,
    approval_password_hash IS NOT NULL AS hasPassword FROM users WHERE active=1 AND role='approver' ORDER BY name`).all() : {results:[]};
  const profile = await db.prepare("SELECT signature_key IS NOT NULL AS hasSignature FROM users WHERE email=?").bind(user.email).first();
  return Response.json({ submission, documents: documents.results, approvals: approvals.results, logs: logs.results, approvers:approvers.results, user:{...user,hasSignature:!!(profile as {hasSignature?:number}|null)?.hasSignature} });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Akses tidak diberikan." }, { status: 401 });
  await ensureSchema();
  const { id } = await context.params;
  const db = getD1();
  const submission = await db.prepare("SELECT id, status, current_step AS currentStep, number FROM submissions WHERE id = ? AND deleted_at IS NULL").bind(id).first<{ id: string; status: string; currentStep: number; number: string }>();
  if (!submission) return Response.json({ error: "Pengajuan tidak ditemukan." }, { status: 404 });

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await request.json() as { action?: string; steps?: Array<{ name?: string; title?: string; email?: string }>; [key:string]:unknown };
    if (!isAdmin(user.role)) return Response.json({ error: "Hanya admin yang dapat menjalankan tindakan ini." }, { status: 403 });
    if (body.action === "route") {
      if (!["baru", "menunggu_hrga", "perlu_perbaikan"].includes(submission.status)) return Response.json({ error: "Alur persetujuan sudah ditetapkan." }, { status: 409 });
      const steps = (body.steps || []).map((step) => ({ name: step.name?.trim() || "", title: step.title?.trim() || "", email: step.email?.trim().toLowerCase() || "" }));
      if (!steps.length || steps.length > 8 || steps.some((step) => !step.name || !step.title || !/^\S+@\S+\.\S+$/.test(step.email))) {
        return Response.json({ error: "Lengkapi nama, jabatan, dan email setiap approver." }, { status: 400 });
      }
      for(const step of steps){const account=await db.prepare("SELECT approval_password_hash AS passwordHash FROM users WHERE lower(email)=lower(?) AND active=1 AND role='approver'").bind(step.email).first<{passwordHash:string|null}>();if(!account?.passwordHash)return Response.json({error:`Pejabat ${step.name} belum memiliki akun Approval dan password.`},{status:400})}
      const now = new Date().toISOString();
      const hrga = await db.prepare("SELECT id,status FROM approvals WHERE submission_id=? AND step_number=1").bind(id).first<{id:string;status:string}>();
      await db.prepare(`DELETE FROM approvals WHERE submission_id = ? AND ${hrga?"step_number > 1":"1=1"}`).bind(id).run();
      await db.batch(steps.map((step, index) => db.prepare(`INSERT INTO approvals
        (id, submission_id, step_number, approver_email, approver_name, approver_title, status, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'menunggu', '', ?)`)
        .bind(crypto.randomUUID(), id, index + (hrga?2:1), step.email, step.name, step.title, now)));
      const currentStep=hrga?.status==="disetujui"?2:hrga?1:1;const status=hrga?.status==="disetujui"?"menunggu_persetujuan":hrga?"menunggu_hrga":"menunggu_persetujuan";
      await db.prepare("UPDATE submissions SET status = ?, current_step = ?, updated_at = ? WHERE id = ?").bind(status,currentStep,now,id).run();
      await writeAudit({ submissionId: id, actorEmail: user.email, actorName: user.name, action: "alur_ditetapkan", detail: `HRGA + ${steps.length} tahap persetujuan` });
      return Response.json({ ok: true });
    }
    if(body.action==="generate_link"){
      const approval=await db.prepare("SELECT id,step_number AS stepNumber,status,approver_email AS approverEmail FROM approvals WHERE submission_id=? AND step_number=?").bind(id,submission.currentStep).first<{id:string;stepNumber:number;status:string;approverEmail:string}>();
      if(!approval||approval.status!=="menunggu")return Response.json({error:"Belum ada tahap approval aktif."},{status:409});
      if(approval.stepNumber>1){const previous=await db.prepare("SELECT status FROM approvals WHERE submission_id=? AND step_number=?").bind(id,approval.stepNumber-1).first<{status:string}>();if(previous?.status!=="disetujui")return Response.json({error:"Approval sebelumnya belum menyetujui."},{status:409})}
      const account=await db.prepare("SELECT approval_password_hash AS passwordHash FROM users WHERE lower(email)=lower(?)").bind(approval.approverEmail).first<{passwordHash:string|null}>();if(!account?.passwordHash)return Response.json({error:"Password pejabat approval belum dibuat."},{status:400});
      const token=randomToken();const tokenHash=await hashSecret(token,"approval-link");await db.prepare("UPDATE approvals SET link_token_hash=?,link_enabled=1 WHERE id=?").bind(tokenHash,approval.id).run();await writeAudit({submissionId:id,actorEmail:user.email,actorName:user.name,action:"tautan_approval_dibuat",detail:`Tahap ${approval.stepNumber}`});const base=(process.env.APP_BASE_URL||new URL(request.url).origin).replace(/\/$/,"");return Response.json({ok:true,url:`${base}/persetujuan/${token}`});
    }
    if(body.action==="edit_submission"){
      const acted=await db.prepare("SELECT COUNT(*) AS total FROM approvals WHERE submission_id=? AND acted_at IS NOT NULL").bind(id).first<{total:number}>();if(Number(acted?.total||0)>0)return Response.json({error:"Pengajuan tidak dapat diedit karena persetujuan sudah dimulai."},{status:409});
      const title=String(body.title||"").trim(),description=String(body.description||"").trim(),position=String(body.requesterPosition||"").trim(),unit=String(body.requesterUnit||"").trim();if(!title||!description||!position||!unit)return Response.json({error:"Data pengajuan belum lengkap."},{status:400});
      await db.prepare("UPDATE submissions SET title=?,description=?,requester_position=?,requester_unit=?,amount=?,needed_date=?,updated_at=? WHERE id=?").bind(title,description,position,unit,Number(body.amount)||0,String(body.neededDate||"")||null,new Date().toISOString(),id).run();await writeAudit({submissionId:id,actorEmail:user.email,actorName:user.name,action:"pengajuan_diedit",detail:"Koreksi sebelum persetujuan"});return Response.json({ok:true});
    }
    const actionStatus: Record<string, string> = { start_execution: "pelaksanaan", complete: "selesai", cancel: "dibatalkan" };
    const nextStatus = body.action ? actionStatus[body.action] : null;
    if (nextStatus) {
      if (body.action === "start_execution" && submission.status !== "disetujui") return Response.json({ error: "Pengajuan belum disetujui." }, { status: 409 });
      if (body.action === "complete" && !["disetujui", "pelaksanaan"].includes(submission.status)) return Response.json({ error: "Pengajuan belum dapat diselesaikan." }, { status: 409 });
      const now = new Date().toISOString();
      await db.prepare("UPDATE submissions SET status = ?, updated_at = ?, completed_at = ? WHERE id = ?")
        .bind(nextStatus, now, nextStatus === "selesai" ? now : null, id).run();
      await writeAudit({ submissionId: id, actorEmail: user.email, actorName: user.name, action: body.action || "status_diubah", detail: nextStatus });
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Tindakan tidak dikenali." }, { status: 400 });
  }

  const data = await request.formData();
  const action = String(data.get("action") || "");
  const note = String(data.get("note") || "").trim();
  if (!["approve", "reject", "revision"].includes(action)) return Response.json({ error: "Tindakan tidak dikenali." }, { status: 400 });
  const approval = await db.prepare(`SELECT id, step_number AS stepNumber, approver_email AS approverEmail,
    approver_name AS approverName, approver_title AS approverTitle, status
    FROM approvals WHERE submission_id = ? AND step_number = ?`).bind(id, submission.currentStep).first<ApprovalRow>();
  if (!approval || approval.approverEmail.toLowerCase() !== user.email.toLowerCase() || approval.status !== "menunggu") {
    return Response.json({ error: "Pengajuan ini belum menjadi giliran persetujuan Anda." }, { status: 403 });
  }
  const signature = data.get("signature");
  const useStored=String(data.get("useStored")||"")==="true";
  if (!useStored && (!(signature instanceof File) || signature.size < 100)) return Response.json({ error: "Tanda tangan keputusan wajib dibubuhkan." }, { status: 400 });
  if ((action === "reject" || action === "revision") && !note) return Response.json({ error: "Catatan wajib diisi untuk penolakan atau perbaikan." }, { status: 400 });
  const now = new Date().toISOString();
  const signatureKey = `submissions/${id}/approvals/${approval.id}.png`;
  let signatureBytes:ArrayBuffer;if(useStored){const profile=await db.prepare("SELECT signature_key AS signatureKey FROM users WHERE email=?").bind(user.email).first<{signatureKey:string}>();if(!profile?.signatureKey)return Response.json({error:"Tanda tangan tersimpan belum tersedia."},{status:400});const stored=await getBucket().get(profile.signatureKey);if(!stored)return Response.json({error:"Tanda tangan tersimpan tidak ditemukan."},{status:400});signatureBytes=await stored.arrayBuffer()}else{signatureBytes=await (signature as File).arrayBuffer();const storedKey=`users/${encodeURIComponent(user.email)}/signature.png`;await getBucket().put(storedKey,signatureBytes,{httpMetadata:{contentType:"image/png"}});await db.prepare("UPDATE users SET signature_key=?,updated_at=? WHERE email=?").bind(storedKey,now,user.email).run()}
  await getBucket().put(signatureKey, signatureBytes, { httpMetadata: { contentType: "image/png" } });
  const approvalStatus = action === "approve" ? "disetujui" : action === "reject" ? "ditolak" : "perlu_perbaikan";
  await db.prepare("UPDATE approvals SET status = ?, note = ?, signature_key = ?, acted_at = ? WHERE id = ?")
    .bind(approvalStatus, note, signatureKey, now, approval.id).run();
  let nextStatus = approvalStatus;
  let nextStep = submission.currentStep;
  if (action === "approve") {
    const next = await db.prepare("SELECT step_number AS stepNumber FROM approvals WHERE submission_id = ? AND step_number > ? ORDER BY step_number LIMIT 1")
      .bind(id, submission.currentStep).first<{ stepNumber: number }>();
    if (next) { nextStatus = "menunggu_persetujuan"; nextStep = next.stepNumber; }
    else if(approval.stepNumber===1){nextStatus="baru";}
  }
  await db.prepare("UPDATE submissions SET status = ?, current_step = ?, approved_at = CASE WHEN ?='disetujui' THEN ? ELSE approved_at END, updated_at = ? WHERE id = ?")
    .bind(nextStatus, nextStep,nextStatus,now, now, id).run();
  await writeAudit({ submissionId: id, actorEmail: user.email, actorName: user.name, action: `persetujuan_${action}`, detail: `${approval.approverTitle}${note ? `: ${note}` : ""}` });
  return Response.json({ ok: true, status: nextStatus });
}

export async function DELETE(_:Request,context:{params:Promise<{id:string}>}){const user=await requireApiUser();if(!user||!isAdmin(user.role))return Response.json({error:"Akses tidak diberikan."},{status:403});await ensureSchema();const {id}=await context.params;const db=getD1();const acted=await db.prepare("SELECT COUNT(*) AS total FROM approvals WHERE submission_id=? AND acted_at IS NOT NULL").bind(id).first<{total:number}>();if(Number(acted?.total||0)>0)return Response.json({error:"Pengajuan tidak dapat dihapus karena sudah memiliki persetujuan."},{status:409});const now=new Date().toISOString();await db.prepare("UPDATE submissions SET deleted_at=?,status='dihapus',updated_at=? WHERE id=?").bind(now,now,id).run();await db.prepare("UPDATE approvals SET link_enabled=0 WHERE submission_id=?").bind(id).run();await writeAudit({submissionId:id,actorEmail:user.email,actorName:user.name,action:"pengajuan_dihapus",detail:"Dihapus sebelum ada persetujuan"});return Response.json({ok:true})}
