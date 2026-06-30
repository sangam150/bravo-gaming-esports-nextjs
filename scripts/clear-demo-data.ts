import { clearDemoData, getSupabaseAdminClient } from "./demo-data-lib";

async function run() {
  const summary = await clearDemoData(getSupabaseAdminClient(), {
    log: (message) => console.log(message),
  });

  console.log("Demo cleanup summary:");
  console.log(JSON.stringify(summary, null, 2));
}

run().catch((error) => {
  console.error("Failed to clear demo data.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
