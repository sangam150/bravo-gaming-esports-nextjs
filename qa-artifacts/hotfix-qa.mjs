import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const cwd = process.cwd();
const artifactPath = path.join(cwd, "qa-artifacts", "hotfix-qa-summary.json");
fs.mkdirSync(path.dirname(artifactPath), { recursive: true });

function loadEnv(filePath) {
  const env = {};
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index <= 0) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^"|"$/g, "");
    env[key] = value;
  }
  return env;
}

const env = loadEnv(path.join(cwd, ".env.local"));
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secretKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const baseUrl = "http://127.0.0.1:3100";
const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const slotBase = Number(stamp.slice(-6));
const password = `BravoQA!${stamp}`;
const now = new Date();
const today = now.toISOString().slice(0, 10);
const futureIso = new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString();

const service = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function createPublicClient(accessToken) {
  const options = {
    auth: { persistSession: false, autoRefreshToken: false },
  };
  if (accessToken) {
    options.global = { headers: { Authorization: `Bearer ${accessToken}` } };
  }
  return createClient(supabaseUrl, publishableKey, options);
}

const summary = {
  generatedAt: new Date().toISOString(),
  routeQa: [],
  authQa: [],
  resultEntryQa: [],
  newsQa: [],
  securityQa: [],
  notes: [],
  created: {},
  cleanup: [],
  overallFailures: 0,
};

const cleanupState = {
  authUserIds: [],
  teamIds: [],
  playerIds: [],
  profileIds: [],
  eventId: null,
  seasonId: null,
  matchId: null,
  newsDocIds: [],
  uploadRecords: [],
  uploadPaths: [],
};

function writeSummary() {
  fs.writeFileSync(artifactPath, JSON.stringify(summary, null, 2));
}

function formatError(error) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String(error.message);
  return String(error);
}

function record(section, name, status, details) {
  summary[section].push({ name, status, details });
  if (status === "fail") {
    summary.overallFailures += 1;
  }
  writeSummary();
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(pathname, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.cookie) headers.set("cookie", options.cookie);
  if (options.jsonBody !== undefined) {
    headers.set("content-type", "application/json");
  }
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: options.method || (options.jsonBody !== undefined ? "POST" : "GET"),
    headers,
    body: options.formData || (options.jsonBody !== undefined ? JSON.stringify(options.jsonBody) : options.body),
    redirect: options.redirect || "manual",
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  const setCookie = response.headers.get("set-cookie") || "";
  const cookieMatch = setCookie.match(/bravo_session=[^;]+/);
  return {
    response,
    status: response.status,
    text,
    json,
    cookie: cookieMatch ? cookieMatch[0] : null,
    headers: response.headers,
  };
}

async function signInAndCreateCookie(email) {
  const client = createPublicClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const accessToken = data.session?.access_token;
  assert(accessToken, `No access token for ${email}`);
  const sessionResponse = await request("/api/auth/session", {
    method: "POST",
    jsonBody: { accessToken },
  });
  assert(sessionResponse.status === 200, `Session bootstrap failed for ${email}: ${sessionResponse.text}`);
  assert(sessionResponse.cookie, `Session cookie missing for ${email}`);
  return { accessToken, cookie: sessionResponse.cookie, session: sessionResponse.json?.user ?? null };
}

function containsVisibleError(body) {
  return /Application error|Internal Server Error|Unhandled Runtime Error|This page could not be found/i.test(body);
}

async function verifyPage(pathname, label, section, expectedStatus = 200) {
  try {
    const result = await request(pathname);
    assert(result.status === expectedStatus, `${pathname} returned HTTP ${result.status}`);
    assert(!containsVisibleError(result.text), `${pathname} rendered an error state`);
    record(section, label, "pass", `HTTP ${result.status}`);
    return result;
  } catch (error) {
    record(section, label, "fail", formatError(error));
    return null;
  }
}

function isPublicManagedNewsArticle(article) {
  if (!article || article.deletedAt) return false;
  if (article.state === "published") return true;
  if (article.state === "scheduled") {
    const publishAt = article.publishAt ? Date.parse(article.publishAt) : Number.NaN;
    return Number.isFinite(publishAt) && publishAt <= Date.now();
  }
  return false;
}

