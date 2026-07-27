import {
  DEMO_MANIFEST_PATH,
  DEMO_SEED_TAG,
  DEMO_SOURCE,
  addDays,
  buildUuid,
  captureSingletonBackups,
  clearDemoData,
  formatDateOnly,
  getOptionalR2Config,
  getSupabaseAdminClient,
  slugify,
  uploadDemoSvgAsset,
  upsertAppDocuments,
  upsertRowsInChunks,
  writeDemoManifest,
  type DemoUploadedAsset,
} from "./demo-data-lib";

const ACTIVE_TEAMS = [
  ["M8", "M8"],
  ["Team HAKU", "HAKU"],
  ["N3P", "N3P"],
  ["FYB Esports", "FYB"],
  ["NPL", "NPL"],
  ["Bir Gorkhali", "BG"],
  ["Omega Tactix", "OTX"],
  ["KDS", "KDS"],
  ["Mandem Boys", "MDB"],
  ["Muji Verse", "MJV"],
  ["LTG", "LTG"],
  ["Sons of Nepal", "SONS"],
  ["The Lost MC Esports", "LMC"],
  ["69 Esports", "69ES"],
  ["Shikhar Ice", "SI"],
  ["Revive Me Bro", "RMB"],
  ["The Crew", "CREW"],
  ["ZENO", "ZENO"],
  ["TJR", "TJR"],
  ["Two Wheel Enjoyers", "TWE"],
] as const;

const PENDING_TEAMS = [
  ["Project Mirage", "PM"],
  ["Tundra Syndicate", "TS"],
  ["Velvet Recoil", "VR"],
] as const;

const PLAYER_HANDLES = [
  "Aero",
  "Blitz",
  "Cipher",
  "Drift",
  "Echo",
  "Falcon",
  "Frost",
  "Ghost",
  "Havoc",
  "Jinx",
  "Karma",
  "Lynx",
  "Mamba",
  "Nova",
  "Orion",
  "Phantom",
  "Quake",
  "Rogue",
  "Saber",
  "Talon",
  "Vanta",
  "Vex",
  "Warden",
  "Zephyr",
  "Axiom",
  "Banshee",
  "Crux",
  "Dagger",
  "Ember",
  "Flux",
  "Glitch",
  "Halo",
  "Iris",
  "Jolt",
  "Knox",
  "Ledger",
  "Mako",
  "Nyte",
  "Onyx",
  "Proxy",
  "Riot",
  "Shade",
  "Torque",
  "Umbra",
  "Volt",
  "Wrath",
  "Xyro",
  "Yoru",
  "Zen",
  "Astra",
  "Briar",
  "Cinder",
  "Dune",
  "Enzo",
  "Fable",
  "Grimm",
  "Hex",
  "Inferno",
  "Jade",
  "Kairo",
  "Locus",
  "Myth",
  "Nero",
  "Omen",
  "Pyro",
  "Quest",
  "Riven",
  "Stryke",
  "Tracer",
  "Ulric",
  "Viral",
  "Wraith",
  "Xeno",
  "Yami",
  "Zed",
  "Ashen",
  "Brisk",
  "Cross",
  "Dusk",
  "Elix",
  "Fury",
  "Grit",
  "Hush",
  "Ivory",
  "Jaeger",
  "Kilo",
  "Lux",
  "Mirth",
  "Nexus",
  "Orbit",
  "Pulse",
  "Raze",
] as const;

const PLACEMENT_POINTS: Record<number, number> = {
  1: 10,
  2: 6,
  3: 5,
  4: 4,
  5: 3,
  6: 2,
  7: 1,
  8: 1,
};

type DemoTeam = {
  id: string;
  name: string;
  slug: string;
  slotNumber: number;
  status: "active" | "pending";
  tag: string;
  logoUrl: string | null;
};

type DemoPlayer = {
  id: string;
  avatarUrl: string | null;
  currentTeamId: string;
  displayName: string;
  pubgAccountId: string;
  pubgName: string;
  slug: string;
};

type MatchBuildResult = {
  matchRow: Record<string, unknown>;
  playerRows: Record<string, unknown>[];
  teamRows: Record<string, unknown>[];
};

function buildTeamParticipants(teams: DemoTeam[], matchIndex: number) {
  const benchStart = (matchIndex * 4) % teams.length;
  const benchedTeamIds = new Set(Array.from({ length: 4 }, (_, offset) => teams[(benchStart + offset) % teams.length]?.id).filter(Boolean));

  return teams.filter((team) => !benchedTeamIds.has(team.id));
}

function rotateArray<T>(values: T[], offset: number) {
  if (values.length === 0) {
    return values;
  }

  const normalizedOffset = ((offset % values.length) + values.length) % values.length;
  return [...values.slice(normalizedOffset), ...values.slice(0, normalizedOffset)];
}

