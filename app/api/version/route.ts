export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? null,
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? null,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    },
  );
}