async function cleanupQaData() {
  try {
    if (cleanupState.uploadPaths.length > 0) {
      const removeResult = await service.storage.from("team-logos").remove(cleanupState.uploadPaths);
      record(
        "securityQa",
        "Cleanup uploaded team logos",
        !removeResult.error ? "pass" : "fail",
        removeResult.error ? formatError(removeResult.error) : `${cleanupState.uploadPaths.length} removed`
      );
    }
  } catch (error) {
    record("securityQa", "Cleanup uploaded team logos", "fail", formatError(error));
  }

  try {
    if (cleanupState.uploadRecords.length > 0) {
      const deleteUploads = await service.from("uploads").delete().in("id", cleanupState.uploadRecords);
      record(
        "securityQa",
        "Cleanup upload records",
        !deleteUploads.error ? "pass" : "fail",
        deleteUploads.error ? formatError(deleteUploads.error) : `${cleanupState.uploadRecords.length} removed`
      );
    }
  } catch (error) {
    record("securityQa", "Cleanup upload records", "fail", formatError(error));
  }

  try {
    if (cleanupState.newsDocIds.length > 0) {
      const deleteNews = await service
        .from("app_documents")
        .delete()
        .eq("collection_name", "newsArticles")
        .in("id", cleanupState.newsDocIds);
      record(
        "newsQa",
        "Cleanup QA news docs",
        !deleteNews.error ? "pass" : "fail",
        deleteNews.error ? formatError(deleteNews.error) : `${cleanupState.newsDocIds.length} removed`
      );
    }
  } catch (error) {
    record("newsQa", "Cleanup QA news docs", "fail", formatError(error));
  }

  try {
    if (cleanupState.eventId) {
      const eventCleanup = await service
        .from("events")
        .update({
          deleted_at: new Date().toISOString(),
          published: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", cleanupState.eventId);
      if (eventCleanup.error) {
        throw eventCleanup.error;
      }
      record("resultEntryQa", "Cleanup QA event", "pass", cleanupState.eventId);
    }
  } catch (error) {
    record("resultEntryQa", "Cleanup QA event", "fail", formatError(error));
  }

  try {
    if (cleanupState.seasonId) {
      const seasonCleanup = await service
        .from("seasons")
        .update({
          status: "archived",
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          notes: "QA hotfix data archived after verification.",
        })
        .eq("id", cleanupState.seasonId);
      if (seasonCleanup.error) {
        throw seasonCleanup.error;
      }
      record("resultEntryQa", "Cleanup QA season", "pass", cleanupState.seasonId);
    }
  } catch (error) {
    record("resultEntryQa", "Cleanup QA season", "fail", formatError(error));
  }

  try {
    if (cleanupState.playerIds.length > 0) {
      const playerCleanup = await service
        .from("players")
        .update({ deleted_at: new Date().toISOString(), is_active: false })
        .in("id", cleanupState.playerIds);
      record(
        "resultEntryQa",
        "Cleanup QA players",
        !playerCleanup.error ? "pass" : "fail",
        playerCleanup.error ? formatError(playerCleanup.error) : `${cleanupState.playerIds.length} updated`
      );
    }
  } catch (error) {
    record("resultEntryQa", "Cleanup QA players", "fail", formatError(error));
  }

  try {
    if (cleanupState.teamIds.length > 0) {
      const teamCleanup = await service
        .from("teams")
        .update({ deleted_at: new Date().toISOString(), is_active: false, status: "archived" })
        .in("id", cleanupState.teamIds);
      record(
        "resultEntryQa",
        "Cleanup QA teams",
        !teamCleanup.error ? "pass" : "fail",
        teamCleanup.error ? formatError(teamCleanup.error) : `${cleanupState.teamIds.length} updated`
      );
    }
  } catch (error) {
    record("resultEntryQa", "Cleanup QA teams", "fail", formatError(error));
  }

  try {
    if (cleanupState.authUserIds.length > 0) {
      for (const userId of cleanupState.authUserIds) {
        const deletion = await service.auth.admin.deleteUser(userId);
        if (deletion.error) throw deletion.error;
      }
      record("authQa", "Cleanup QA auth users", "pass", `${cleanupState.authUserIds.length} removed`);
    }
  } catch (error) {
    record("authQa", "Cleanup QA auth users", "fail", formatError(error));
  }
}

async function main() {
  let publishedNewsSlug = null;
  let qaTeamA = null;
  let qaTeamB = null;
  let trapTeam = null;
  let qaPlayer = null;
  let previewData = null;
  let adminAuth = null;
  let teamAuth = null;
  let playerAuth = null;
  let viewerAuth = null;
  let event = null;
  let season = null;

  try {
    const { data: newsRows, error: newsError } = await service
      .from("app_documents")
      .select("id,data,updated_at")
      .eq("collection_name", "newsArticles")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (newsError) throw newsError;
    const publishedNews = (newsRows || [])
      .map((row) => row.data)
      .filter((row) => row && typeof row === "object" && isPublicManagedNewsArticle(row))
      .filter((row) => typeof row.slug === "string");
    publishedNewsSlug = publishedNews[0]?.slug ?? null;
    if (!publishedNewsSlug) {
      summary.notes.push("No real published news article was available for detail-page SEO verification.");
      writeSummary();
    }

    qaTeamA = {
      id: crypto.randomUUID(),
      name: `QA Hotfix Alpha ${stamp}`,
      slug: `qa-hotfix-alpha-${stamp}`,
      slot_number: slotBase + 1,
      region: "Nepal",
      is_active: true,
      status: "active",
    };
    qaTeamB = {
      id: crypto.randomUUID(),
      name: `QA Hotfix Bravo ${stamp}`,
      slug: `qa-hotfix-bravo-${stamp}`,
      slot_number: slotBase + 2,
      region: "Nepal",
      is_active: true,
      status: "active",
    };
    trapTeam = {
      id: crypto.randomUUID(),
      name: `QA Trap Slot ${stamp}`,
      slug: `qa-trap-slot-${stamp}`,
      slot_number: slotBase + 77,
      region: "Nepal",
      is_active: true,
      status: "active",
    };

    let result = await service.from("teams").insert([qaTeamA, qaTeamB, trapTeam]).select("id,name,slug");
    if (result.error) throw result.error;
    cleanupState.teamIds.push(qaTeamA.id, qaTeamB.id, trapTeam.id);

    qaPlayer = {
      id: crypto.randomUUID(),
      pubg_account_id: `qa-hotfix-${stamp}`,
      pubg_name: `QAPlayer${stamp}`,
      display_name: `QA Player ${stamp}`,
      current_team_id: qaTeamA.id,
      is_active: true,
      slug: `qa-player-${stamp}`,
    };
    const teamBPlayer = {
      id: crypto.randomUUID(),
      pubg_account_id: `qa-hotfix-b-${stamp}`,
      pubg_name: `QABravo${stamp}`,
      display_name: `QA Bravo ${stamp}`,
      current_team_id: qaTeamB.id,
      is_active: true,
      slug: `qa-bravo-${stamp}`,
    };
    result = await service.from("players").insert([qaPlayer, teamBPlayer]).select("id");
    if (result.error) throw result.error;
    cleanupState.playerIds.push(qaPlayer.id, teamBPlayer.id);

    const seasonId = crypto.randomUUID();
    const seasonInsert = await service
      .from("seasons")
      .insert({
        id: seasonId,
        name: `QA HOTFIX Season ${stamp}`,
        slug: `qa-hotfix-season-${stamp}`,
        series_title: `QA HOTFIX Season ${stamp}`,
        season_number: 1,
        status: "planned",
        start_date: today,
        end_date: null,
        current_day_number: 0,
        configured_days: 1,
        current_event_id: null,
        completed_at: null,
        archived_at: null,
        ended_early: false,
        notes: "QA-only launch hotfix verification. Delete after review.",
        description: "Temporary QA season for launch hotfix verification.",
        game: "PUBG PC",
        format: "Squad",
        region: "Nepal",
        perspective: "TPP",
        type: "scrims",
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .select("*")
      .single();
    if (seasonInsert.error) throw seasonInsert.error;
    season = {
      id: seasonInsert.data.id,
      slug: seasonInsert.data.slug,
      title: seasonInsert.data.name,
    };
    cleanupState.seasonId = season.id;

    const pointSystemQuery = await service
      .from("point_systems")
      .select("id,name,active")
      .eq("active", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(5);
    if (pointSystemQuery.error) throw pointSystemQuery.error;
    const pointSystem = (pointSystemQuery.data || [])[0];
    assert(pointSystem?.id, "No point system available for result-entry QA.");

    const eventId = crypto.randomUUID();
    const eventInsert = await service
      .from("events")
      .insert({
        id: eventId,
        season_id: season.id,
        title: `QA HOTFIX Event ${stamp}`,
        name: `QA HOTFIX Event ${stamp}`,
        slug: `qa-hotfix-event-${stamp}`,
        event_type: "tournament",
        type: "tournament",
        game: "PUBG PC",
        mode: "Squad",
        perspective: "TPP",
        status: "draft",
        description: "Temporary QA event for hotfix verification. Delete after review.",
        banner_url: null,
        start_date: now.toISOString(),
        end_date: null,
        region: "Nepal",
        tier: "OPEN",
        competition_status: "UPCOMING",
        prize_pool: "QA ONLY",
        rules: "QA-only event. Delete after verification.",
        server: "AP-SINGAPORE",
        schedule: "Single QA lobby",
        map_rotation: [],
        max_teams: 16,
        team_count: 2,
        season_day_number: null,
        match_count: 0,
        source_url: "https://example.com/qa-hotfix",
        point_system_id: pointSystem.id,
        published: true,
        published_at: now.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        deleted_at: null,
      })
      .select("*")
      .single();
    if (eventInsert.error) throw eventInsert.error;
    const eventTeamsInsert = await service.from("event_teams").insert([
      { event_id: eventId, team_id: qaTeamA.id, slot_number: 1, status: "registered" },
      { event_id: eventId, team_id: qaTeamB.id, slot_number: 2, status: "registered" },
    ]);
    if (eventTeamsInsert.error) throw eventTeamsInsert.error;
    event = {
      id: eventInsert.data.id,
      slug: eventInsert.data.slug,
      title: eventInsert.data.title,
      name: eventInsert.data.name,
    };
    cleanupState.eventId = event.id;

    const users = [
      {
        role: "admin",
        email: `qa-hotfix-admin-${stamp}@example.com`,
        app_metadata: { role: "admin", displayName: `QA Admin ${stamp}` },
        user_metadata: { display_name: `QA Admin ${stamp}` },
        profile: null,
      },
      {
        role: "team_igl",
        email: `qa-hotfix-team-${stamp}@example.com`,
        app_metadata: { role: "team_igl", teamId: qaTeamA.id, displayName: `QA Team ${stamp}` },
        user_metadata: { display_name: `QA Team ${stamp}` },
        profile: null,
      },
      {
        role: "player",
        email: `qa-hotfix-player-${stamp}@example.com`,
        app_metadata: { role: "player", playerId: qaPlayer.id, displayName: `QA Player ${stamp}` },
        user_metadata: { display_name: `QA Player ${stamp}` },
        profile: null,
      },
      {
        role: "viewer",
        email: `qa-hotfix-viewer-${stamp}@example.com`,
        app_metadata: { role: "viewer", displayName: `QA Viewer ${stamp}` },
        user_metadata: { display_name: `QA Viewer ${stamp}` },
        profile: null,
      },
    ];

    for (const user of users) {
      const { data, error } = await service.auth.admin.createUser({
        email: user.email,
        password,
        email_confirm: true,
        app_metadata: user.app_metadata,
        user_metadata: user.user_metadata,
      });
      if (error) throw error;
      const authUser = data.user;
      assert(authUser?.id, `Auth user creation failed for ${user.email}`);
      cleanupState.authUserIds.push(authUser.id);
    }

    adminAuth = await signInAndCreateCookie(users[0].email);
    teamAuth = await signInAndCreateCookie(users[1].email);
    playerAuth = await signInAndCreateCookie(users[2].email);
    viewerAuth = await signInAndCreateCookie(users[3].email);

    summary.created = {
      season: { id: season.id, slug: season.slug, title: season.title },
      event: { id: event.id, slug: event.slug, name: event.title || event.name },
      teams: [qaTeamA.name, qaTeamB.name, trapTeam.name],
      player: qaPlayer.display_name,
      publishedNewsSlug,
    };
    writeSummary();

    const staticRoutes = [
      ["/", "Homepage"],
      ["/stats", "Stats"],
      ["/pubg", "PUBG"],
      ["/pubg/community", "PUBG Community"],
      ["/pubg/leaderboards", "PUBG Leaderboards"],
      ["/events", "Events"],
      ["/media", "Media"],
      ["/news", "News"],
      ["/sponsors", "Sponsors"],
      ["/about", "About"],
      ["/contact", "Contact"],
      ["/privacy", "Privacy"],
      ["/terms", "Terms"],
      [`/pubg/teams/${qaTeamA.slug}`, "PUBG Team Detail"],
      [`/pubg/players/${qaPlayer.slug}`, "PUBG Player Detail"],
      [`/pubg/seasons/${season.slug}`, "PUBG Season Detail"],
    ];
    if (publishedNewsSlug) {
      staticRoutes.push([`/news/${publishedNewsSlug}`, "News Detail"]);
    }
    for (const [pathname, label] of staticRoutes) {
      await verifyPage(pathname, label, "routeQa");
    }

    const anonMe = await request("/api/auth/me");
    record("authQa", "Anonymous auth check", anonMe.status === 401 ? "pass" : "fail", `HTTP ${anonMe.status}`);

    const adminMe = await request("/api/auth/me", { cookie: adminAuth.cookie });
    record(
      "authQa",
      "Admin login session",
      adminMe.status === 200 && adminMe.json?.user?.role === "admin" ? "pass" : "fail",
      `HTTP ${adminMe.status}`
    );

    const teamWorkspace = await request("/api/team", { cookie: teamAuth.cookie });
    record(
      "authQa",
      "Team login workspace access",
      teamWorkspace.status === 200 ? "pass" : "fail",
      `HTTP ${teamWorkspace.status}`
    );

    const playerPage = await request("/dashboard/player", { cookie: playerAuth.cookie });
    record(
      "authQa",
      "Player login dashboard access",
      playerPage.status === 200 && !containsVisibleError(playerPage.text) ? "pass" : "fail",
      `HTTP ${playerPage.status}`
    );

    const sessionRepeat = await request("/api/auth/me", { cookie: adminAuth.cookie });
    record("authQa", "Session persistence", sessionRepeat.status === 200 ? "pass" : "fail", `HTTP ${sessionRepeat.status}`);

    const teamAdminDenied = await request("/api/admin/audit-logs", { cookie: teamAuth.cookie });
    record(
      "authQa",
      "Wrong-role admin denial",
      teamAdminDenied.status === 403 ? "pass" : "fail",
      `HTTP ${teamAdminDenied.status}`
    );

    const playerTeamDenied = await request("/api/team", { cookie: playerAuth.cookie });
    record(
      "authQa",
      "Wrong-role team denial",
      playerTeamDenied.status === 403 ? "pass" : "fail",
      `HTTP ${playerTeamDenied.status}`
    );

    const adminProtected = await request("/api/admin/audit-logs?limit=5", { cookie: adminAuth.cookie });
    record("authQa", "Protected admin API", adminProtected.status === 200 ? "pass" : "fail", `HTTP ${adminProtected.status}`);

    const logoutResponse = await request("/api/auth/session", { method: "DELETE", cookie: adminAuth.cookie });
    const clearedCookie = logoutResponse.cookie || "bravo_session=;";
    const afterLogout = await request("/api/auth/me", { cookie: clearedCookie });
    record("authQa", "Logout clears session", afterLogout.status === 401 ? "pass" : "fail", `HTTP ${afterLogout.status}`);

    const draftArticle = {
      collection_name: "newsArticles",
      id: `qa-hotfix-draft-${stamp}`,
      data: {
        title: `QA HOTFIX Draft ${stamp}`,
        slug: `qa-hotfix-draft-${stamp}`,
        summary: "Draft QA article that must stay private.",
        excerpt: "Draft QA article that must stay private.",
        body: ["Draft QA article that must stay private."],
        date: now.toISOString(),
        category: "QA",
        tags: ["qa", "hotfix"],
        authorName: "QA Automation",
        state: "draft",
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    };
    const scheduledArticle = {
      collection_name: "newsArticles",
      id: `qa-hotfix-scheduled-${stamp}`,
      data: {
        title: `QA HOTFIX Scheduled ${stamp}`,
        slug: `qa-hotfix-scheduled-${stamp}`,
        summary: "Scheduled QA article that must stay private.",
        excerpt: "Scheduled QA article that must stay private.",
        body: ["Scheduled QA article that must stay private."],
        date: futureIso,
        category: "QA",
        tags: ["qa", "hotfix"],
        authorName: "QA Automation",
        state: "scheduled",
        publishAt: futureIso,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    };
    const newsInsert = await service.from("app_documents").upsert([draftArticle, scheduledArticle]);
    if (newsInsert.error) throw newsInsert.error;
    cleanupState.newsDocIds.push(draftArticle.id, scheduledArticle.id);

    const anonDocumentClient = createPublicClient();
    const anonDraftQuery = await anonDocumentClient
      .from("app_documents")
      .select("id")
      .eq("collection_name", "newsArticles")
      .in("id", [draftArticle.id, scheduledArticle.id]);
    record(
      "newsQa",
      "Anonymous news document query",
      !anonDraftQuery.error && (anonDraftQuery.data || []).length === 0 ? "pass" : "fail",
      anonDraftQuery.error ? formatError(anonDraftQuery.error) : `${(anonDraftQuery.data || []).length} rows returned`
    );

    const newsIndex = await request("/news");
    const noLeakInIndex =
      newsIndex.status === 200 &&
      !newsIndex.text.includes(draftArticle.data.slug) &&
      !newsIndex.text.includes(scheduledArticle.data.slug);
    record(
      "newsQa",
      "Public news index hides draft and scheduled",
      noLeakInIndex ? "pass" : "fail",
      `HTTP ${newsIndex.status}`
    );

    const draftRoute = await request(`/news/${draftArticle.data.slug}`);
    record("newsQa", "Draft news route returns 404", draftRoute.status === 404 ? "pass" : "fail", `HTTP ${draftRoute.status}`);

    const scheduledRoute = await request(`/news/${scheduledArticle.data.slug}`);
    record(
      "newsQa",
      "Scheduled news route returns 404",
      scheduledRoute.status === 404 ? "pass" : "fail",
      `HTTP ${scheduledRoute.status}`
    );

    if (publishedNewsSlug) {
      const publishedRoute = await request(`/news/${publishedNewsSlug}`);
      const articleSeoOk =
        publishedRoute.status === 200 &&
        /"@type":"Article"/.test(publishedRoute.text) &&
        /"@type":"BreadcrumbList"/.test(publishedRoute.text) &&
        /rel="canonical"/.test(publishedRoute.text);
      record(
        "newsQa",
        "Published news detail SEO metadata",
        articleSeoOk ? "pass" : "fail",
        `HTTP ${publishedRoute.status}`
      );
    } else {
      record(
        "newsQa",
        "Published news detail SEO metadata",
        "skip",
        "No real published news article was available for this verification."
      );
    }

    const sitemap = await request("/sitemap.xml");
    const sitemapOk =
      sitemap.status === 200 &&
      !sitemap.text.includes(draftArticle.data.slug) &&
      !sitemap.text.includes(scheduledArticle.data.slug);
    const sitemapPublishedOk = publishedNewsSlug ? sitemap.text.includes(`/news/${publishedNewsSlug}`) : true;
    record(
      "newsQa",
      "Sitemap publishes only public news",
      sitemapOk && sitemapPublishedOk ? "pass" : "fail",
      `HTTP ${sitemap.status}`
    );

    for (const [label, token] of Object.entries({
      anon: null,
      authenticated: viewerAuth.accessToken,
      admin: adminAuth.accessToken,
      team: teamAuth.accessToken,
      player: playerAuth.accessToken,
    })) {
      const client = createPublicClient(token);
      const profileQuery = await client.from("profiles").select("id,email,role").limit(1);
      record(
        "securityQa",
        `Profiles RLS query (${label})`,
        !profileQuery.error ? "pass" : "fail",
        profileQuery.error ? formatError(profileQuery.error) : `${(profileQuery.data || []).length} rows`
      );
    }

    const uploadCases = [
      { label: "PNG upload", fileName: `qa-${stamp}.png`, type: "image/png", size: 256, expectedStatus: 200 },
      { label: "JPG upload", fileName: `qa-${stamp}.jpg`, type: "image/jpeg", size: 256, expectedStatus: 200 },
      { label: "WEBP upload", fileName: `qa-${stamp}.webp`, type: "image/webp", size: 256, expectedStatus: 200 },
      { label: "TXT rejected", fileName: `qa-${stamp}.txt`, type: "text/plain", size: 64, expectedStatus: 400 },
      { label: "EXE rejected", fileName: `qa-${stamp}.exe`, type: "application/octet-stream", size: 64, expectedStatus: 400 },
      { label: "Oversized PNG rejected", fileName: `qa-${stamp}-big.png`, type: "image/png", size: 5 * 1024 * 1024 + 1, expectedStatus: 400 },
    ];

    for (const uploadCase of uploadCases) {
      const formData = new FormData();
      const buffer = Buffer.alloc(uploadCase.size, uploadCase.expectedStatus === 200 ? 1 : 2);
      formData.append("type", "team_logo");
      formData.append("file", new Blob([buffer], { type: uploadCase.type }), uploadCase.fileName);
      const uploadResponse = await request("/api/team/upload", {
        method: "POST",
        cookie: teamAuth.cookie,
        formData,
      });
      const passed = uploadResponse.status === uploadCase.expectedStatus;
      record("securityQa", uploadCase.label, passed ? "pass" : "fail", `HTTP ${uploadResponse.status}`);
      if (uploadResponse.status === 200 && uploadResponse.json?.path && uploadResponse.json?.id) {
        cleanupState.uploadPaths.push(uploadResponse.json.path);
        cleanupState.uploadRecords.push(uploadResponse.json.id);
      }
    }

    previewData = await request("/api/admin/matches/preview", {
      method: "POST",
      cookie: adminAuth.cookie,
      jsonBody: {
        tournamentId: event.id,
        pointSystemId: pointSystem.id,
        status: "draft",
        map: "Erangel",
        matchNumber: 1,
        playedAt: now.toISOString(),
        pubgMatchId: "",
        teamResults: [
          { teamId: qaTeamA.id, teamName: qaTeamA.name, slotNumber: 1, placement: 1, kills: 12, damage: 2200, placementPoints: 0, killPoints: 0, totalPoints: 0 },
          { teamId: qaTeamB.id, teamName: qaTeamB.name, slotNumber: 2, placement: 2, kills: 6, damage: 1500, placementPoints: 0, killPoints: 0, totalPoints: 0 },
          { teamName: `QA Alias ${stamp}`, slotNumber: slotBase + 77, placement: 3, kills: 4, damage: 900, placementPoints: 0, killPoints: 0, totalPoints: 0 },
        ],
        playerResults: [
          { playerId: qaPlayer.id, playerName: qaPlayer.pubg_name, pubgPlayerId: qaPlayer.pubg_account_id, teamId: qaTeamA.id, teamName: qaTeamA.name, slotNumber: 1, placement: 1, kills: 7, assists: 2, knocks: 3, damage: 1200, survivalTime: 1800, placementPoints: 0, totalPoints: 0 },
          { playerId: cleanupState.playerIds[1], playerName: `QABravo${stamp}`, pubgPlayerId: `qa-hotfix-b-${stamp}`, teamId: qaTeamB.id, teamName: qaTeamB.name, slotNumber: 2, placement: 2, kills: 3, assists: 1, knocks: 2, damage: 800, survivalTime: 1700, placementPoints: 0, totalPoints: 0 },
        ],
      },
    });
    record(
      "resultEntryQa",
      "Preview points",
      previewData.status === 200 && (previewData.json?.data?.teamResults?.length || 0) >= 2 ? "pass" : "fail",
      `HTTP ${previewData.status}`
    );

    const draftMatchResponse = await request("/api/admin/matches", {
      method: "POST",
      cookie: adminAuth.cookie,
      jsonBody: {
        tournamentId: event.id,
        pointSystemId: pointSystem.id,
        status: "draft",
        map: "Erangel",
        matchNumber: 1,
        playedAt: now.toISOString(),
        pubgMatchId: "",
        teamResults: previewData.json?.data?.teamResults,
        playerResults: previewData.json?.data?.playerResults,
      },
    });
    const draftMatchId = draftMatchResponse.json?.data?.id;
    cleanupState.matchId = draftMatchId || null;
    record(
      "resultEntryQa",
      "Create draft match without PUBG Match ID",
      draftMatchResponse.status === 200 && draftMatchId ? "pass" : "fail",
      `HTTP ${draftMatchResponse.status}`
    );

    const prePublishMatch = await request(`/pubg/matches/${draftMatchId}`);
    record("resultEntryQa", "Unpublished match hidden", prePublishMatch.status === 404 ? "pass" : "fail", `HTTP ${prePublishMatch.status}`);

    const prePublishBoard = await request(`/pubg/leaderboards?event=${event.slug}`);
    const leaderboardHidden = prePublishBoard.status === 200 && !prePublishBoard.text.includes(qaTeamA.name);
    record(
      "resultEntryQa",
      "Unpublished leaderboard hidden",
      leaderboardHidden ? "pass" : "fail",
      `HTTP ${prePublishBoard.status}`
    );

    const publishResponse = await request("/api/admin/matches", {
      method: "PUT",
      cookie: adminAuth.cookie,
      jsonBody: { id: draftMatchId, action: "publish" },
    });
    record(
      "resultEntryQa",
      "Publish match",
      publishResponse.status === 200 && publishResponse.json?.data?.status === "published" ? "pass" : "fail",
      `HTTP ${publishResponse.status}`
    );

    const publicMatch = await request(`/pubg/matches/${draftMatchId}`);
    record("routeQa", "PUBG Match Detail", publicMatch.status === 200 ? "pass" : "fail", `HTTP ${publicMatch.status}`);

    const leaderboardVisible = await request(`/pubg/leaderboards?event=${event.slug}`);
    const visibleNow = leaderboardVisible.status === 200 && leaderboardVisible.text.includes(qaTeamA.name);
    record(
      "resultEntryQa",
      "Published leaderboard update",
      visibleNow ? "pass" : "fail",
      `HTTP ${leaderboardVisible.status}`
    );

    const aliasRowQuery = await service
      .from("match_team_results")
      .select("team_id,team_name")
      .eq("match_id", draftMatchId)
      .eq("team_name", `QA Alias ${stamp}`)
      .maybeSingle();
    const aliasSafe = !aliasRowQuery.error && aliasRowQuery.data?.team_id !== trapTeam.id;
    record(
      "securityQa",
      "Team mapping avoids global slot fallback",
      aliasSafe ? "pass" : "fail",
      aliasRowQuery.error ? formatError(aliasRowQuery.error) : `Resolved team_id=${aliasRowQuery.data?.team_id ?? "null"}`
    );
    if (aliasRowQuery.data?.team_id && !cleanupState.teamIds.includes(aliasRowQuery.data.team_id)) {
      cleanupState.teamIds.push(aliasRowQuery.data.team_id);
    }

    const recalcResponse = await request("/api/admin/matches", {
      method: "PUT",
      cookie: adminAuth.cookie,
      jsonBody: { id: draftMatchId, action: "recalculate" },
    });
    record("resultEntryQa", "Recalculate match", recalcResponse.status === 200 ? "pass" : "fail", `HTTP ${recalcResponse.status}`);

    const unpublishResponse = await request("/api/admin/matches", {
      method: "PUT",
      cookie: adminAuth.cookie,
      jsonBody: { id: draftMatchId, action: "unpublish" },
    });
    record("resultEntryQa", "Unpublish match", unpublishResponse.status === 200 ? "pass" : "fail", `HTTP ${unpublishResponse.status}`);

    const hiddenAgainMatch = await request(`/pubg/matches/${draftMatchId}`);
    record(
      "resultEntryQa",
      "Unpublished match re-hidden",
      hiddenAgainMatch.status === 404 ? "pass" : "fail",
      `HTTP ${hiddenAgainMatch.status}`
    );

    const hiddenAgainBoard = await request(`/pubg/leaderboards?event=${event.slug}`);
    record(
      "resultEntryQa",
      "Unpublished leaderboard removed",
      hiddenAgainBoard.status === 200 && !hiddenAgainBoard.text.includes(qaTeamA.name) ? "pass" : "fail",
      `HTTP ${hiddenAgainBoard.status}`
    );

    const rollbackResponse = await request("/api/admin/matches", {
      method: "PUT",
      cookie: adminAuth.cookie,
      jsonBody: { id: draftMatchId, action: "rollback" },
    });
    record(
      "resultEntryQa",
      "Rollback match",
      rollbackResponse.status === 200 && rollbackResponse.json?.data?.status === "published" ? "pass" : "fail",
      `HTTP ${rollbackResponse.status}`
    );

    const restoredMatch = await request(`/pubg/matches/${draftMatchId}`);
    record(
      "resultEntryQa",
      "Rollback restores public match",
      restoredMatch.status === 200 ? "pass" : "fail",
      `HTTP ${restoredMatch.status}`
    );

    const auditResponse = await request("/api/admin/audit-logs?limit=50", { cookie: adminAuth.cookie });
    const auditLogs = Array.isArray(auditResponse.json?.data) ? auditResponse.json.data : [];
    const auditActions = auditLogs.filter((entry) => entry.entity_id === draftMatchId).map((entry) => entry.action);
    const previewLogged = auditLogs.some(
      (entry) =>
        entry.action === "preview" &&
        entry.entity_type === "match" &&
        entry.new_data &&
        entry.new_data.tournamentId === event.id &&
        entry.new_data.matchNumber === 1
    );
    const auditOk =
      previewLogged &&
      ["create", "publish", "recalculate", "unpublish", "rollback"].every((action) => auditActions.includes(action));
    record(
      "resultEntryQa",
      "Audit logs recorded",
      auditOk ? "pass" : "fail",
      `preview=${previewLogged}; actions=${auditActions.join(", ")}`
    );

    const matchDelete = await request(`/api/admin/matches?id=${draftMatchId}`, { method: "DELETE", cookie: adminAuth.cookie });
    record("resultEntryQa", "Delete QA match", matchDelete.status === 200 ? "pass" : "fail", `HTTP ${matchDelete.status}`);
    cleanupState.matchId = null;
  } finally {
    await cleanupQaData();
  }

  writeSummary();
  console.log(JSON.stringify(summary, null, 2));
}

await main();
