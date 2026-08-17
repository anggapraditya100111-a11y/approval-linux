import { ensureSchema, getBucket, getD1, writeAudit } from "@/db/runtime";
import { hashPassword } from "@/lib/security";

function value(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-100) || "berkas";
}

function submissionNumber() {
  const now = new Date();
  const period = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const suffix = `${Date.now()}`.slice(-6) + Math.floor(Math.random() * 10);
  return `APR-${period}-${suffix}`;
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const data = await request.formData();
    const required = ["formTypeId", "formTypeName", "requesterName", "requesterPosition", "requesterUnit", "requesterPhone", "title", "description", "trackingPassword"];
    if (required.some((key) => !value(data, key))) {
      return Response.json({ error: "Mohon lengkapi seluruh data wajib." }, { status: 400 });
    }
    if (value(data, "trackingPassword").length < 4) {
      return Response.json({ error: "Password pemantauan minimal 4 karakter." }, { status: 400 });
    }
    const signature = data.get("signature");
    if (!(signature instanceof File) || signature.size < 100) {
      return Response.json({ error: "Tanda tangan pemohon wajib dibubuhkan." }, { status: 400 });
    }
    if (signature.size > 2_000_000) {
      return Response.json({ error: "Ukuran tanda tangan terlalu besar." }, { status: 400 });
    }
    const attachments = data.getAll("attachments").filter((item): item is File => item instanceof File && item.size > 0);
    if (attachments.length > 5 || attachments.some((file) => file.size > 8_000_000)) {
      return Response.json({ error: "Lampiran maksimal 5 berkas dan 8 MB per berkas." }, { status: 400 });
    }
    const allowed = new Set(["image/jpeg", "image/png", "application/pdf"]);
    if (attachments.some((file) => !allowed.has(file.type))) {
      return Response.json({ error: "Lampiran hanya boleh berupa JPG, PNG, atau PDF." }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const number = submissionNumber();
    const now = new Date().toISOString();
    const signatureKey = `submissions/${id}/requester-signature.png`;
    const bucket = getBucket();
    await bucket.put(signatureKey, await signature.arrayBuffer(), { httpMetadata: { contentType: "image/png" } });

    const db = getD1();
    const trackingPasswordHash = await hashPassword(value(data, "trackingPassword"));
    const hrga = await db.prepare(`SELECT email, name, job_title AS jobTitle FROM users
      WHERE active = 1 AND role IN ('admin','super_admin')
      ORDER BY CASE WHEN upper(department) LIKE '%HRGA%' OR upper(job_title) LIKE '%HRGA%' THEN 0 ELSE 1 END, created_at LIMIT 1`)
      .first<{ email: string; name: string; jobTitle: string }>();
    const initialStatus = hrga ? "menunggu_hrga" : "baru";
    const initialStep = hrga ? 1 : 0;
    await db.prepare(`INSERT INTO submissions
      (id, number, form_type_id, form_type_name, requester_name, requester_position,
       requester_unit, requester_phone, title, description, amount, needed_date, status,
       current_step, requester_signature_key, tracking_password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, number, value(data, "formTypeId"), value(data, "formTypeName"),
        value(data, "requesterName"), value(data, "requesterPosition"), value(data, "requesterUnit"),
        value(data, "requesterPhone"), value(data, "title"), value(data, "description"),
        Number(value(data, "amount")) || 0, value(data, "neededDate") || null, initialStatus,
        initialStep, signatureKey, trackingPasswordHash, now, now).run();

    if (hrga) {
      await db.prepare(`INSERT INTO approvals
        (id, submission_id, step_number, approver_email, approver_name, approver_title, status, note, created_at)
        VALUES (?, ?, 1, ?, ?, ?, 'menunggu', '', ?)`)
        .bind(crypto.randomUUID(), id, hrga.email, hrga.name, hrga.jobTitle || "HRGA", now).run();
    }

    for (const file of attachments) {
      const documentId = crypto.randomUUID();
      const objectKey = `submissions/${id}/attachments/${documentId}-${safeFileName(file.name)}`;
      await bucket.put(objectKey, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
      await db.prepare(`INSERT INTO documents
        (id, submission_id, kind, file_name, object_key, mime_type, size, uploaded_by, created_at)
        VALUES (?, ?, 'lampiran', ?, ?, ?, ?, ?, ?)`)
        .bind(documentId, id, file.name, objectKey, file.type, file.size, value(data, "requesterName"), now).run();
    }
    await writeAudit({ submissionId: id, actorEmail: "public-form", actorName: value(data, "requesterName"), action: "pengajuan_dibuat", detail: number });
    return Response.json({ ok: true, id, number }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pengajuan belum dapat disimpan.";
    return Response.json({ error: message }, { status: 500 });
  }
}
