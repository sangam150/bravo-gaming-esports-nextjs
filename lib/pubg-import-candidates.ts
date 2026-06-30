import "server-only";

import { writeAuditLog, writeAuditLogFromRequest } from "./audit-logs";
import { getCompetitionMatchesForEvent } from "./competition-relational";
import { getTournament } from "./data";
import { COLLECTIONS, fetchDocumentCollection, getDocument, saveDocument } from "./document-store";
import { importPubgMatchesRelational } from "./pubg-import-relational";
import type {
  PubgImportCandidate,
  PubgImportCandidateSignal,
  PubgImportCandidateStatus,
  PubgImportPreview,
  PubgImportWatcher,
  Scrim,
  Tournament,
  TournamentMatch,
} from "./types";

const KATHMANDU_TIMEZONE_OFFSET = "+05:45";
const DEFAULT_EVENT_WINDOW_START = "18:00:00";
const DEFAULT_EVENT_WINDOW_MINUTES = 8 * 60;
const RECENT_CANDIDATE_LIMIT = 100;
const SERIOUS_REVIEW_WARNING_TYPES = new Set<PubgImportPreview["warnings"][number]["type"]>([
  "duplicate_match",
  "duplicate_player",
  "roster_mismatch",
  "team_assignment_conflict",
  "missing_field",
]);

