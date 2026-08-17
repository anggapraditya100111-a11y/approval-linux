import { requireApiUser } from "@/app/app-auth";
import { ensureSchema, getBucket, getD1 } from "@/db/runtime";

export async function GET(request: Request) {
  const user = await requireApiUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  await ensureSchema();
  const key = new URL(request.url).searchParams.get("key") || "";
  if (!key.startsWith("submissions/")) return new Response("Invalid", { status: 400 });
  const submissionId = key.split("/")[1];
  if (!submissionId) return new Response("Invalid", { status: 400 });
  if (user.role !== "admin" && user.role !== "super_admin") {
    const allowed = await getD1().prepare("SELECT 1 FROM approvals WHERE submission_id = ? AND approver_email = ?").bind(submissionId, user.email).first();
    if (!allowed) return new Response("Forbidden", { status: 403 });
  }
  const object = await getBucket().get(key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "private, max-age=300");
  return new Response(object.body, { headers });
}
