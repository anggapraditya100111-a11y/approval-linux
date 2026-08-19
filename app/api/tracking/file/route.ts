import { ensureSchema, getBucket, getD1 } from "@/db/runtime";
import { verifyPassword } from "@/lib/security";

type SubmissionAccess = { trackingPasswordHash: string };
type DocumentRow = { objectKey: string; fileName: string; mimeType: string };

export async function POST(request: Request) {
  await ensureSchema();
  const body = await request.json() as { id?: string; password?: string; documentId?: string };
  const submissionId = String(body.id || "");
  const password = String(body.password || "");
  const documentId = String(body.documentId || "");
  const submission = await getD1().prepare(`SELECT tracking_password_hash AS trackingPasswordHash
    FROM submissions WHERE id = ? AND deleted_at IS NULL`).bind(submissionId).first<SubmissionAccess>();
  if (!submission?.trackingPasswordHash || !password || !await verifyPassword(password, submission.trackingPasswordHash)) {
    return Response.json({ error: "Password berkas tidak sesuai." }, { status: 403 });
  }
  const document = await getD1().prepare(`SELECT object_key AS objectKey, file_name AS fileName,
    mime_type AS mimeType FROM documents WHERE id = ? AND submission_id = ?`)
    .bind(documentId, submissionId).first<DocumentRow>();
  if (!document) return Response.json({ error: "Lampiran tidak ditemukan." }, { status: 404 });
  const object = await getBucket().get(document.objectKey);
  if (!object) return Response.json({ error: "Berkas lampiran tidak ditemukan." }, { status: 404 });
  const headers = new Headers({
    "content-type": document.mimeType || "application/octet-stream",
    "content-disposition": `inline; filename="${document.fileName.replace(/["\r\n]/g, "_")}"`,
    "cache-control": "private, no-store",
  });
  return new Response(object.body, { headers });
}