type CandidateEventContext = {
  tournament: Tournament | null;
  scrim: Scrim | null;
  existingMatches: TournamentMatch[];
  emptyDraftMatches: TournamentMatch[];
  registeredTeamIds: string[];
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeIdentity(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeMapName(value?: string | null) {
  return normalizeIdentity(value).replace(/\s+/g, " ");
}

function toIsoDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseDate(value?: string | null) {
  const isoValue = toIsoDate(value);
  return isoValue ? new Date(isoValue) : null;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function buildCandidateId(watcherId: string, matchId: string) {
  return `${watcherId}--${slugify(matchId)}`;
}

function summarizeUnknownCount(preview: PubgImportPreview, type: "unknown_team" | "unknown_player") {
  const keys = new Set<string>();

  for (const warning of preview.warnings) {
    if (warning.type !== type) continue;
    const key =
      type === "unknown_team"
        ? normalizeIdentity(warning.teamName ?? warning.rosterId ?? warning.message)
        : normalizeIdentity(warning.pubgPlayerId ?? warning.playerName ?? warning.message);
    if (key) {
      keys.add(key);
    }
  }

  return keys.size;
}

function hasSeriousReviewWarning(preview: PubgImportPreview) {
  return preview.warnings.some((warning) => SERIOUS_REVIEW_WARNING_TYPES.has(warning.type));
}

function buildEventWindow(scrim: Scrim | null, emptyDraftMatches: TournamentMatch[]) {
  const shellDates = emptyDraftMatches
    .map((match) => parseDate(match.playedAt))
    .filter((value): value is Date => Boolean(value))
    .sort((firstDate, secondDate) => firstDate.getTime() - secondDate.getTime());

  if (shellDates.length > 0) {
    return {
      start: addMinutes(shellDates[0], -90),
      end: addMinutes(shellDates[shellDates.length - 1], 90),
    };
  }

  const scrimDate = scrim?.date?.trim();
  if (scrimDate && /^\d{4}-\d{2}-\d{2}$/.test(scrimDate)) {
    const start = new Date(`${scrimDate}T${DEFAULT_EVENT_WINDOW_START}${KATHMANDU_TIMEZONE_OFFSET}`);
    return {
      start,
      end: addMinutes(start, DEFAULT_EVENT_WINDOW_MINUTES),
    };
  }

  const now = new Date();
  return {
    start: addMinutes(now, -180),
    end: addMinutes(now, 180),
  };
}

function buildTargetDraftMatch(preview: PubgImportPreview, emptyDraftMatches: TournamentMatch[]) {
  if (emptyDraftMatches.length === 0) {
    return null;
  }

  const normalizedPreviewMap = normalizeMapName(preview.summary.mapName);
  const previewDate = parseDate(preview.summary.createdAt);
  const firstEmptyMatch = emptyDraftMatches[0] ?? null;

  const rankedMatches = [...emptyDraftMatches].sort((firstMatch, secondMatch) => {
    const firstMapMatch = normalizeMapName(firstMatch.map) === normalizedPreviewMap ? 1 : 0;
    const secondMapMatch = normalizeMapName(secondMatch.map) === normalizedPreviewMap ? 1 : 0;
    if (firstMapMatch !== secondMapMatch) {
      return secondMapMatch - firstMapMatch;
    }

    const firstDate = parseDate(firstMatch.playedAt);
    const secondDate = parseDate(secondMatch.playedAt);
    const firstDelta =
      previewDate && firstDate ? Math.abs(previewDate.getTime() - firstDate.getTime()) : Number.POSITIVE_INFINITY;
    const secondDelta =
      previewDate && secondDate ? Math.abs(previewDate.getTime() - secondDate.getTime()) : Number.POSITIVE_INFINITY;
    if (firstDelta !== secondDelta) {
      return firstDelta - secondDelta;
    }

    return (firstMatch.matchNumber ?? firstMatch.sequenceNumber ?? 999) - (secondMatch.matchNumber ?? secondMatch.sequenceNumber ?? 999);
  });

  const targetMatch = rankedMatches[0] ?? firstEmptyMatch;
  const targetMatchNumber = targetMatch?.matchNumber ?? targetMatch?.sequenceNumber ?? preview.matchNumber ?? undefined;
  const firstEmptyMatchNumber = firstEmptyMatch?.matchNumber ?? firstEmptyMatch?.sequenceNumber ?? undefined;

  return {
    targetMatch,
    targetMatchNumber,
    firstEmptyMatchNumber,
  };
}

function buildConfidenceReason(status: PubgImportCandidateStatus, score: number, signals: PubgImportCandidateSignal[]) {
  const signalSummary = signals
    .slice()
    .sort((firstSignal, secondSignal) => Math.abs(secondSignal.score) - Math.abs(firstSignal.score))
    .slice(0, 3)
    .map((signal) => `${signal.score > 0 ? "+" : ""}${signal.score} ${signal.label.toLowerCase()}`)
    .join(", ");

  if (status === "auto_published") {
    return `Confidence ${score}. Auto-published from verified event fit${signalSummary ? `: ${signalSummary}.` : "."}`;
  }

  if (status === "draft") {
    return `Confidence ${score}. Imported to draft for manual approval${signalSummary ? `: ${signalSummary}.` : "."}`;
  }

  if (status === "candidate") {
    return `Confidence ${score}. Safe candidate waiting for admin publish${signalSummary ? `: ${signalSummary}.` : "."}`;
  }

  if (status === "needs_review") {
    return `Confidence ${score}. Review required before import${signalSummary ? `: ${signalSummary}.` : "."}`;
  }

  if (status === "ignored") {
    return `Confidence ${score}. Candidate ignored${signalSummary ? `: ${signalSummary}.` : "."}`;
  }

  return `Candidate processing failed${signalSummary ? `: ${signalSummary}.` : "."}`;
}

async function loadCandidateEventContext(
  watcher: PubgImportWatcher,
  preview: PubgImportPreview
): Promise<CandidateEventContext> {
  const tournamentId = watcher.tournamentId ?? preview.tournamentId;
  const scrimId = watcher.scrimId ?? preview.scrimId;
  const [tournament, scrim] = await Promise.all([
    tournamentId ? getTournament(tournamentId) : Promise.resolve(null),
    scrimId ? getDocument<Scrim>(COLLECTIONS.scrims, scrimId) : Promise.resolve(null),
  ]);
  const existingMatches = tournament?.id
    ? await getCompetitionMatchesForEvent(tournament.id, { includeDrafts: true })
    : [];
  const emptyDraftMatches = existingMatches
    .filter(
      (match) =>
        match.status === "draft" &&
        (match.teamResults?.length ?? 0) === 0 &&
        (match.playerResults?.length ?? 0) === 0
    )
    .sort(
      (firstMatch, secondMatch) =>
        (firstMatch.matchNumber ?? firstMatch.sequenceNumber ?? 999) -
        (secondMatch.matchNumber ?? secondMatch.sequenceNumber ?? 999)
    );
  const registeredTeamIds = tournament?.registeredTeamIds ?? [];

  return {
    tournament,
    scrim,
    existingMatches,
    emptyDraftMatches,
    registeredTeamIds,
  };
}

function buildSignals(input: {
  preview: PubgImportPreview;
  context: CandidateEventContext;
  targetMatchNumber?: number;
  firstEmptyMatchNumber?: number;
}) {
  const { preview, context, targetMatchNumber, firstEmptyMatchNumber } = input;
  const signals: PubgImportCandidateSignal[] = [];
  const window = buildEventWindow(context.scrim, context.emptyDraftMatches);
  const previewTime = parseDate(preview.summary.createdAt);
  const emptyMatchTarget = context.emptyDraftMatches.find(
    (match) => (match.matchNumber ?? match.sequenceNumber) === targetMatchNumber
  );
  const expectedMap =
    emptyMatchTarget?.map ??
    context.scrim?.mapRotation?.[Math.max((targetMatchNumber ?? 1) - 1, 0)] ??
    context.tournament?.mapRotation?.[Math.max((targetMatchNumber ?? 1) - 1, 0)] ??
    null;
  const normalizedPreviewMap = normalizeMapName(preview.summary.mapName);
  const normalizedExpectedMap = normalizeMapName(expectedMap);
  const unknownTeams = summarizeUnknownCount(preview, "unknown_team");
  const unknownPlayers = summarizeUnknownCount(preview, "unknown_player");
  const knownTeams = Math.max(preview.detectedTeams - unknownTeams, 0);
  const knownPlayers = Math.max(preview.detectedPlayers - unknownPlayers, 0);
  const actualTeamCount = preview.detectedTeams;
  const actualParticipantCount = preview.detectedPlayers;
  const configuredExpectedTeamCount = Math.max(
    context.registeredTeamIds.length,
    context.tournament?.teamCount ?? 0,
    context.scrim?.teamIds.length ?? 0
  );
  const expectedTeamCount = configuredExpectedTeamCount > 0 ? configuredExpectedTeamCount : actualTeamCount;
  const configuredExpectedParticipantCount = expectedTeamCount > 0 ? expectedTeamCount * 4 : 0;
  const expectedParticipantCount = configuredExpectedParticipantCount > 0
    ? configuredExpectedParticipantCount
    : actualParticipantCount;
  const duplicateImportedMatch = preview.alreadyImported;
  const seriousRosterConflict = preview.conflicts.length > 0 || hasSeriousReviewWarning(preview);
  const insideEventWindow = Boolean(
    previewTime && previewTime.getTime() >= window.start.getTime() && previewTime.getTime() <= window.end.getTime()
  );
  const mapMatchesExpected = normalizedPreviewMap.length > 0 && normalizedExpectedMap.length > 0
    ? normalizedPreviewMap === normalizedExpectedMap
    : (context.scrim?.mapRotation ?? context.tournament?.mapRotation ?? []).some(
        (mapName) => normalizeMapName(mapName) === normalizedPreviewMap
      );
  const knownPlayerRatio = actualParticipantCount > 0 ? knownPlayers / actualParticipantCount : 0;
  const knownTeamRatio = actualTeamCount > 0 ? knownTeams / actualTeamCount : 0;
  const teamCountMatches = actualTeamCount > 0 && actualTeamCount === expectedTeamCount;
  const participantCountMatches = actualParticipantCount > 0 && actualParticipantCount === expectedParticipantCount;
  const matchOrderFits =
    typeof targetMatchNumber === "number" &&
    typeof firstEmptyMatchNumber === "number" &&
    targetMatchNumber === firstEmptyMatchNumber;

  if (insideEventWindow) {
    signals.push({ label: "Match inside event time window", score: 30 });
  } else {
    signals.push({ label: "Outside event time window", score: -30 });
  }

  if (mapMatchesExpected) {
    signals.push({ label: "Map matches expected rotation", score: 20 });
  } else {
    signals.push({ label: "Map not in expected rotation", score: -25 });
  }

  if (knownPlayerRatio >= 0.4) {
    signals.push({ label: "At least 40% registered Bravo players", score: 20 });
  } else if (actualParticipantCount > 0 && unknownPlayers / actualParticipantCount > 0.6) {
    signals.push({ label: "Too many unknown players", score: -25 });
  }

  if (knownTeamRatio >= 0.5) {
    signals.push({ label: "At least 50% registered Bravo teams", score: 15 });
  } else if (actualTeamCount > 0 && unknownTeams / actualTeamCount > 0.5) {
    signals.push({ label: "Too many unknown teams", score: -25 });
  }

  if (teamCountMatches) {
    signals.push({ label: "Expected team count matches", score: 10 });
  }

  if (participantCountMatches) {
    signals.push({ label: "Expected participant count matches", score: 10 });
  }

  if (matchOrderFits) {
    signals.push({ label: "Match order fits", score: 10 });
  }

  if (duplicateImportedMatch) {
    signals.push({ label: "Duplicate imported match", score: -40 });
  }

  if (seriousRosterConflict) {
    signals.push({ label: "Serious roster conflict", score: -50 });
  }

  return {
    signals,
    knownTeams,
    knownPlayers,
    unknownTeams,
    unknownPlayers,
    actualTeamCount,
    actualParticipantCount,
    expectedTeamCount,
    expectedParticipantCount,
    duplicateImportedMatch,
    seriousRosterConflict,
    insideEventWindow,
    mapMatchesExpected,
    enoughRegisteredPlayers: knownPlayerRatio >= 0.4,
    enoughRegisteredTeams: knownTeamRatio >= 0.5,
  };
}

async function saveWatcherProgress(
  watcherId: string,
  matchId: string,
  options?: {
    imported?: boolean;
    lastCandidateStatus?: string;
  }
) {
  const watcher = await getDocument<PubgImportWatcher>(COLLECTIONS.pubgImportWatchers, watcherId);
  if (!watcher) {
    return;
  }

  const processedMatchIds = Array.from(new Set([...(watcher.processedMatchIds ?? []), matchId])).slice(-100);
  const importedMatchIds = options?.imported
    ? Array.from(new Set([...(watcher.importedMatchIds ?? []), matchId])).slice(-100)
    : watcher.importedMatchIds;
  const now = new Date().toISOString();

  await saveDocument(COLLECTIONS.pubgImportWatchers, watcherId, {
    processedMatchIds,
    importedMatchIds,
    lastDetectedAt: now,
    lastCandidateStatus: options?.lastCandidateStatus ?? watcher.lastCandidateStatus,
    lastImportedAt: options?.imported ? now : watcher.lastImportedAt,
    updatedAt: now,
  });
}

async function importCandidateMatch(
  candidate: PubgImportCandidate,
  publish: boolean
) {
  const result = await importPubgMatchesRelational([candidate.matchId], {
    tournamentId: candidate.tournamentId,
    scrimId: candidate.scrimId,
    seasonId: candidate.seasonId,
    seasonDayNumber: candidate.seasonDayNumber,
    autoCreateDay: true,
    duplicateMode: "overwrite",
    publish,
    matchEdits: [
      {
        sourceMatchId: candidate.sourceMatchId,
        matchNumber: candidate.targetMatchNumber ?? candidate.matchNumber,
        map: candidate.map,
        playedAt: candidate.matchTime,
      },
    ],
  });

  if (result.failedCount > 0) {
    throw new Error(result.results.find((entry) => !entry.success)?.error ?? "Candidate import failed.");
  }

  return result;
}

async function saveCandidate(candidate: PubgImportCandidate) {
  await saveDocument(COLLECTIONS.pubgImportCandidates, candidate.id, {
    ...candidate,
    updatedAt: candidate.updatedAt ?? new Date().toISOString(),
    createdAt: candidate.createdAt ?? new Date().toISOString(),
  } as Record<string, unknown>);
  return candidate;
}

async function writeSystemCandidateAudit(action: string, candidate: PubgImportCandidate) {
  return writeAuditLog({
    action,
    entityType: "pubg_import_candidate",
    entityId: candidate.id,
    newValue: {
      watcherId: candidate.watcherId,
      eventId: candidate.tournamentId,
      matchId: candidate.matchId,
      confidenceScore: candidate.confidenceScore,
      reason: candidate.confidenceReason,
      status: candidate.status,
      actor: "system",
      timestamp: new Date().toISOString(),
    },
  });
}

export async function evaluatePubgImportCandidate(
  watcher: PubgImportWatcher,
  preview: PubgImportPreview
): Promise<PubgImportCandidate> {
  const eventContext = await loadCandidateEventContext(watcher, preview);
  const { targetMatch, targetMatchNumber, firstEmptyMatchNumber } = buildTargetDraftMatch(
    preview,
    eventContext.emptyDraftMatches
  ) ?? {
    targetMatch: null,
    targetMatchNumber: preview.matchNumber,
    firstEmptyMatchNumber: undefined,
  };
  const signalState = buildSignals({
    preview,
    context: eventContext,
    targetMatchNumber,
    firstEmptyMatchNumber,
  });
  const confidenceScore = signalState.signals.reduce((totalScore, signal) => totalScore + signal.score, 0);
  const canAutoPublish = Boolean(
    watcher.autoPublishCandidates &&
      !signalState.duplicateImportedMatch &&
      !signalState.seriousRosterConflict &&
      signalState.enoughRegisteredTeams &&
      signalState.enoughRegisteredPlayers &&
      signalState.insideEventWindow &&
      signalState.mapMatchesExpected &&
      typeof targetMatchNumber === "number"
  );
  const canDraftImport = Boolean(
    !signalState.duplicateImportedMatch &&
      typeof targetMatchNumber === "number" &&
      eventContext.tournament?.id
  );
  const hasReviewBlockingWarning = signalState.seriousRosterConflict;

  let status: PubgImportCandidateStatus = "candidate";
  if (confidenceScore < 50) {
    status = "ignored";
  } else if (hasReviewBlockingWarning) {
    status = "needs_review";
  } else if (confidenceScore >= 80) {
    status = canAutoPublish ? "auto_published" : "candidate";
  } else {
    status = canDraftImport ? "draft" : "needs_review";
  }

  return {
    id: buildCandidateId(watcher.id, preview.matchId),
    watcherId: watcher.id,
    detectedFromPlayer: watcher.playerName,
    detectedFromPlayerId: watcher.playerId,
    seasonId: preview.seasonId,
    seasonDayNumber: preview.seasonDayNumber,
    tournamentId: eventContext.tournament?.id ?? watcher.tournamentId ?? preview.tournamentId,
    tournamentTitle: eventContext.tournament?.title ?? preview.tournamentTitle,
    scrimId: eventContext.scrim?.id ?? watcher.scrimId ?? preview.scrimId,
    scrimTitle: eventContext.scrim?.title ?? preview.scrimTitle,
    matchId: preview.matchId,
    sourceMatchId: preview.matchId,
    matchNumber: preview.matchNumber,
    targetMatchNumber,
    map: preview.summary.mapName ?? targetMatch?.map ?? undefined,
    matchTime: toIsoDate(preview.summary.createdAt) ?? undefined,
    knownTeams: signalState.knownTeams,
    knownPlayers: signalState.knownPlayers,
    unknownTeams: signalState.unknownTeams,
    unknownPlayers: signalState.unknownPlayers,
    expectedTeamCount: signalState.expectedTeamCount,
    expectedParticipantCount: signalState.expectedParticipantCount,
    actualTeamCount: signalState.actualTeamCount,
    actualParticipantCount: signalState.actualParticipantCount,
    confidenceScore,
    confidenceReason: buildConfidenceReason(status, confidenceScore, signalState.signals),
    confidenceSignals: signalState.signals,
    status,
    autoPublishEnabled: watcher.autoPublishCandidates === true,
    canAutoPublish,
    duplicateImportedMatch: signalState.duplicateImportedMatch,
    seriousRosterConflict: signalState.seriousRosterConflict,
    reviewPending: status === "candidate" || status === "draft" || status === "needs_review",
    preview,
  };
}

export async function processAutoDetectedPubgCandidate(
  watcher: PubgImportWatcher,
  preview: PubgImportPreview
) {
  const now = new Date().toISOString();
  let candidate = await evaluatePubgImportCandidate(watcher, preview);
  candidate = await saveCandidate({
    ...candidate,
    createdAt: now,
    updatedAt: now,
  });
  await writeSystemCandidateAudit("candidate_found", candidate);

  if (candidate.status === "ignored") {
    await saveWatcherProgress(watcher.id, candidate.matchId, { lastCandidateStatus: candidate.status });
    await writeSystemCandidateAudit("candidate_ignored", candidate);
    return candidate;
  }

  if (candidate.status === "draft") {
    try {
      await importCandidateMatch(candidate, false);
      candidate = await saveCandidate({
        ...candidate,
        importedDraftAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await saveWatcherProgress(watcher.id, candidate.matchId, {
        imported: true,
        lastCandidateStatus: candidate.status,
      });
      await writeSystemCandidateAudit("draft_created", candidate);
      return candidate;
    } catch (error: unknown) {
      candidate = await saveCandidate({
        ...candidate,
        status: "failed",
        reviewPending: false,
        error: error instanceof Error ? error.message : String(error),
        updatedAt: new Date().toISOString(),
      });
      await saveWatcherProgress(watcher.id, candidate.matchId, { lastCandidateStatus: candidate.status });
      await writeSystemCandidateAudit("candidate_failed", candidate);
      return candidate;
    }
  }

  if (candidate.status === "auto_published") {
    try {
      await importCandidateMatch(candidate, true);
      candidate = await saveCandidate({
        ...candidate,
        publishedAt: new Date().toISOString(),
        reviewPending: false,
        updatedAt: new Date().toISOString(),
      });
      await saveWatcherProgress(watcher.id, candidate.matchId, {
        imported: true,
        lastCandidateStatus: candidate.status,
      });
      await writeSystemCandidateAudit("auto_published", candidate);
      return candidate;
    } catch (error: unknown) {
      candidate = await saveCandidate({
        ...candidate,
        status: "failed",
        reviewPending: false,
        error: error instanceof Error ? error.message : String(error),
        updatedAt: new Date().toISOString(),
      });
      await saveWatcherProgress(watcher.id, candidate.matchId, { lastCandidateStatus: candidate.status });
      await writeSystemCandidateAudit("candidate_failed", candidate);
      return candidate;
    }
  }

  await saveWatcherProgress(watcher.id, candidate.matchId, { lastCandidateStatus: candidate.status });
  return candidate;
}

export async function listPubgImportCandidates(limit = RECENT_CANDIDATE_LIMIT) {
  const candidates = await fetchDocumentCollection<PubgImportCandidate>(COLLECTIONS.pubgImportCandidates, limit).catch(
    () => []
  );

  return candidates.sort(
    (firstCandidate, secondCandidate) =>
      (secondCandidate.updatedAt ?? "").localeCompare(firstCandidate.updatedAt ?? "") ||
      secondCandidate.confidenceScore - firstCandidate.confidenceScore
  );
}

export async function getPubgImportCandidate(candidateId: string) {
  return getDocument<PubgImportCandidate>(COLLECTIONS.pubgImportCandidates, candidateId);
}

export async function applyPubgImportCandidateAction(
  request: Request,
  candidateId: string,
  action: "approve_publish" | "reject" | "force_import_draft"
) {
  const candidate = await getPubgImportCandidate(candidateId);
  if (!candidate) {
    throw new Error("Candidate not found.");
  }

  if (action === "reject") {
    const updatedCandidate = await saveCandidate({
      ...candidate,
      status: "ignored",
      reviewPending: false,
      rejectedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await saveWatcherProgress(updatedCandidate.watcherId, updatedCandidate.matchId, {
      lastCandidateStatus: updatedCandidate.status,
    });
    await writeAuditLogFromRequest(request, {
      action: "admin_rejected",
      entityType: "pubg_import_candidate",
      entityId: updatedCandidate.id,
      newValue: {
        eventId: updatedCandidate.tournamentId,
        matchId: updatedCandidate.matchId,
        confidenceScore: updatedCandidate.confidenceScore,
        reason: updatedCandidate.confidenceReason,
        status: updatedCandidate.status,
        actor: "admin",
        timestamp: new Date().toISOString(),
      },
    });
    return updatedCandidate;
  }

  const publish = action === "approve_publish";
  const nextStatus: PubgImportCandidateStatus = publish
    ? candidate.status === "auto_published"
      ? "auto_published"
      : "candidate"
    : "draft";
  await importCandidateMatch(candidate, publish);
  const updatedCandidate = await saveCandidate({
    ...candidate,
    status: nextStatus,
    reviewPending: publish ? false : true,
    importedDraftAt: publish ? candidate.importedDraftAt ?? new Date().toISOString() : new Date().toISOString(),
    publishedAt: publish ? new Date().toISOString() : candidate.publishedAt,
    updatedAt: new Date().toISOString(),
  });
  await saveWatcherProgress(updatedCandidate.watcherId, updatedCandidate.matchId, {
    imported: true,
    lastCandidateStatus: updatedCandidate.status,
  });
  await writeAuditLogFromRequest(request, {
    action: action === "approve_publish" ? "admin_approved" : "admin_force_draft",
    entityType: "pubg_import_candidate",
    entityId: updatedCandidate.id,
    newValue: {
      eventId: updatedCandidate.tournamentId,
      matchId: updatedCandidate.matchId,
      confidenceScore: updatedCandidate.confidenceScore,
      reason: updatedCandidate.confidenceReason,
      status: updatedCandidate.status,
      publishedAt: updatedCandidate.publishedAt,
      importedDraftAt: updatedCandidate.importedDraftAt,
      actor: "admin",
      timestamp: new Date().toISOString(),
    },
  });

  return updatedCandidate;
}