function buildMatchData(input: {
  allPlayers: DemoPlayer[];
  eventId: string;
  eventName: string;
  eventSlug: string;
  globalMatchIndex: number;
  mapName: string;
  matchId: string;
  matchNumber: number;
  playedAt: string;
  seasonId: string;
  dayId: string | null;
  status: "published" | "pending";
  teams: DemoTeam[];
}) {
  const playersByTeamId = new Map<string, DemoPlayer[]>();
  for (const player of input.allPlayers) {
    const currentValue = playersByTeamId.get(player.currentTeamId) ?? [];
    currentValue.push(player);
    playersByTeamId.set(player.currentTeamId, currentValue);
  }

  const participants = buildTeamParticipants(input.teams, input.globalMatchIndex).map((team, index) => {
    const strength = Math.max(42, 100 - team.slotNumber * 2 + index);
    const volatility = ((input.globalMatchIndex + 1) * 17 + team.slotNumber * 13) % 23;
    return {
      ...team,
      matchStrength: strength + volatility,
    };
  });

  const rankedTeams = [...participants].sort((firstTeam, secondTeam) => {
    if (secondTeam.matchStrength !== firstTeam.matchStrength) {
      return secondTeam.matchStrength - firstTeam.matchStrength;
    }

    return firstTeam.name.localeCompare(secondTeam.name);
  });

  const teamRows = rankedTeams.map((team, index) => {
    const placement = index + 1;
    const placementPoints = PLACEMENT_POINTS[placement] ?? 0;
    const kills = Math.max(
      0,
      Math.min(16, Math.round((17 - placement) * 0.6 + team.matchStrength / 14 + ((index + input.globalMatchIndex) % 3))),
    );
    const players = rotateArray(playersByTeamId.get(team.id) ?? [], input.globalMatchIndex).slice(0, 4);
    const killWeights = [0.36, 0.28, 0.22, 0.14];
    const playerRows = players.map((player, playerIndex) => {
      const baselineKills = playerIndex === players.length - 1 ? 0 : Math.max(0, Math.round(kills * (killWeights[playerIndex] ?? 0.14)));
      return {
        player,
        assists: Math.max(0, baselineKills + ((placement + playerIndex) % 3) - 1),
        kills: baselineKills,
        knocks: Math.max(0, baselineKills + ((placement + playerIndex) % 2)),
      };
    });

    const remainingKills = kills - playerRows.reduce((sum, playerRow) => sum + playerRow.kills, 0);
    if (playerRows.length > 0) {
      playerRows[0].kills += remainingKills;
    }

    const normalizedPlayerRows = playerRows.map((playerRow, playerIndex) => {
      const damage = playerRow.kills * 118 + playerRow.assists * 42 + Math.max(0, 140 - placement * 6) + playerIndex * 18;
      const totalPoints = playerRow.kills + placementPoints;

      return {
        assists: playerRow.assists,
        damage,
        kills: playerRow.kills,
        knocks: playerRow.knocks,
        placement,
        playerId: playerRow.player.id,
        playerName: playerRow.player.pubgName,
        pubgAccountId: playerRow.player.pubgAccountId,
        slotNumber: team.slotNumber,
        survivalTime: Math.max(300, 1960 - placement * 62 - playerIndex * 25),
        teamId: team.id,
        teamName: team.name,
        totalPoints,
      };
    });

    return {
      kills,
      placement,
      placementPoints,
      players: normalizedPlayerRows,
      slotNumber: team.slotNumber,
      team,
      totalDamage: normalizedPlayerRows.reduce((sum, playerRow) => sum + playerRow.damage, 0),
      totalPoints: placementPoints + kills,
    };
  });

  const winningTeam = teamRows[0];
  const snapshot = {
    dataSource: DEMO_SOURCE,
    eventName: input.eventName,
    eventSlug: input.eventSlug,
    knockouts: teamRows.reduce((sum, teamRow) => sum + teamRow.kills, 0),
    map: input.mapName,
    matchNumber: input.matchNumber,
    playerResults: teamRows.flatMap((teamRow) =>
      teamRow.players.map((playerRow) => ({
        assists: playerRow.assists,
        damage: playerRow.damage,
        kills: playerRow.kills,
        placement: playerRow.placement,
        placementPoints: teamRow.placementPoints,
        playerId: playerRow.playerId,
        playerName: playerRow.playerName,
        pubgPlayerId: playerRow.pubgAccountId,
        slotNumber: playerRow.slotNumber,
        survivalTime: playerRow.survivalTime,
        teamId: playerRow.teamId,
        teamName: playerRow.teamName,
        totalPoints: playerRow.totalPoints,
      })),
    ),
    playedAt: input.playedAt,
    points: winningTeam.totalPoints,
    scrimId: input.eventId,
    status: input.status === "published" ? "published" : "draft",
    teamResults: teamRows.map((teamRow) => ({
      damage: teamRow.totalDamage,
      killPoints: teamRow.kills,
      kills: teamRow.kills,
      placement: teamRow.placement,
      placementPoints: teamRow.placementPoints,
      slotNumber: teamRow.slotNumber,
      teamId: teamRow.team.id,
      teamName: teamRow.team.name,
      totalPoints: teamRow.totalPoints,
    })),
    winner: winningTeam.team.name,
  };

  return {
    matchRow: {
      id: input.matchId,
      season_id: input.seasonId,
      day_id: input.dayId,
      event_id: input.eventId,
      match_id: `demo-match-${input.globalMatchIndex + 1}`,
      external_match_id: `demo-match-${input.globalMatchIndex + 1}`,
      match_number: input.matchNumber,
      map: input.mapName,
      map_name: input.mapName,
      match_date: input.playedAt,
      start_time: input.playedAt,
      status: input.status,
      raw_json: snapshot,
      data_source: "manual_correction",
      published_at: input.status === "published" ? input.playedAt : null,
      deleted_at: null,
      point_system_id: "00000000-0000-4000-8000-000000000001",
      demo_seed_tag: DEMO_SEED_TAG,
      created_at: input.playedAt,
      updated_at: input.playedAt,
    },
    playerRows: teamRows.flatMap((teamRow) =>
      teamRow.players.map((playerRow) => ({
        match_id: input.matchId,
        player_id: playerRow.playerId,
        player_name: playerRow.playerName,
        pubg_account_id: playerRow.pubgAccountId,
        team_id: playerRow.teamId,
        team_name: playerRow.teamName,
        slot_number: playerRow.slotNumber,
        placement: playerRow.placement,
        kills: playerRow.kills,
        assists: playerRow.assists,
        knocks: playerRow.knocks,
        damage: playerRow.damage,
        survival_time: playerRow.survivalTime,
        placement_points: teamRow.placementPoints,
        total_points: playerRow.totalPoints,
        demo_seed_tag: DEMO_SEED_TAG,
        created_at: input.playedAt,
        updated_at: input.playedAt,
      })),
    ),
    teamRows: teamRows.map((teamRow) => ({
      match_id: input.matchId,
      team_id: teamRow.team.id,
      team_name: teamRow.team.name,
      slot_number: teamRow.slotNumber,
      placement: teamRow.placement,
      kills: teamRow.kills,
      placement_points: teamRow.placementPoints,
      kill_points: teamRow.kills,
      total_points: teamRow.totalPoints,
      wwcd: teamRow.placement === 1,
      demo_seed_tag: DEMO_SEED_TAG,
      created_at: input.playedAt,
      updated_at: input.playedAt,
    })),
  } satisfies MatchBuildResult;
}

