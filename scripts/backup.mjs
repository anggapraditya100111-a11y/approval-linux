import Database from "better-sqlite3";
import { cp,mkdir,writeFile } from "node:fs/promises";
import path from "node:path";
const dataDir=path.resolve(process.env.DATA_DIR||"/app/data");
const stamp=new Date().toISOString().replace(/[:.]/g,"-");
const target=path.join(dataDir,"backups",stamp);
await mkdir(target,{recursive:true});
const db=new Database(path.join(dataDir,"ainet-approval.sqlite"));
await db.backup(path.join(target,"ainet-approval.sqlite"));db.close();
try{await cp(path.join(dataDir,"uploads"),path.join(target,"uploads"),{recursive:true})}catch{}
await writeFile(path.join(target,"backup-info.json"),JSON.stringify({app:"AINET Approval",version:"1.0.0",createdAt:new Date().toISOString()},null,2));
console.log(target);
