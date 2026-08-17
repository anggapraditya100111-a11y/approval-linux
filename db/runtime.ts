import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";

const dataDir = path.resolve(process.env.DATA_DIR || path.join(/* turbopackIgnore: true */ process.cwd(), ".data"));
const uploadDir = path.join(dataDir, "uploads");
let database: Database.Database | null = null;
let initialization: Promise<void> | null = null;

function rawDb() {
  if (database) return database;
  database = new Database(path.join(dataDir, "ainet-approval.sqlite"));
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.pragma("busy_timeout = 5000");
  return database;
}

class BoundStatement {
  constructor(private sql: string, private params: unknown[] = []) {}
  bind(...params: unknown[]) { return new BoundStatement(this.sql, params); }
  async run() { const info = rawDb().prepare(this.sql).run(...this.params); return { success: true, meta: { changes: info.changes, last_row_id: info.lastInsertRowid } }; }
  async first<T>() { return (rawDb().prepare(this.sql).get(...this.params) as T | undefined) ?? null; }
  async all<T>() { return { results: rawDb().prepare(this.sql).all(...this.params) as T[] }; }
  runSync() { return rawDb().prepare(this.sql).run(...this.params); }
}

const databaseAdapter = {
  prepare(sql: string) { return new BoundStatement(sql); },
  async batch(statements: BoundStatement[]) {
    const execute = rawDb().transaction(() => statements.map((statement) => statement.runSync()));
    return execute();
  },
};

export function getD1() { return databaseAdapter; }

function objectPath(key: string) {
  const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) throw new Error("Lokasi berkas tidak valid.");
  return path.join(uploadDir, ...normalized.split("/"));
}

function inferredMime(key: string) {
  const ext = path.extname(key).toLowerCase();
  return ext === ".pdf" ? "application/pdf" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : "image/png";
}

export function getBucket() {
  return {
    async put(key: string, value: ArrayBuffer | Uint8Array, options?: { httpMetadata?: { contentType?: string } }) {
      const target = objectPath(key); await mkdir(path.dirname(target), { recursive: true });
      const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : value;
      await writeFile(target, Buffer.from(bytes));
      if (options?.httpMetadata?.contentType) await writeFile(`${target}.content-type`, options.httpMetadata.contentType, "utf8");
    },
    async get(key: string) {
      try {
        const target = objectPath(key); const bytes = await readFile(target);
        let contentType = inferredMime(key); try { contentType = await readFile(`${target}.content-type`, "utf8"); } catch {}
        return {
          body: bytes, httpEtag: createHash("sha1").update(bytes).digest("hex"),
          arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
          writeHttpMetadata(headers: Headers) { headers.set("content-type", contentType); },
        };
      } catch { return null; }
    },
    async delete(key: string) {
      const target = objectPath(key);
      try { await unlink(target); } catch {}
      try { await unlink(`${target}.content-type`); } catch {}
    },
  };
}

export async function ensureSchema() {
  if (initialization) return initialization;
  initialization = initialize().catch((error) => { initialization = null; throw error; });
  return initialization;
}