async function uploadSharedAssets(teams: DemoTeam[], players: DemoPlayer[]) {
  const r2 = getOptionalR2Config();
  const uploads: Array<Record<string, unknown>> = [];
  const uploadedAssets: DemoUploadedAsset[] = [];

  const sharedAssets = await Promise.all([
    uploadDemoSvgAsset(r2, {
      accentColor: "#38bdf8",
      backgroundColor: "#0f172a",
      fileName: "hero-slide",
      folder: "hero",
      label: "Bravo Launch Preview",
    }),
    uploadDemoSvgAsset(r2, {
      accentColor: "#f97316",
      backgroundColor: "#111827",
      fileName: "event-banner",
      folder: "events",
      label: "PUBG Mahasangram",
    }),
    uploadDemoSvgAsset(r2, {
      accentColor: "#22c55e",
      backgroundColor: "#0b1120",
      fileName: "news-thumb",
      folder: "news",
      label: "Bravo Daily Scrims",
    }),
    uploadDemoSvgAsset(r2, {
      accentColor: "#eab308",
      backgroundColor: "#0f172a",
      fileName: "media-thumb",
      folder: "media",
      label: "Community Highlights",
    }),
  ]);

  const teamLogoAssets = await Promise.all(
    ["Skyline", "Afterburn", "Apex", "Glacier"].map((name, index) =>
      uploadDemoSvgAsset(r2, {
        accentColor: ["#38bdf8", "#f43f5e", "#f59e0b", "#22c55e"][index] ?? "#38bdf8",
        backgroundColor: ["#0f172a", "#111827", "#172033", "#09111f"][index] ?? "#0f172a",
        fileName: `team-logo-${name}`,
        folder: "teams",
        label: `${name} Crest`,
      }),
    ),
  );

  const playerAvatarAssets = await Promise.all(
    ["Anchor", "Scout", "Flex", "Closer"].map((name, index) =>
      uploadDemoSvgAsset(r2, {
        accentColor: ["#60a5fa", "#f472b6", "#34d399", "#fbbf24"][index] ?? "#60a5fa",
        backgroundColor: ["#0f172a", "#111827", "#162032", "#101827"][index] ?? "#0f172a",
        fileName: `player-avatar-${name}`,
        folder: "players",
        label: `${name} Avatar`,
      }),
    ),
  );

  const sponsorAssets = await Promise.all(
    ["Gorkhali Roleplay", "Hukut", "Bravo Community Partner", "Local Esports Supporter"].map((name, index) =>
      uploadDemoSvgAsset(r2, {
        accentColor: ["#38bdf8", "#22c55e", "#f59e0b", "#f43f5e"][index] ?? "#38bdf8",
        backgroundColor: "#0f172a",
        fileName: slugify(name),
        folder: "sponsors",
        label: name,
      }),
    ),
  );

  for (const asset of [...sharedAssets, ...teamLogoAssets, ...playerAvatarAssets, ...sponsorAssets]) {
    if (asset) {
      uploadedAssets.push(asset);
    }
  }

  const [heroAsset, bannerAsset, newsAsset, mediaAsset] = sharedAssets;
  const filteredTeamLogoAssets = teamLogoAssets.filter((asset): asset is DemoUploadedAsset => Boolean(asset));
  const filteredPlayerAvatarAssets = playerAvatarAssets.filter((asset): asset is DemoUploadedAsset => Boolean(asset));
  const filteredSponsorAssets = sponsorAssets.filter((asset): asset is DemoUploadedAsset => Boolean(asset));

  for (const [index, team] of teams.entries()) {
    const asset = filteredTeamLogoAssets[index % Math.max(filteredTeamLogoAssets.length, 1)] ?? null;
    if (!asset) {
      continue;
    }

    team.logoUrl = asset.url;
    uploads.push({
      id: buildUuid("17000000", index + 1),
      file_url: asset.url,
      file_path: asset.key,
      file_type: "team_logo",
      related_type: "team",
      related_id: team.id,
      file_name: asset.fileName,
      content_type: asset.contentType,
      size_bytes: asset.sizeBytes,
      demo_seed_tag: DEMO_SEED_TAG,
      created_at: new Date().toISOString(),
    });
  }

  for (const [index, player] of players.entries()) {
    const asset = filteredPlayerAvatarAssets[index % Math.max(filteredPlayerAvatarAssets.length, 1)] ?? null;
    if (!asset) {
      continue;
    }

    player.avatarUrl = asset.url;
    uploads.push({
      id: buildUuid("17100000", index + 1),
      file_url: asset.url,
      file_path: asset.key,
      file_type: "player_avatar",
      related_type: "player",
      related_id: player.id,
      file_name: asset.fileName,
      content_type: asset.contentType,
      size_bytes: asset.sizeBytes,
      demo_seed_tag: DEMO_SEED_TAG,
      created_at: new Date().toISOString(),
    });
  }

  return {
    bannerUrl: bannerAsset?.url ?? null,
    heroImageUrl: heroAsset?.url ?? null,
    mediaImageUrl: mediaAsset?.url ?? null,
    newsImageUrl: newsAsset?.url ?? null,
    sponsorAssets: filteredSponsorAssets,
    uploadRows: uploads,
    uploadedObjectKeys: uploadedAssets.map((asset) => asset.key),
  };
}

