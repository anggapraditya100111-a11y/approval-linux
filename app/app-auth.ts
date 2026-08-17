import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ensureSchema, getD1 } from "@/db/runtime";

export type AppUser={id:string;email:string;username:string;name:string;role:"super_admin"|"admin"|"approver";jobTitle:string};
const COOKIE_NAME="ainet_session";
function tokenHash(token:string){return createHash("sha256").update(token).digest("hex")}

export async function createSession(userId:string){await ensureSchema();const token=randomBytes(32).toString("hex");const now=new Date();const expires=new Date(now.getTime()+7*86400000);await getD1().prepare("INSERT INTO app_sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)").bind(tokenHash(token),userId,expires.toISOString(),now.toISOString()).run();return{token,expires}}
export async function destroySession(token:string){await ensureSchema();await getD1().prepare("DELETE FROM app_sessions WHERE token_hash=?").bind(tokenHash(token)).run()}
export async function getSessionToken(){return (await cookies()).get(COOKIE_NAME)?.value||null}
export function sessionCookieName(){return COOKIE_NAME}
export async function getAppUser():Promise<AppUser|null>{const token=await getSessionToken();if(!token)return null;await ensureSchema();return getD1().prepare(`SELECT u.id,u.email,COALESCE(u.username,u.email) AS username,u.name,u.role,u.job_title AS jobTitle FROM app_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1`).bind(tokenHash(token),new Date().toISOString()).first<AppUser>()}
export async function requireAppUser(returnTo:string){const user=await getAppUser();if(user)return user;redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`)}
export async function requireApiUser(){return getAppUser()}
