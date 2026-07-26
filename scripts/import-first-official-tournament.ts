import { importFirstOfficialTournament } from "@/lib/official-tournament-import";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const result = await importFirstOfficialTournament();

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error("[import:first-tournament] failed");
  console.error(error);
  process.exitCode = 1;
});