async function run() {
  const client = getSupabaseAdminClient();
  await clearDemoData(client, {
    log: (message) => console.log(message),
  });

  const backups = await captureSingletonBackups(client);
  const existingTeamSlotsResponse = await client.from("teams").select("slot_number,name").not("slot_number", "is", null);

  if (existingTeamSlotsResponse.error) {
    throw existingTeamSlotsResponse.error;
  }

  const existingPlayerNamesResponse = await client.from("players").select("pubg_name");
  if (existingPlayerNamesResponse.error) {
    throw existingPlayerNamesResponse.error;
  }

  const occupiedSlotNumbers = new Set(
    (existingTeamSlotsResponse.data ?? []).map((row) => row.slot_number).filter((value): value is number => Number.isFinite(value)),
  );
  const occupiedTeamNames = new Set(
    (existingTeamSlotsResponse.data ?? [])
      .map((row) => (typeof row.name === "string" ? row.name.trim().toLowerCase() : null))
      .filter((value): value is string => Boolean(value)),
  );
  const occupiedPlayerNames = new Set(
    (existingPlayerNamesResponse.data ?? [])
      .map((row) => (typeof row.pubg_name === "string" ? row.pubg_name.trim().toLowerCase() : null))
      .filter((value): value is string => Boolean(value)),
  );
  const reserveSlotNumbers = (count: number, startAt = 41) => {
    const reservedSlots: number[] = [];
    let currentValue = startAt;

    while (reservedSlots.length < count) {
      if (!occupiedSlotNumbers.has(currentValue)) {
        occupiedSlotNumbers.add(currentValue);
        reservedSlots.push(currentValue);
      }
      currentValue += 1;
    }

    return reservedSlots;
  };
  const reserveUniqueLabel = (baseLabel: string, occupiedValues: Set<string>, suffixSeed: string) => {
    const normalizedBaseLabel = baseLabel.trim();
    let candidate = normalizedBaseLabel;
    let attempt = 0;

    while (occupiedValues.has(candidate.toLowerCase())) {
      attempt += 1;
      candidate = `${normalizedBaseLabel} ${suffixSeed}${attempt === 1 ? "" : ` ${attempt}`}`;
    }

    occupiedValues.add(candidate.toLowerCase());
    return candidate;
  };
  const demoSlotNumbers = reserveSlotNumbers(ACTIVE_TEAMS.length + PENDING_TEAMS.length);
  const now = new Date();
  const nowIso = now.toISOString();
  const seasonStartDate = now;
  const completedDates = [addDays(now, -3), addDays(now, -2), addDays(now, -1)];
  const liveDate = now;
  const upcomingDate = addDays(now, 1);
  const tournamentStart = addDays(now, 7);
  const tournamentEnd = addDays(now, 8);

  const seasonId = buildUuid("11000000", 1);
  const dayIds = Array.from({ length: 5 }, (_, index) => buildUuid("12000000", index + 1));
  const dayEventIds = Array.from({ length: 5 }, (_, index) => buildUuid("13000000", index + 1));
  const tournamentEventId = buildUuid("13000000", 99);

  const activeTeams: DemoTeam[] = ACTIVE_TEAMS.map(([name, tag], index) => {
    const resolvedName = reserveUniqueLabel(name, occupiedTeamNames, "Prime");
    return {
      id: buildUuid("14000000", index + 1),
      logoUrl: null,
      name: resolvedName,
      slug: slugify(resolvedName),
      slotNumber: demoSlotNumbers[index],
      status: "active",
      tag,
    };
  });

  const pendingTeams: DemoTeam[] = PENDING_TEAMS.map(([name, tag], index) => {
    const resolvedName = reserveUniqueLabel(name, occupiedTeamNames, "Pending");
    return {
      id: buildUuid("14100000", index + 1),
      logoUrl: null,
      name: resolvedName,
      slug: slugify(resolvedName),
      slotNumber: demoSlotNumbers[ACTIVE_TEAMS.length + index],
      status: "pending",
      tag,
    };
  });

  const players: DemoPlayer[] = [...activeTeams, ...pendingTeams].flatMap((team, teamIndex) =>
    Array.from({ length: 4 }, (_, playerIndex) => {
      const baseHandle = PLAYER_HANDLES[teamIndex * 4 + playerIndex] ?? `Bravo${teamIndex}${playerIndex}`;
      const resolvedHandle = reserveUniqueLabel(baseHandle, occupiedPlayerNames, team.tag);
      return {
        avatarUrl: null,
        currentTeamId: team.id,
        displayName: resolvedHandle,
        id: buildUuid("15000000", teamIndex * 10 + playerIndex + 1),
        pubgAccountId: `demo-${slugify(team.name)}-${resolvedHandle.toLowerCase()}`,
        pubgName: resolvedHandle,
        slug: slugify(`${resolvedHandle}-${team.name}`),
      };
    }),
  );

  const assets = await uploadSharedAssets(activeTeams, players);
  const sponsorLogoUrls = assets.sponsorAssets.map((asset) => asset.url);

  const seasonRow = {
    id: seasonId,
    name: "Bravo Daily Scrims Season 1",
    slug: "bravo-daily-scrims-season-1",
    series_title: "Bravo Daily Scrims Season 1",
    season_number: 1,
    status: "active",
    start_date: formatDateOnly(seasonStartDate),
    end_date: null,
    current_day_number: 4,
    configured_days: 15,
    current_event_id: null,
    completed_at: null,
    archived_at: null,
    ended_early: false,
    notes: `DEMO | ${DEMO_SEED_TAG} | Run npm run clear:demo before launch.`,
    description: "Realistic launch preview season seeded for full-site QA.",
    game: "PUBG PC",
    format: "Squad",
    region: "Nepal",
    perspective: "TPP",
    type: "scrims",
    demo_seed_tag: DEMO_SEED_TAG,
    created_at: nowIso,
    updated_at: nowIso,
  };

  const dayRows = [
    ...completedDates.map((dateValue, index) => ({
      id: dayIds[index],
      season_id: seasonId,
      day_number: index + 1,
      name: `Day ${index + 1}`,
      status: "completed",
      date: formatDateOnly(dateValue),
      demo_seed_tag: DEMO_SEED_TAG,
      created_at: nowIso,
      updated_at: nowIso,
    })),
    {
      id: dayIds[3],
      season_id: seasonId,
      day_number: 4,
      name: "Day 4",
      status: "active",
      date: formatDateOnly(liveDate),
      demo_seed_tag: DEMO_SEED_TAG,
      created_at: nowIso,
      updated_at: nowIso,
    },
    {
      id: dayIds[4],
      season_id: seasonId,
      day_number: 5,
      name: "Day 5",
      status: "scheduled",
      date: formatDateOnly(upcomingDate),
      demo_seed_tag: DEMO_SEED_TAG,
      created_at: nowIso,
      updated_at: nowIso,
    },
  ];

  const scrimMaps = [
    ["Erangel", "Miramar", "Taego", "Vikendi"],
    ["Miramar", "Erangel", "Rondo", "Taego"],
    ["Taego", "Vikendi", "Erangel", "Miramar"],
    ["Erangel", "Rondo", "Miramar", "Taego"],
    ["Miramar", "Erangel", "Vikendi", "Rondo"],
  ];

  const dayEvents = [
    {
      banner_url: assets.bannerUrl,
      competition_status: "COMPLETED",
      date: completedDates[0],
      description: `Completed scrim day seeded for launch preview QA. ${DEMO_SEED_TAG}`,
      id: dayEventIds[0],
      match_count: 4,
      published: true,
      season_day_number: 1,
      status: "completed",
      title: "Bravo Daily Scrims Day 1",
    },
    {
      banner_url: assets.bannerUrl,
      competition_status: "COMPLETED",
      date: completedDates[1],
      description: `Completed scrim day seeded for launch preview QA. ${DEMO_SEED_TAG}`,
      id: dayEventIds[1],
      match_count: 4,
      published: true,
      season_day_number: 2,
      status: "completed",
      title: "Bravo Daily Scrims Day 2",
    },
    {
      banner_url: assets.bannerUrl,
      competition_status: "COMPLETED",
      date: completedDates[2],
      description: `Completed scrim day seeded for launch preview QA. ${DEMO_SEED_TAG}`,
      id: dayEventIds[2],
      match_count: 4,
      published: true,
      season_day_number: 3,
      status: "completed",
      title: "Bravo Daily Scrims Day 3",
    },
    {
      banner_url: assets.bannerUrl,
      competition_status: "LIVE",
      date: liveDate,
      description: `Live scrim day seeded for launch preview QA. ${DEMO_SEED_TAG}`,
      id: dayEventIds[3],
      match_count: 4,
      published: true,
      season_day_number: 4,
      status: "active",
      title: "Bravo Daily Scrims Day 4",
    },
    {
      banner_url: assets.bannerUrl,
      competition_status: "UPCOMING",
      date: upcomingDate,
      description: `Upcoming day seeded for launch preview QA. ${DEMO_SEED_TAG}`,
      id: dayEventIds[4],
      match_count: 0,
      published: true,
      season_day_number: 5,
      status: "draft",
      title: "Bravo Weekend Showdown",
    },
  ].map((event, index) => ({
    id: event.id,
    season_id: seasonId,
    title: event.title,
    name: event.title,
    slug: slugify(event.title),
    event_type: "scrim_day",
    type: "scrim_day",
    game: "PUBG PC",
    mode: "Squad",
    perspective: "TPP",
    status: event.status,
    description: event.description,
    banner_url: event.banner_url,
    start_date: event.date.toISOString(),
    end_date: event.date.toISOString(),
    region: "Nepal",
    tier: index < 4 ? "Daily Scrim" : "Community Special",
    competition_status: event.competition_status,
    prize_pool: index < 4 ? "Daily Points" : "Community Bragging Rights",
    rules: "Bravo daily scrim rules apply.",
    server: "Asia",
    schedule: "Lobby at 19:30 NPT | Start at 20:00 NPT",
    map_rotation: scrimMaps[index],
    max_teams: 20,
    team_count: activeTeams.length,
    season_day_number: event.season_day_number,
    match_count: event.match_count,
    source_url: null,
    published: event.published,
    published_at: nowIso,
    deleted_at: null,
    point_system_id: "00000000-0000-4000-8000-000000000001",
    demo_seed_tag: DEMO_SEED_TAG,
    created_at: nowIso,
    updated_at: nowIso,
  }));

  const tournamentRow = {
    id: tournamentEventId,
    season_id: seasonId,
    title: "Bravo Gaming Esports Presents PUBG MAHASANGRAM",
    name: "Bravo Gaming Esports Presents PUBG MAHASANGRAM",
    slug: "pubg-mahasangram-53821",
    event_type: "tournament",
    type: "tournament",
    game: "PUBG PC",
    mode: "Squad",
    perspective: "TPP",
    status: "draft",
    description: `Upcoming tournament seeded for launch preview QA. ${DEMO_SEED_TAG}`,
    banner_url: assets.bannerUrl,
    start_date: tournamentStart.toISOString(),
    end_date: tournamentEnd.toISOString(),
    region: "Nepal",
    tier: "Major",
    competition_status: "UPCOMING",
    prize_pool: "NPR 100,000",
    rules: "Top 16 invited teams plus open qualifiers.",
    server: "Asia",
    schedule: "Day 1 qualifier + Day 2 finals",
    map_rotation: ["Erangel", "Miramar", "Taego", "Vikendi", "Rondo", "Erangel"],
    max_teams: 24,
    team_count: activeTeams.length,
    season_day_number: null,
    match_count: 0,
    source_url: null,
    published: true,
    published_at: nowIso,
    deleted_at: null,
    point_system_id: "00000000-0000-4000-8000-000000000001",
    demo_seed_tag: DEMO_SEED_TAG,
    created_at: nowIso,
    updated_at: nowIso,
  };

  const teamRows = [...activeTeams, ...pendingTeams].map((team) => ({
    id: team.id,
    slot_number: team.slotNumber,
    name: team.name,
    short_name: team.tag,
    logo_url: team.logoUrl,
    description:
      team.status === "active" ? "Roster approved for launch preview coverage." : "Pending approval record kept for public-safety QA.",
    status: team.status,
    tag: team.tag,
    region: "Nepal",
    is_active: team.status === "active",
    slug: team.slug,
    deleted_at: null,
    demo_seed_tag: DEMO_SEED_TAG,
    created_at: nowIso,
    updated_at: nowIso,
  }));

  const playerRows = players.map((player) => ({
    id: player.id,
    pubg_account_id: player.pubgAccountId,
    pubg_name: player.pubgName,
    display_name: player.displayName,
    current_team_id: player.currentTeamId,
    photo_url: player.avatarUrl,
    avatar_url: player.avatarUrl,
    is_active: !pendingTeams.some((team) => team.id === player.currentTeamId),
    slug: player.slug,
    deleted_at: null,
    demo_seed_tag: DEMO_SEED_TAG,
    created_at: nowIso,
    updated_at: nowIso,
  }));

  const rosterRows = players.map((player, index) => ({
    id: buildUuid("18000000", index + 1),
    team_id: player.currentTeamId,
    player_id: player.id,
    start_date: formatDateOnly(seasonStartDate),
    end_date: null,
    status: pendingTeams.some((team) => team.id === player.currentTeamId) ? "pending" : "active",
    demo_seed_tag: DEMO_SEED_TAG,
    created_at: nowIso,
    updated_at: nowIso,
  }));

  const registeredEvents = [...dayEvents, tournamentRow];
  const eventTeamRows = registeredEvents.flatMap((event, eventIndex) =>
    activeTeams.map((team) => ({
      id: buildUuid("18100000", eventIndex * 100 + team.slotNumber),
      event_id: event.id,
      team_id: team.id,
      slot_number: team.slotNumber,
      status: "registered",
      demo_seed_tag: DEMO_SEED_TAG,
      created_at: nowIso,
      updated_at: nowIso,
    })),
  );

  const publishedMatches: MatchBuildResult[] = [];
  let globalMatchIndex = 0;
  for (const [eventIndex, event] of dayEvents.slice(0, 4).entries()) {
    const eventDate = eventIndex < 3 ? completedDates[eventIndex] : liveDate;
    for (const [matchIndex, mapName] of scrimMaps[eventIndex].entries()) {
      const matchNumber = matchIndex + 1;
      const playedAt = new Date(eventDate);
      playedAt.setUTCHours(14 + matchIndex, matchIndex * 5, 0, 0);
      publishedMatches.push(
        buildMatchData({
          allPlayers: players.filter((player) => !pendingTeams.some((team) => team.id === player.currentTeamId)),
          dayId: dayIds[eventIndex],
          eventId: event.id,
          eventName: event.name,
          eventSlug: event.slug,
          globalMatchIndex,
          mapName,
          matchId: buildUuid("16000000", globalMatchIndex + 1),
          matchNumber,
          playedAt: playedAt.toISOString(),
          seasonId,
          status: "published",
          teams: activeTeams,
        }),
      );
      globalMatchIndex += 1;
    }
  }

  const draftMatch = buildMatchData({
    allPlayers: players.filter((player) => !pendingTeams.some((team) => team.id === player.currentTeamId)),
    dayId: dayIds[4],
    eventId: dayEventIds[4],
    eventName: dayEvents[4].name,
    eventSlug: dayEvents[4].slug,
    globalMatchIndex,
    mapName: scrimMaps[4][0],
    matchId: buildUuid("16000000", globalMatchIndex + 1),
    matchNumber: 1,
    playedAt: new Date(upcomingDate).toISOString(),
    seasonId,
    status: "pending",
    teams: activeTeams,
  });

  const allMatches = [...publishedMatches, draftMatch];
  const matchRows = allMatches.map((match) => match.matchRow);
  const matchTeamRows = allMatches.flatMap((match) => match.teamRows);
  const matchPlayerRows = allMatches.flatMap((match) => match.playerRows);

  const scrimDocuments = dayEvents.map((event, index) => ({
    collectionName: "scrims",
    id: `demo-scrim-day-${index + 1}`,
    data: {
      announcement: `Launch preview demo day. ${DEMO_SEED_TAG}`,
      createdAt: nowIso,
      date: formatDateOnly(index < 3 ? completedDates[index] : index === 3 ? liveDate : upcomingDate),
      demo_seed_tag: DEMO_SEED_TAG,
      id: `demo-scrim-day-${index + 1}`,
      lobbyTime: "19:30 NPT",
      map: scrimMaps[index][0],
      mapRotation: scrimMaps[index],
      published: true,
      pubgMatchIds:
        index < 4
          ? publishedMatches.slice(index * 4, index * 4 + 4).map((match) => String(match.matchRow.match_id))
          : [String(draftMatch.matchRow.match_id)],
      seasonDayNumber: index + 1,
      seasonId,
      seasonTitle: seasonRow.name,
      source: DEMO_SOURCE,
      status: index < 3 ? "completed" : index === 3 ? "live" : "scheduled",
      teamIds: activeTeams.map((team) => team.id),
      title: event.name,
      tournamentId: event.id,
      updatedAt: nowIso,
    },
    updatedAt: nowIso,
  }));

  const newsDocuments = [
    {
      category: "PUBG",
      date: formatDateOnly(now),
      id: "demo-news-bravo-daily-scrims-season-1-begins",
      imageUrl: assets.newsImageUrl,
      state: "published",
      summary: "A full week of seeded standings, rosters, and match cards is now available for launch preview QA.",
      title: "Bravo Daily Scrims Season 1 Begins",
    },
    {
      category: "Tournament",
      date: formatDateOnly(addDays(now, -1)),
      id: "demo-news-pubg-mahasangram-2-coming-soon",
      imageUrl: assets.bannerUrl,
      state: "published",
      summary: "PUBG MAHASANGRAM is now visible with registrations, banners, and sponsor placements for preview.",
      title: "PUBG MAHASANGRAM Coming Soon",
    },
    {
      category: "Statistics",
      date: formatDateOnly(addDays(now, -2)),
      id: "demo-news-top-fraggers-of-the-week",
      imageUrl: assets.newsImageUrl,
      state: "published",
      summary: "Player leaderboard lanes now surface realistic kill, assist, and damage output for homepage and PUBG hub QA.",
      title: "Top Fraggers of the Week",
    },
    {
      category: "Community",
      date: formatDateOnly(addDays(now, 2)),
      id: "demo-news-community-scrims-highlights",
      imageUrl: assets.mediaImageUrl,
      state: "scheduled",
      summary: "A scheduled article stays hidden until its publish window arrives.",
      title: "Community Scrims Highlights",
    },
  ].map((article, index) => {
    const slug = `${slugify(article.title)}-launch-preview`;
    return {
      collectionName: "newsArticles",
      id: article.id,
      data: {
        authorName: "Bravo Editorial Desk",
        body: [
          article.summary,
          "This demo article exists only to validate public cards, detail pages, and editorial workflows before launch.",
        ],
        breaking: index === 0,
        category: article.category,
        createdAt: nowIso,
        date: article.date,
        demo_seed_tag: DEMO_SEED_TAG,
        featured: index < 2,
        gameSlug: "pubg-pc",
        id: article.id,
        imageUrl: article.imageUrl,
        publishAt: article.state === "scheduled" ? `${formatDateOnly(addDays(now, 2))}T20:00:00+05:45` : undefined,
        publishedAt: article.state === "published" ? nowIso : undefined,
        slug,
        source: DEMO_SOURCE,
        state: article.state,
        summary: article.summary,
        tags: ["PUBG", "Bravo", "Launch Preview"],
        title: article.title,
        updatedAt: nowIso,
      },
      updatedAt: nowIso,
    };
  });

  const announcementDocuments = [
    ["Room codes go live 30 minutes before first drop", "Operations"],
    ["Daily standings now refresh after every published match", "Results"],
    ["Mahasangram registration closes this Friday", "Tournament"],
    ["Hidden moderation note for unpublished announcement QA", "Internal"],
  ].map(([title, category], index) => ({
    collectionName: "announcements",
    id: `demo-announcement-${index + 1}`,
    data: {
      category,
      date: formatDateOnly(addDays(now, -index)),
      demo_seed_tag: DEMO_SEED_TAG,
      detail:
        index === 3
          ? "This unpublished announcement should stay hidden from public routes."
          : "Demo announcement seeded to validate admin publishing and public community surfaces.",
      id: `demo-announcement-${index + 1}`,
      published: index < 3,
      source: DEMO_SOURCE,
      title,
    },
    updatedAt: nowIso,
  }));

  const sponsorSeedRows = [
    { name: "Gorkhali Roleplay", published: true, tier: "Partner" },
    { name: "Hukut", published: true, tier: "Title Partner" },
    { name: "Bravo Community Partner", published: true, tier: "Community" },
    { name: "Local Esports Supporter", published: true, tier: "Supporter" },
    { name: "After Hours Lounge", published: false, tier: "Inactive" },
  ] as const;

  const sponsorDocuments = sponsorSeedRows.map(({ name, tier, published }, index) => ({
    collectionName: "sponsors",
    id: `demo-sponsor-${index + 1}`,
    data: {
      createdAt: nowIso,
      demo_seed_tag: DEMO_SEED_TAG,
      description:
        published === true
          ? "Demo sponsor profile seeded for homepage, PUBG hub, and sponsor detail QA."
          : "Inactive sponsor record kept hidden for public visibility QA.",
      eventSlugs: ["pubg-mahasangram-53821"],
      featured: index < 2,
      id: `demo-sponsor-${index + 1}`,
      kind: "partner",
      logoUrl: sponsorLogoUrls[index] ?? assets.bannerUrl,
      name,
      published,
      showOnEventPage: published,
      showOnHomepage: published && index < 4,
      showOnPubgPage: published,
      showOnSponsorsPage: published,
      slug: `${slugify(name)}-launch-preview`,
      socialUrl: published ? `https://instagram.com/${slugify(name)}` : undefined,
      source: DEMO_SOURCE,
      supportedEvents: ["Bravo Gaming Esports Presents PUBG MAHASANGRAM", "Bravo Daily Scrims Season 1"],
      tier,
      updatedAt: nowIso,
      visible: published,
      websiteUrl: published ? `https://${slugify(name)}.example.com` : undefined,
    },
    updatedAt: nowIso,
  }));

  const videoDocuments = [
    ["Community Scrims Highlights", "Highlights"],
    ["Top Fraggers Breakdown", "Analysis"],
    ["Mahasangram Trailer", "Trailer"],
    ["Day 1 Winning Pushes", "Highlights"],
    ["Miramar Clutch Montage", "Gallery"],
    ["Roster Spotlight: Team HAKU", "Feature"],
  ].map(([title, category], index) => ({
    collectionName: "videos",
    id: `demo-video-${index + 1}`,
    data: {
      category,
      createdAt: nowIso,
      demo_seed_tag: DEMO_SEED_TAG,
      duration: ["08:12", "06:41", "02:03", "05:18", "04:22", "03:47"][index] ?? "05:00",
      featured: index < 3,
      gameSlug: "pubg-pc",
      id: `demo-video-${index + 1}`,
      imageUrl: assets.mediaImageUrl,
      kind: index === 4 ? "Gallery" : "Video",
      published: true,
      publishedAt: addDays(now, -index).toISOString(),
      slug: `${slugify(title)}-launch-preview`,
      source: DEMO_SOURCE,
      summary: "Demo media item seeded for homepage, media list, and detail page QA.",
      title,
      updatedAt: nowIso,
    },
    updatedAt: nowIso,
  }));

  const homepageContentDocument = {
    collectionName: "homepageContent",
    id: "main",
    data: {
      ...(backups.homepageContent?.data ?? {}),
      breakingNewsSlug: String(newsDocuments[0].data.slug),
      demo_seed_tag: DEMO_SEED_TAG,
      featuredEventSlugs: [dayEvents[3].slug, tournamentRow.slug, dayEvents[4].slug],
      featuredMediaIds: videoDocuments.slice(0, 3).map((document) => String(document.id)),
      featuredNewsSlugs: newsDocuments.slice(0, 3).map((document) => String(document.data.slug)),
      featuredPlayerIds: players.slice(0, 4).map((player) => player.id),
      featuredSponsorSlugs: sponsorDocuments.slice(0, 4).map((document) => String(document.data.slug)),
      featuredTeamIds: activeTeams.slice(0, 4).map((team) => team.id),
      heroSlides: [
        {
          badge: "Launch Preview",
          description: "Preview homepage hero content with realistic standings, media, and tournament coverage before launch.",
          id: "demo-hero-1",
          imageUrl: assets.heroImageUrl,
          primaryHref: "/pubg",
          primaryLabel: "Open PUBG",
          promoText: "Daily scrims now surfaced end to end",
          secondaryHref: "/events",
          secondaryLabel: "Browse Events",
          sponsorSlug: sponsorDocuments[0].data.slug,
          tertiaryHref: "/news",
          tertiaryLabel: "Read News",
          title: "Bravo's launch preview now shows live standings, teams, and media",
        },
        {
          badge: "Upcoming Major",
          description: "PUBG MAHASANGRAM is seeded with sponsor support, banner assets, and public registration context.",
          id: "demo-hero-2",
          imageUrl: assets.bannerUrl,
          primaryHref: `/pubg/events/${tournamentRow.slug}`,
          primaryLabel: "View Tournament",
          secondaryHref: "/sponsors",
          secondaryLabel: "Meet Sponsors",
          tertiaryHref: "/media",
          tertiaryLabel: "Watch Highlights",
          title: "Mahasangram 2.0 preview is ready for final public polish",
        },
        {
          badge: "Community Coverage",
          description: "Announcements, team cards, player spotlights, and media tiles now have realistic preview content.",
          id: "demo-hero-3",
          imageUrl: assets.mediaImageUrl,
          primaryHref: "/pubg/community",
          primaryLabel: "Open Community",
          secondaryHref: "/pubg/teams",
          secondaryLabel: "Browse Teams",
          tertiaryHref: "/pubg/players",
          tertiaryLabel: "Browse Players",
          title: "Community lanes stay populated for public and admin QA",
        },
      ],
      id: "main",
      liveHref: "/live-stream",
      liveSubtitle: "Daily scrims are seeded across the homepage, PUBG hub, and public event lanes.",
      liveTitle: "Bravo Launch Preview Broadcast",
      liveViewers: "Preview data active",
      published: true,
      source: DEMO_SOURCE,
      updatedAt: nowIso,
    },
    updatedAt: nowIso,
  };

  const siteStatsDocument = {
    collectionName: "siteStats",
    id: "main",
    data: {
      ...(backups.siteStats?.data ?? {}),
      communityMembers: 4800,
      currentDay: 4,
      currentSeasonId: seasonId,
      currentSeasonLength: 15,
      currentSeasonStart: formatDateOnly(seasonStartDate),
      currentSeasonStatus: "active",
      currentSeasonTitle: seasonRow.name,
      demo_seed_tag: DEMO_SEED_TAG,
      matchesHosted: publishedMatches.length,
      prizePoolsAwarded: "NPR 100,000 Preview Pool",
      published: true,
      source: DEMO_SOURCE,
      teamsRegistered: activeTeams.length,
      tournamentsCompleted: 3,
      youtubeViews: "126K",
    },
    updatedAt: nowIso,
  };

  await upsertRowsInChunks(client, "seasons", [seasonRow], {
    onConflict: "id",
  });
  await upsertRowsInChunks(client, "days", dayRows, { onConflict: "id" });
  await upsertRowsInChunks(client, "events", [...dayEvents, tournamentRow], {
    onConflict: "id",
  });
  {
    const { error } = await client.from("seasons").update({ current_event_id: dayEventIds[3], updated_at: nowIso }).eq("id", seasonId);

    if (error) {
      throw error;
    }
  }
  await upsertRowsInChunks(client, "teams", teamRows, { onConflict: "id" });
  await upsertRowsInChunks(client, "players", playerRows, { onConflict: "id" });
  await upsertRowsInChunks(client, "team_roster_history", rosterRows, {
    onConflict: "id",
  });
  await upsertRowsInChunks(client, "event_teams", eventTeamRows, {
    onConflict: "event_id,team_id",
  });
  await upsertRowsInChunks(client, "matches", matchRows, { onConflict: "id" });
  await upsertRowsInChunks(client, "match_team_results", matchTeamRows, {
    onConflict: "match_id,team_id",
  });
  await upsertRowsInChunks(client, "match_player_results", matchPlayerRows, {
    onConflict: "match_id,player_id",
  });
  await upsertRowsInChunks(client, "uploads", assets.uploadRows, {
    onConflict: "id",
  });
  await upsertAppDocuments(client, [
    ...scrimDocuments,
    ...newsDocuments,
    ...announcementDocuments,
    ...sponsorDocuments,
    ...videoDocuments,
    homepageContentDocument,
    siteStatsDocument,
  ]);

  await writeDemoManifest({
    createdAt: nowIso,
    demoSeedTag: DEMO_SEED_TAG,
    singletonBackups: backups,
    uploadedObjectKeys: assets.uploadedObjectKeys,
  });

  console.log("Demo launch data seeded successfully.");
  console.log(`Manifest: ${DEMO_MANIFEST_PATH}`);
  console.log(`Season: ${seasonRow.name}`);
  console.log(`Published matches: ${publishedMatches.length}`);
  console.log(`Draft matches: 1`);
  console.log(`Teams: ${activeTeams.length} active, ${pendingTeams.length} hidden pending`);
  console.log(`Players: ${players.length}`);
}

run().catch((error) => {
  console.error("Failed to seed demo data.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
