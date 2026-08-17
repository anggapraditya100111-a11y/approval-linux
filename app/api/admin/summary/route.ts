import { requireApiUser } from "@/app/app-auth";
import { ensureSchema, getD1 } from "@/db/runtime";

type CountRow = { status: string; total: number };

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) return Response.json({ error: "Akses tidak diberikan." }, { status: 401 });
  await ensureSchema();
  const db = getD1();
  const url = new URL(request.url);
  const view = url.searchParams.get("view") || "dashboard";
  const isAdmin = user.role === "admin" || user.role === "super_admin";

  const countRows = isAdmin
    ? await db.prepare("SELECT status, COUNT(*) AS total FROM submissions WHERE deleted_at IS NULL GROUP BY status").all<CountRow>()
    : await db.prepare(`SELECT s.status, COUNT(DISTINCT s.id) AS total FROM submissions s
        JOIN approvals a ON a.submission_id = s.id WHERE a.approver_email = ? AND s.deleted_at IS NULL GROUP BY s.status`)
        .bind(user.email).all<CountRow>();
  const counts = Object.fromEntries((countRows.results as CountRow[]).map((row) => [row.status, Number(row.total)]));

  const total = isAdmin
    ? await db.prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM submissions WHERE deleted_at IS NULL AND status NOT IN ('selesai','ditolak','dibatalkan')").first<{ total: number }>()
    : await db.prepare(`SELECT COALESCE(SUM(DISTINCT s.amount), 0) AS total FROM submissions s
        JOIN approvals a ON a.submission_id = s.id WHERE a.approver_email = ? AND s.deleted_at IS NULL AND s.status NOT IN ('selesai','ditolak','dibatalkan')`).bind(user.email).first<{ total: number }>();

  let where = "WHERE s.deleted_at IS NULL";
  const params: string[] = [];
  if (!isAdmin) { where += " AND EXISTS (SELECT 1 FROM approvals a WHERE a.submission_id = s.id AND a.approver_email = ?)"; params.push(user.email); }
  if (view === "pelaksanaan") { where += " AND s.status = 'pelaksanaan'"; }
  if (view === "arsip") { where += " AND s.status IN ('selesai','ditolak','dibatalkan')"; }
  const latestStatement = db.prepare(`SELECT s.id, s.number, s.title,
      s.requester_name AS requesterName, s.requester_unit AS requesterUnit,
      s.form_type_name AS formTypeName, s.amount, s.status,
      s.current_step AS currentStep, s.created_at AS createdAt
      FROM submissions s ${where} ORDER BY s.created_at DESC LIMIT 50`);
  const latest = await (params.length ? latestStatement.bind(...params) : latestStatement).all();

  const pendingMine = await db.prepare(`SELECT s.id, s.number, s.title,
      s.requester_name AS requesterName, s.requester_unit AS requesterUnit,
      s.form_type_name AS formTypeName, s.amount, s.status,
      s.current_step AS currentStep, s.created_at AS createdAt
      FROM submissions s JOIN approvals a ON a.submission_id = s.id
      WHERE a.approver_email = ? AND a.step_number = s.current_step AND s.deleted_at IS NULL
        AND a.status = 'menunggu' AND s.status = 'menunggu_persetujuan'
      ORDER BY s.created_at DESC`).bind(user.email).all();

  return Response.json({ counts, totalAmount: Number(total?.total || 0), latest: latest.results, pendingMine: pendingMine.results, user });
}
