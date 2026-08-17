import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
test("CasaOS package has required files",async()=>{const compose=await readFile("docker-compose.yml","utf8");const env=await readFile(".env.example","utf8");assert.match(compose,/ainet-approval/);assert.match(compose,/8093/);assert.match(env,/ADMIN_PASSWORD/);assert.match(env,/APP_ACCESS_PASSWORD/);assert.match(compose,/APP_ACCESS_PASSWORD/)});

test("global access gate protects app routes",async()=>{const proxy=await readFile("proxy.ts","utf8");const access=await readFile("lib/access-gate.ts","utf8");assert.match(access,/ainet_access/);assert.match(proxy,/\/api\/access/);assert.match(proxy,/\/health/);assert.match(proxy,/Password akses awal diperlukan/)});

test("super admin can manage access password and branding",async()=>{const settings=await readFile("components/AdminSettings.tsx","utf8");const accessRoute=await readFile("app/api/admin/access-password/route.ts","utf8");const schema=await readFile("db/runtime.ts","utf8");assert.match(settings,/Password masuk/);assert.match(settings,/Identitas aplikasi/);assert.match(settings,/👁/);assert.match(accessRoute,/\[A-Za-z0-9\]/);assert.match(accessRoute,/super_admin/);assert.match(schema,/app_settings/)});
