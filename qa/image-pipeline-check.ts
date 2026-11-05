import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { prepareCanonicalPublicImageUpload } from "../lib/canonical-image-upload";
import { assetValueReferencesPublicAsset } from "../lib/public-asset-cleanup";
import { normalizeManagedPublicAssetKey } from "../lib/public-asset-key";
import { resolvePublicAssetUrl, resolveSponsorHeroUrl, resolveSponsorLogoUrl } from "../lib/public-asset-url";
import { getR2PublicBucketName, getR2PublicDeliveryMode } from "../lib/r2/client";
import { buildPublicFileUrl, getManagedPublicObjectKeyFromUrl, normalizeManagedPublicObjectKey } from "../lib/r2/storage";

function captureError(action: () => unknown) {
  try {
    action();
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
  throw new Error("Expected the operation to fail.");
}

async function main() {
  assert.equal(resolvePublicAssetUrl("teams/team-id/logo.webp"), "/api/uploads/r2?key=teams%2Fteam-id%2Flogo.webp");
  assert.equal(
    resolvePublicAssetUrl("demo/bravo_demo_seed_2026/teams/team-id/logo.webp"),
    "/api/uploads/r2?key=demo%2Fbravo_demo_seed_2026%2Fteams%2Fteam-id%2Flogo.webp",
  );
  assert.equal(
    resolvePublicAssetUrl("/api/uploads/r2?key=teams%252Fteam-id%252Flogo.webp"),
    "/api/uploads/r2?key=teams%2Fteam-id%2Flogo.webp",
  );
  assert.equal(
    resolvePublicAssetUrl("https://bravo-gaming-esports.vercel.app/api/uploads/r2?key=teams%252Fteam-id%252Flogo.webp"),
    "/api/uploads/r2?key=teams%2Fteam-id%2Flogo.webp",
  );
  assert.equal(resolvePublicAssetUrl("/images/brand/logo.svg"), "/images/brand/logo.svg");
  assert.equal(resolvePublicAssetUrl("/api/uploads/r2?key=unknown%2Fasset.png"), null);
  assert.equal(resolvePublicAssetUrl("moss/team-id/submission.zip"), null);
  assert.equal(resolvePublicAssetUrl("evidence/case-id/report.pdf"), null);
  assert.equal(resolvePublicAssetUrl("demo/bravo_demo_seed_2026/moss/team-id/submission.zip"), null);
  assert.equal(resolvePublicAssetUrl("demo/bravo_demo_seed_2026/evidence/case-id/report.pdf"), null);
  assert.equal(resolvePublicAssetUrl("javascript:alert(1)"), null);
  assert.equal(resolvePublicAssetUrl("https://attacker.invalid/logo.png"), null);
  assert.equal(resolvePublicAssetUrl("https://attacker.r2.dev/logo.png"), null);
  assert.equal(resolvePublicAssetUrl("https://user:credential@assets.bravogamingesports.com/logo.png"), null);
  assert.equal(resolvePublicAssetUrl("https://assets.bravogamingesports.com/logo.png?X-Amz-Signature=qa"), null);
  assert.equal(resolvePublicAssetUrl("https://hldppfhtkfgthainismr.supabase.co/storage/v1/object/sign/private/file.png?token=qa"), null);
  assert.equal(
    resolvePublicAssetUrl("https://hldppfhtkfgthainismr.supabase.co/storage/v1/object/public/assets/team.png"),
    "https://hldppfhtkfgthainismr.supabase.co/storage/v1/object/public/assets/team.png",
  );
  assert.equal(normalizeManagedPublicAssetKey("players/player-id/avatar.webp"), "players/player-id/avatar.webp");
  assert.equal(
    normalizeManagedPublicAssetKey("demo/bravo_demo_seed_2026/events/event-id/banner.webp"),
    "demo/bravo_demo_seed_2026/events/event-id/banner.webp",
  );
  assert.equal(normalizeManagedPublicAssetKey("moss/team-id/submission.zip"), null);
  assert.equal(normalizeManagedPublicAssetKey("demo/bravo_demo_seed_2026/evidence/case-id/report.pdf"), null);
  assert.equal(normalizeManagedPublicObjectKey("evidence/case-id/report.pdf"), null);
  assert.equal(getManagedPublicObjectKeyFromUrl("/api/uploads/r2?key=moss%2Fteam-id%2Fsubmission.zip"), null);
  assert.equal(
    getManagedPublicObjectKeyFromUrl("/api/uploads/r2?key=demo%2Fbravo_demo_seed_2026%2Fplayers%2Fplayer-id%2Favatar.webp"),
    "demo/bravo_demo_seed_2026/players/player-id/avatar.webp",
  );
  assert.match(captureError(() => buildPublicFileUrl("moss/team-id/submission.zip")).message, /Invalid managed public storage object key/);

  const sponsor = {
    bannerUrl: "/images/sponsors/banner.webp",
    designAssetUrl: "/images/sponsors/design.webp",
    logoUrl: "/images/sponsors/logo.webp",
  };
  assert.equal(resolveSponsorLogoUrl(sponsor), sponsor.logoUrl);
  assert.equal(resolveSponsorHeroUrl(sponsor), sponsor.bannerUrl);
  assert.equal(
    assetValueReferencesPublicAsset(
      { heroSlides: [{ imageUrl: "/api/uploads/r2?key=hero%2Fhome%2Fslide.webp" }] },
      "/api/uploads/r2?key=hero%2Fhome%2Fslide.webp",
      "hero/home/slide.webp",
    ),
    true,
  );
  assert.equal(
    assetValueReferencesPublicAsset(
      { heroSlides: [{ imageUrl: "/api/uploads/r2?key=hero%2Fhome%2Fother.webp" }] },
      "/api/uploads/r2?key=hero%2Fhome%2Fslide.webp",
      "hero/home/slide.webp",
    ),
    false,
  );
  assert.equal(
    assetValueReferencesPublicAsset(
      {
        source_metadata: {
          assets: {
            logo: { url: "/api/uploads/r2?key=teams%2Fteam-id%2Flogo.webp" },
          },
        },
      },
      "/api/uploads/r2?key=teams%2Fteam-id%2Flogo.webp",
      "teams/team-id/logo.webp",
    ),
    true,
  );

  const orientedJpeg = await sharp({
    create: {
      background: { b: 210, g: 90, r: 20 },
      channels: 3,
      height: 10,
      width: 20,
    },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();

  const priorEnvironment = {
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
    NEXT_PUBLIC_R2_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL,
    R2_PRIVATE_BUCKET_NAME: process.env.R2_PRIVATE_BUCKET_NAME,
    R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL,
    R2_PUBLIC_DELIVERY_MODE: process.env.R2_PUBLIC_DELIVERY_MODE,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  };
  Object.assign(process.env, {
    R2_ACCESS_KEY_ID: "test-access-key",
    R2_ACCOUNT_ID: "test-account",
    R2_BUCKET_NAME: "test-public",
    NEXT_PUBLIC_R2_PUBLIC_BASE_URL: "https://assets.bravogamingesports.com",
    R2_PRIVATE_BUCKET_NAME: "test-private",
    R2_PUBLIC_BASE_URL: "https://assets.bravogamingesports.com",
    R2_PUBLIC_DELIVERY_MODE: "direct",
    R2_SECRET_ACCESS_KEY: "test-secret-key",
  });
  assert.equal(getR2PublicDeliveryMode(), "direct");

  process.env.R2_PRIVATE_BUCKET_NAME = "test-public";
  const sharedBucketError = captureError(() => getR2PublicBucketName());
  assert.match(sharedBucketError.message, /public and private storage must use separate buckets/);
  assert.doesNotMatch(sharedBucketError.message, /test-public/);
  process.env.R2_PRIVATE_BUCKET_NAME = "test-private";

  delete process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL;
  assert.match(captureError(() => getR2PublicDeliveryMode()).message, /NEXT_PUBLIC_R2_PUBLIC_BASE_URL/);
  process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL = "https://other-assets.example.test";
  assert.match(captureError(() => getR2PublicDeliveryMode()).message, /must exactly match R2_PUBLIC_BASE_URL/);
  process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL = "https://assets.bravogamingesports.com";

  delete process.env.R2_PUBLIC_DELIVERY_MODE;
  assert.equal(getR2PublicDeliveryMode(), "proxy");
  process.env.R2_PUBLIC_DELIVERY_MODE = "direct";
  const now = new Date("2026-07-30T00:00:00.000Z");
  const first = await prepareCanonicalPublicImageUpload({
    buffer: orientedJpeg,
    declaredContentType: "image/jpeg",
    entityId: "00000000-0000-4000-8000-000000000001",
    fileName: "player.jpg",
    now,
    type: "player_avatar",
  });
  const second = await prepareCanonicalPublicImageUpload({
    buffer: orientedJpeg,
    declaredContentType: "image/jpeg",
    entityId: "00000000-0000-4000-8000-000000000001",
    fileName: "player.jpg",
    now,
    type: "player_avatar",
  });
  assert.equal(first.decoded.contentType, "image/webp");
  assert.equal(first.decoded.extension, "webp");
  assert.equal(first.metadata.contentHash, second.metadata.contentHash);
  assert.equal(first.objectKey, second.objectKey);
  const outputMetadata = await sharp(first.buffer).metadata();
  assert.equal(outputMetadata.orientation, undefined);
  assert.equal(outputMetadata.exif, undefined);
  assert.equal(outputMetadata.width, 10);
  assert.equal(outputMetadata.height, 20);

  for (const [key, value] of Object.entries(priorEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  const [
    managedImageSource,
    fileUploadSource,
    adminDashboardSource,
    publicProxySource,
    registrationLogoSource,
    teamLogoServiceSource,
    adoptionRouteSource,
    adoptionUiSource,
    playerAvatarRouteSource,
    stagedUploadRouteSource,
    publicAssetCleanupSource,
    publicAssetKeySource,
    r2ClientSource,
    environmentExampleSource,
    nextConfigSource,
    teamPlayerAvatarRouteSource,
    platformContentSource,
    platformCmsSource,
    dataSource,
    matchResultDetailSource,
    tournamentDetailSource,
  ] = await Promise.all([
    readFile(new URL("../components/ui/ManagedImage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/admin/FileUpload.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/admin/AdminDashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/uploads/r2/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/registrations/logo/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/team-logo-service.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/teams/[id]/logo/adopt/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/admin/BulkTeamLogoUpload.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/players/[id]/avatar/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/uploads/r2/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/public-asset-cleanup.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/public-asset-key.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/r2/client.ts", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
    readFile(new URL("../next.config.js", import.meta.url), "utf8"),
    readFile(new URL("../app/api/team/players/[playerId]/avatar/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/platform-content.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/platform-cms.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/data.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/results/MatchResultDetailClient.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/tournaments/TournamentDetailClient.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(managedImageSource, /onError=\{\(\) => setFailedSrc\(resolvedSrc\)\}/);
  assert.match(fileUploadSource, /adminDeleteTeamLogo/);
  assert.match(fileUploadSource, /adminDeleteStagedUpload/);
  assert.match(fileUploadSource, /Save this form to publish the change/);
  assert.match(adminDashboardSource, /src=\{r\.logoUrl\}[\s\S]*unoptimized/);
  assert.doesNotMatch(publicProxySource, /export async function POST/);
  assert.match(publicProxySource, /unsupported_public_asset_type/);
  assert.ok(
    registrationLogoSource.indexOf("deletePrivateObjectByKey(previousPath)") <
      registrationLogoSource.indexOf("deleteUploadRecord(previousUploadId)"),
  );
  assert.ok(teamLogoServiceSource.indexOf("deleteNewObject") < teamLogoServiceSource.indexOf("deleteUploadRecord"));
  assert.ok(
    teamLogoServiceSource.indexOf("await dependencies.verifyActivatedDelivery") <
      teamLogoServiceSource.indexOf("await dependencies.deletePreviousObject"),
    "The active delivery path must be verified before the previous asset can be deleted.",
  );
  assert.match(teamLogoServiceSource, /postActivationCleanupAllowed = rollbackConfirmed && !revalidationError/);
  assert.match(teamLogoServiceSource, /writeDeliveryFailureAudit/);
  assert.match(adoptionRouteSource, /sourceUpload\.relatedId !== team\.id/);
  assert.doesNotMatch(adoptionRouteSource, /matchTeamLogoFile|normalizeTeamLogoLabel/);
  assert.match(adoptionUiSource, /adminAdoptTeamLogo/);
  assert.match(adoptionUiSource, /Managed upload ID/);
  assert.match(playerAvatarRouteSource, /replaceCanonicalPlayerAvatarWithCas/);
  assert.match(playerAvatarRouteSource, /clearPhotoUrl: Boolean\(player\.photo_url\)/);
  assert.match(teamPlayerAvatarRouteSource, /clearPhotoUrl: Boolean\(playerRow\.photo_url\)/);
  assert.match(stagedUploadRouteSource, /export async function DELETE/);
  assert.match(stagedUploadRouteSource, /cleanupOneAbandonedAdminUpload/);
  assert.match(publicAssetCleanupSource, /findPublicAssetReference/);
  assert.match(publicAssetCleanupSource, /select\("id,logo_url,source_metadata"\)/);
  assert.match(publicAssetCleanupSource, /claimStagedAdminPublicAsset/);
  assert.match(publicAssetCleanupSource, /upload\.related_type !== "admin_upload"/);
  assert.match(publicAssetCleanupSource, /getUploadVisibility\(fileType\) !== "public"/);
  assert.match(publicAssetCleanupSource, /\.eq\("file_url", upload\.file_url\)/);
  assert.match(publicAssetCleanupSource, /\.range\(from, from \+ ABANDONED_ADMIN_UPLOAD_SCAN_PAGE_SIZE - 1\)/);
  assert.doesNotMatch(publicAssetCleanupSource, /\.limit\(25\)/);
  assert.match(publicAssetCleanupSource, /deletePublicObjectByKey\(objectKey\)[\s\S]*deleteUploadRecord\(upload\.id\)/);
  assert.match(platformContentSource, /relatedType: "homepage_content"/);
  assert.match(platformContentSource, /relatedType: "news_article"/);
  assert.match(platformCmsSource, /relatedType: "platform_event"/);
  assert.match(dataSource, /relatedType: "tournament"/);
  assert.match(dataSource, /relatedType: "match"/);
  assert.match(dataSource, /relatedType: "video"/);
  assert.match(dataSource, /relatedType: "sponsor"/);
  assert.match(publicAssetKeySource, /normalizePublicUploadFolder/);
  assert.match(publicAssetKeySource, /folder === "demo"/);
  assert.match(r2ClientSource, /public and private storage must use separate buckets/);
  assert.match(r2ClientSource, /NEXT_PUBLIC_R2_PUBLIC_BASE_URL must exactly match R2_PUBLIC_BASE_URL/);
  assert.match(environmentExampleSource, /NEXT_PUBLIC_R2_PUBLIC_BASE_URL=https:\/\/assets\.bravogamingesports\.com/);
  assert.match(environmentExampleSource, /R2_PUBLIC_DELIVERY_MODE=proxy/);
  assert.match(nextConfigSource, /configuredPublicImageRemotePattern/);
  assert.match(matchResultDetailSource, /resolvePublicAssetUrl/);
  assert.match(matchResultDetailSource, /<ManagedImage/);
  assert.doesNotMatch(matchResultDetailSource, /from "next\/image"/);
  assert.doesNotMatch(matchResultDetailSource, /src=\{activeMatch\.(?:resultImageUrl|scoreboardImageUrl|resultScreenshotUrl)\}/);
  assert.match(tournamentDetailSource, /const tournamentBannerUrl = resolvePublicAssetUrl\(activeTournament\.bannerUrl\)/);
  assert.match(tournamentDetailSource, /<ManagedImage/);
  assert.doesNotMatch(tournamentDetailSource, /backgroundImage:/);

  console.log("Canonical image resolver, normalization, activation, proxy, cleanup, and adoption QA passed.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
