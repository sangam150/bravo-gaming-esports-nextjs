import ts from "typescript";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

// Mechanical review of every changed/new candidate, complementary to manual
// security/transaction review and browser tests. Does not certify business logic.
const git=(...args)=>execFileSync("git",args,{encoding:"utf8",windowsHide:true,maxBuffer:32*1024*1024});
const files=[...new Set([...git("diff","HEAD","--name-only").trim().split(/\r?\n/),...git("ls-files","--others","--exclude-standard").trim().split(/\r?\n/)])].filter(Boolean).sort();
const config=ts.readConfigFile("tsconfig.json",ts.sys.readFile);
const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,process.cwd());
const issues=[];const entries=[];
for(const file of files){
  if(!existsSync(file)){entries.push({file,kind:"deleted",review:"references checked separately"});continue;}
  const buffer=readFileSync(file);const source=buffer.toString("utf8");
  const entry={file,bytes:buffer.length,sha256:createHash("sha256").update(buffer).digest("hex"),kind:path.extname(file),localImports:0};
  if(buffer.includes(0))issues.push({file,issue:"Unexpected binary candidate"});
  if(/^(<<<<<<< |=======\r?$|>>>>>>> )/m.test(source))issues.push({file,issue:"Conflict marker"});
  if(file.endsWith(".json"))try{JSON.parse(source);}catch{issues.push({file,issue:"Invalid JSON"});}
  if(/\.(?:[cm]?js|[cm]?ts|tsx|jsx)$/.test(file)){
    const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
    for(const diagnostic of ast.parseDiagnostics)issues.push({file,issue:ts.flattenDiagnosticMessageText(diagnostic.messageText," ")});
    const visit=node=>{
      if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier)){
        const specifier=node.moduleSpecifier.text;
        if((specifier.startsWith(".")||specifier.startsWith("@/"))&&!/\.(css|svg|png|jpg|webp)$/.test(specifier)){
          entry.localImports++;
          if(!ts.resolveModuleName(specifier,path.resolve(file),parsed.options,ts.sys).resolvedModule)issues.push({file,issue:`Unresolved local import: ${specifier}`});
        }
      }
      ts.forEachChild(node,visit);
    };visit(ast);
  }
  entries.push(entry);
}
const migrations=git("ls-files","--cached","--others","--exclude-standard","supabase/migrations").trim().split(/\r?\n/).filter(Boolean);
const versions=migrations.map(file=>path.basename(file).split("_")[0]);
if(new Set(versions).size!==versions.length)issues.push({issue:"Duplicate migration version"});
mkdirSync("qa-artifacts/release-audit",{recursive:true});
writeFileSync("qa-artifacts/release-audit/source-review.json",JSON.stringify({checkedAt:new Date().toISOString(),entries,issues},null,2));
console.log(`Reviewed ${entries.length} candidate file contents/deletions for syntax, local import resolution, JSON, unexpected binaries, conflict markers and duplicate migration versions. ${issues.length} issue(s).`);
for(const issue of issues)console.log(JSON.stringify(issue));
if(issues.length)process.exitCode=1;
