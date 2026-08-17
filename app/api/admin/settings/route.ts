import { requireApiUser } from "@/app/app-auth";
import { ensureSchema, getD1, writeAudit } from "@/db/runtime";
import { hashPassword } from "@/lib/security";

function adminRole(role: string) { return role === "admin" || role === "super_admin"; }

export async function GET() {
  const user = await requireApiUser();
  if (!user || !adminRole(user.role)) return Response.json({ error: "Akses tidak diberikan." }, { status: 403 });
  await ensureSchema(); const db = getD1();
  const users = await db.prepare(`SELECT id, email, COALESCE(username,email) AS username, name, role, job_title AS jobTitle,
    department, active, signature_key IS NOT NULL AS hasSignature,
    approval_password_hash IS NOT NULL AS hasPassword, created_at AS createdAt FROM users ORDER BY active DESC, name`).all();
  const formTypes = await db.prepare(`SELECT id, name, description, icon,
    requires_amount AS requiresAmount, active, created_at AS createdAt FROM form_types ORDER BY rowid`).all();
  const options = await db.prepare(`SELECT id, kind, label, sort_order AS sortOrder, active
    FROM master_options ORDER BY kind, sort_order, label`).all();
  return Response.json({ users: users.results, formTypes: formTypes.results, options: options.results, currentUser: user });
}

export async function POST(request: Request) {
  const user = await requireApiUser();
  if (!user || !adminRole(user.role)) return Response.json({ error: "Akses tidak diberikan." }, { status: 403 });
  await ensureSchema(); const db = getD1(); const body = await request.json() as Record<string, unknown>; const action = String(body.action || ""); const now = new Date().toISOString();
  if (action === "add_user") {
    if (user.role !== "super_admin") return Response.json({error:"Hanya Super Admin yang dapat mengelola pengguna."},{status:403});
    const email = String(body.email || "").trim().toLowerCase(); const name = String(body.name || "").trim(); const role = String(body.role || "approver"); const username=String(body.username||email.split("@")[0]||"").trim().toLowerCase().replace(/[^a-z0-9._-]/g,"");
    if (!name || !username || !/^\S+@\S+\.\S+$/.test(email) || !["super_admin","admin","approver"].includes(role)) return Response.json({ error: "Data pengguna belum lengkap." }, { status: 400 });
    const password = String(body.password || "");
    const passwordHash = password ? await hashPassword(password) : null;
    await db.prepare(`INSERT INTO users (id,email,username,name,role,job_title,department,approval_password_hash,active,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,1,?,?) ON CONFLICT(email) DO UPDATE SET username=excluded.username,name=excluded.name,role=excluded.role,
      job_title=excluded.job_title,department=excluded.department,
      approval_password_hash=COALESCE(excluded.approval_password_hash,users.approval_password_hash),active=1,updated_at=excluded.updated_at`)
      .bind(crypto.randomUUID(), email, username, name, role, String(body.jobTitle || ""), String(body.department || ""), passwordHash, now, now).run();
    await writeAudit({ actorEmail:user.email, actorName:user.name, action:"pengguna_disimpan", detail:`${name} • ${role}` }); return Response.json({ok:true});
  }
  if (action === "toggle_user") {
    if (user.role !== "super_admin") return Response.json({error:"Hanya Super Admin yang dapat mengelola pengguna."},{status:403});
    const email = String(body.email || "").toLowerCase(); if (email === user.email) return Response.json({ error:"Akun yang sedang digunakan tidak dapat dinonaktifkan." },{status:400});
    await db.prepare("UPDATE users SET active = CASE active WHEN 1 THEN 0 ELSE 1 END, updated_at = ? WHERE email = ?").bind(now,email).run();
    await writeAudit({actorEmail:user.email,actorName:user.name,action:"status_pengguna_diubah",detail:email}); return Response.json({ok:true});
  }
  if (action === "add_form_type") {
    const name=String(body.name||"").trim(); const description=String(body.description||"").trim(); if(!name) return Response.json({error:"Nama formulir wajib diisi."},{status:400});
    const id=(String(body.id||name).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40) || crypto.randomUUID());
    await db.prepare(`INSERT INTO form_types (id,name,description,icon,requires_amount,active,created_at) VALUES (?,?,?,?,?,1,?)`)
      .bind(id,name,description,"dokumen",body.requiresAmount?1:0,now).run();
    await writeAudit({actorEmail:user.email,actorName:user.name,action:"formulir_dibuat",detail:name}); return Response.json({ok:true});
  }
  if (action === "edit_form_type") {
    const id=String(body.id||""); const name=String(body.name||"").trim(); const description=String(body.description||"").trim();
    if(!id||!name)return Response.json({error:"Data formulir belum lengkap."},{status:400});
    await db.prepare("UPDATE form_types SET name = ?, description = ?, requires_amount = ? WHERE id = ?")
      .bind(name,description,body.requiresAmount?1:0,id).run();
    await writeAudit({actorEmail:user.email,actorName:user.name,action:"formulir_diedit",detail:name}); return Response.json({ok:true});
  }
  if (action === "toggle_form_type") {
    await db.prepare("UPDATE form_types SET active = CASE active WHEN 1 THEN 0 ELSE 1 END WHERE id = ?").bind(String(body.id||"")).run();
    await writeAudit({actorEmail:user.email,actorName:user.name,action:"status_formulir_diubah",detail:String(body.id||"")}); return Response.json({ok:true});
  }
  if (action === "save_option") {
    const id=String(body.id||crypto.randomUUID()); const kind=String(body.kind||""); const label=String(body.label||"").trim();
    if(!["job_title","division"].includes(kind)||!label)return Response.json({error:"Data pilihan belum lengkap."},{status:400});
    await db.prepare(`INSERT INTO master_options (id,kind,label,sort_order,active,created_at,updated_at)
      VALUES (?,?,?,?,1,?,?) ON CONFLICT(id) DO UPDATE SET label=excluded.label,sort_order=excluded.sort_order,active=1,updated_at=excluded.updated_at`)
      .bind(id,kind,label,Number(body.sortOrder)||0,now,now).run();
    await writeAudit({actorEmail:user.email,actorName:user.name,action:"master_data_disimpan",detail:`${kind}: ${label}`}); return Response.json({ok:true});
  }
  if (action === "toggle_option") {
    await db.prepare("UPDATE master_options SET active = CASE active WHEN 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?").bind(now,String(body.id||"")).run();
    await writeAudit({actorEmail:user.email,actorName:user.name,action:"status_master_data_diubah",detail:String(body.id||"")}); return Response.json({ok:true});
  }
  return Response.json({error:"Tindakan tidak dikenali."},{status:400});
}