async function initialize() {
  await mkdir(uploadDir, { recursive: true }); const db = rawDb();
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,username TEXT UNIQUE,name TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'approver',job_title TEXT NOT NULL DEFAULT '',department TEXT NOT NULL DEFAULT '',signature_key TEXT,approval_password_hash TEXT,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS form_types (id TEXT PRIMARY KEY,name TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',icon TEXT NOT NULL DEFAULT 'dokumen',requires_amount INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS submissions (id TEXT PRIMARY KEY,number TEXT NOT NULL UNIQUE,form_type_id TEXT NOT NULL,form_type_name TEXT NOT NULL,requester_name TEXT NOT NULL,requester_position TEXT NOT NULL,requester_unit TEXT NOT NULL,requester_phone TEXT NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL,amount INTEGER NOT NULL DEFAULT 0,needed_date TEXT,status TEXT NOT NULL DEFAULT 'baru',current_step INTEGER NOT NULL DEFAULT 0,requester_signature_key TEXT NOT NULL,tracking_password_hash TEXT,approved_at TEXT,deleted_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,completed_at TEXT)`,
    `CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY,submission_id TEXT NOT NULL,kind TEXT NOT NULL,file_name TEXT NOT NULL,object_key TEXT NOT NULL,mime_type TEXT NOT NULL,size INTEGER NOT NULL DEFAULT 0,uploaded_by TEXT NOT NULL,created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS approvals (id TEXT PRIMARY KEY,submission_id TEXT NOT NULL,step_number INTEGER NOT NULL,approver_email TEXT NOT NULL,approver_name TEXT NOT NULL,approver_title TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'menunggu',note TEXT NOT NULL DEFAULT '',signature_key TEXT,link_token_hash TEXT,link_enabled INTEGER NOT NULL DEFAULT 0,acted_at TEXT,created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS master_options (id TEXT PRIMARY KEY,kind TEXT NOT NULL,label TEXT NOT NULL,sort_order INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY,submission_id TEXT,actor_email TEXT NOT NULL,actor_name TEXT NOT NULL,action TEXT NOT NULL,detail TEXT NOT NULL DEFAULT '',created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS app_sessions (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires_at TEXT NOT NULL,created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at TEXT NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS submissions_status_idx ON submissions(status)`,
    `CREATE INDEX IF NOT EXISTS approvals_submission_idx ON approvals(submission_id,step_number)`,
    `CREATE INDEX IF NOT EXISTS approvals_token_idx ON approvals(link_token_hash)`,
    `CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON app_sessions(expires_at)`,
  ];
  db.transaction(() => statements.forEach((sql) => db.prepare(sql).run()))();
  const now = new Date().toISOString();
  const count = db.prepare("SELECT COUNT(*) AS total FROM users").get() as { total: number };
  if (!count.total) {
    const email = process.env.ADMIN_EMAIL || "admin@ainet.local"; const username = process.env.ADMIN_USERNAME || "admin";
    const password = process.env.ADMIN_PASSWORD || "GantiPasswordIni!";
    db.prepare(`INSERT INTO users (id,email,username,name,role,job_title,department,approval_password_hash,active,created_at,updated_at) VALUES (?,?,?,?,?,'Super Admin','Manajemen',?,1,?,?)`)
      .run(crypto.randomUUID(), email, username, "Super Admin", "super_admin", bcrypt.hashSync(password, 12), now, now);
  }
  const forms = [["pengadaan","Pengadaan Barang/Jasa","Permintaan pembelian material, perangkat, atau jasa.","belanja",1],["operasional","Pengeluaran Operasional","Kebutuhan biaya kegiatan operasional perusahaan.","operasional",1],["pembayaran","Permohonan Pembayaran","Pembayaran tagihan vendor atau kewajiban perusahaan.","pembayaran",1],["aset","Penggunaan atau Pemindahan Aset","Penggunaan, serah terima, atau pemindahan aset.","aset",0],["umum","Pengajuan Umum","Pengajuan internal di luar kategori yang tersedia.","dokumen",0]];
  const insertForm = db.prepare("INSERT OR IGNORE INTO form_types (id,name,description,icon,requires_amount,active,created_at) VALUES (?,?,?,?,?,1,?)"); forms.forEach((row) => insertForm.run(...row, now));
  const options = [["job_title","Staff",10],["job_title","Supervisor",20],["job_title","Manager",30],["job_title","General Manager",40],["division","HRGA",10],["division","Teknis",20],["division","Keuangan",30],["division","Operasional",40]];
  const insertOption = db.prepare("INSERT OR IGNORE INTO master_options (id,kind,label,sort_order,active,created_at,updated_at) VALUES (?,?,?,?,1,?,?)"); options.forEach(([kind,label,sort]) => insertOption.run(`${kind}-${String(label).toLowerCase().replace(/[^a-z0-9]+/g,"-")}`,kind,label,sort,now,now));
  db.prepare("DELETE FROM app_sessions WHERE expires_at < ?").run(now);
}

export async function writeAudit(input:{submissionId?:string|null;actorEmail:string;actorName:string;action:string;detail?:string}) {
  await ensureSchema(); await databaseAdapter.prepare("INSERT INTO audit_logs (id,submission_id,actor_email,actor_name,action,detail,created_at) VALUES (?,?,?,?,?,?,?)")
    .bind(crypto.randomUUID(),input.submissionId??null,input.actorEmail,input.actorName,input.action,input.detail??"",new Date().toISOString()).run();
}
