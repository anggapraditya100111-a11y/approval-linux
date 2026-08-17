import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
test("CasaOS package has required files",async()=>{const compose=await readFile("docker-compose.yml","utf8");const env=await readFile(".env.example","utf8");assert.match(compose,/ainet-approval/);assert.match(compose,/8093/);assert.match(env,/ADMIN_PASSWORD/);assert.match(env,/APP_ACCESS_PASSWORD/);assert.match(compose,/APP_ACCESS_PASSWORD/)});

test("global access gate protects app routes",async()=>{const proxy=await readFile("proxy.ts","utf8");assert.match(proxy,/ainet_access/);assert.match(proxy,/\/api\/access/);assert.match(proxy,/\/health/);assert.match(proxy,/Password akses awal diperlukan/)});
