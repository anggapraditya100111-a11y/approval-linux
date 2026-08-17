import { ensureSchema, getD1 } from "@/db/runtime";
import { verifyPassword, maskName } from "@/lib/security";

type TrackingRow = {
  id: string; number: string; requesterName: string; requesterUnit: string;
  title: string; status: string; currentStep: number; createdAt: string; approvedAt: string | null;
};

function publicStatus(status: string) {
  if (["disetujui", "pelaksanaan", "selesai"].includes(status)) return "disetujui";
  if (["ditolak", "dibatalkan"].includes(status)) return "ditolak";
  if (status === "perlu_perbaikan") return "perlu_perbaikan";
  return "on_progress";
}

export async function GET() {
  await ensureSchema();
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  const rows = await getD1().prepare(`SELECT id, number, requester_name AS requesterName,
    requester_unit AS requesterUnit, title, status, current_step AS currentStep,
    created_at AS createdAt, approved_at AS approvedAt
    FROM submissions WHERE deleted_at IS NULL AND (
      status NOT IN ('disetujui','pelaksanaan','selesai','ditolak','dibatalkan')
      OR COALESCE(approved_at, completed_at, updated_at) >= ?
    ) ORDER BY created_at DESC LIMIT 100`).bind(cutoff).all<TrackingRow>();
  return Response.json({ submissions: (rows.results as TrackingRow[]).map((row) => ({
    id: row.id, number: row.number, requesterName: maskName(row.requesterName),
    requesterUnit: row.requesterUnit, status: publicStatus(row.status),
    createdAt: row.createdAt, approvedAt: row.approvedAt,
  })) });
}

export async function POST(request: Request) {
  await ensureSchema();
  const body = await request.json() as { id?: string; password?: string };
  const row = await getD1().prepare(`SELECT id, number, requester_name AS requesterName,
    requester_unit AS requesterUnit, form_type_name AS formTypeName, title, status,
    current_step AS currentStep, created_at AS createdAt, approved_at AS approvedAt,
    tracking_password_hash AS trackingPasswordHash FROM submissions
    WHERE id = ? AND deleted_at IS NULL`).bind(String(body.id || "")).first<TrackingRow & { formTypeName: string; trackingPasswordHash: string }>();
  if (!row || !body.password || !row.trackingPasswordHash || !await verifyPassword(body.password, row.trackingPasswordHash)) {
    return Response.json({ error: "Password berkas tidak sesuai." }, { status: 403 });
  }
  const approvals = await getD1().prepare(`SELECT step_number AS stepNumber, approver_title AS approverTitle,
    status, acted_at AS actedAt FROM approvals WHERE submission_id = ? AND step_number <= ? ORDER BY step_number`)
    .bind(row.id, row.currentStep).all();
  return Response.json({ submission: {
    id: row.id, number: row.number, requesterName: maskName(row.requesterName), requesterUnit: row.requesterUnit,
    formTypeName: row.formTypeName, title: row.title, status: publicStatus(row.status),
    createdAt: row.createdAt, approvedAt: row.approvedAt,
  }, approvals: approvals.results });
}
