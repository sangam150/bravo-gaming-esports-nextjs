"use client";
import type { MatchPlayerResult, Player, Team, TeamMatchResult } from "@/lib/types";
export default function MatchResultEntry({
  teams,
  players,
  knownTeams,
  knownPlayers,
  onTeams,
  onPlayers,
}: {
  teams: TeamMatchResult[];
  players: MatchPlayerResult[];
  knownTeams: Team[];
  knownPlayers: Player[];
  onTeams: (teams: TeamMatchResult[]) => void;
  onPlayers: (players: MatchPlayerResult[]) => void;
}) {
  const changeTeam = (index: number, patch: Partial<TeamMatchResult>) =>
    onTeams(teams.map((row, position) => (position === index ? { ...row, ...patch } : row)));
  const changePlayer = (index: number, patch: Partial<MatchPlayerResult>) =>
    onPlayers(players.map((row, position) => (position === index ? { ...row, ...patch } : row)));
  return (
    <section className="space-y-4" aria-label="Match result entry">
      <p className="text-sm text-text-muted">
        Enter observed placements and statistics. The scoring version calculates points. Public ruling reasons appear with published
        results.
      </p>
      <div className="table-scroll">
        <table className="data-table min-w-full">
          <caption>Team results</caption>
          <thead>
            <tr>
              {["Team", "Place", "Kills", "Damage", "Adjustment", "DQ", "Public ruling reason", ""].map((label) => (
                <th key={label} scope="col">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map((row, index) => (
              <tr key={index}>
                <td>
                  <select
                    aria-label={`Team ${index + 1}`}
                    className="input-esports min-w-48"
                    value={row.teamId ?? ""}
                    onChange={(event) => {
                      const selected = knownTeams.find((item) => item.id === event.target.value);
                      if (selected) changeTeam(index, { teamId: selected.id, teamName: selected.name, slotNumber: selected.slotNumber });
                    }}
                  >
                    <option value="">{row.teamName || "Choose team"}</option>
                    {row.teamId && !knownTeams.some((item) => item.id === row.teamId) ? (
                      <option value={row.teamId}>{row.teamName} (historical)</option>
                    ) : null}
                    {knownTeams.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </td>
                {(["placement", "kills", "damage", "adjustmentPoints"] as const).map((key) => (
                  <td key={key}>
                    <input
                      className="input-esports w-24"
                      aria-label={`Team ${index + 1} ${key}`}
                      type="number"
                      min={key === "adjustmentPoints" ? -1000 : key === "placement" ? 1 : 0}
                      step={key === "damage" || key === "adjustmentPoints" ? ".01" : "1"}
                      disabled={key === "adjustmentPoints" && row.disqualified}
                      value={row[key] ?? 0}
                      onChange={(event) => changeTeam(index, { [key]: Number(event.target.value) })}
                    />
                  </td>
                ))}
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Team ${index + 1} disqualified`}
                    checked={row.disqualified ?? false}
                    onChange={(event) => changeTeam(index, { disqualified: event.target.checked, adjustmentPoints: 0 })}
                  />
                </td>
                <td>
                  <input
                    className="input-esports min-w-48"
                    maxLength={500}
                    aria-label={`Team ${index + 1} public ruling reason`}
                    value={row.decisionReason ?? ""}
                    onChange={(event) => changeTeam(index, { decisionReason: event.target.value })}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => onTeams(teams.filter((_, position) => position !== index))}
                  >
                    Remove team {index + 1}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        className="btn-secondary"
        disabled={teams.length >= 64}
        onClick={() =>
          onTeams([
            ...teams,
            { teamName: "", placement: teams.length + 1, kills: 0, damage: 0, placementPoints: 0, killPoints: 0, totalPoints: 0 },
          ])
        }
      >
        Add team result
      </button>
      <p className="text-xs text-text-muted">
        Adjustments and match disqualifications require a platform administrator and an audited public reason. DQ gives zero official points
        and removes award eligibility; observed statistics remain historical records. A first-place DQ never automatically promotes another
        team.
      </p>
      <div className="table-scroll">
        <table className="data-table min-w-full">
          <caption>Player statistics</caption>
          <thead>
            <tr>
              {["Player", "Team", "Kills", "Assists", "Knocks", "Damage", "Survival seconds", ""].map((label) => (
                <th key={label} scope="col">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {players.map((row, index) => (
              <tr key={index}>
                <td>
                  <select
                    className="input-esports min-w-48"
                    aria-label={`Player ${index + 1}`}
                    value={row.playerId}
                    onChange={(event) => {
                      const selected = knownPlayers.find((item) => item.id === event.target.value);
                      const related = teams.find((item) => item.teamId === selected?.teamId);
                      if (selected)
                        changePlayer(index, {
                          playerId: selected.id,
                          playerName: selected.inGameName || selected.name,
                          pubgPlayerId: selected.pubgId,
                          teamId: related?.teamId ?? row.teamId,
                          teamName: related?.teamName ?? row.teamName,
                          placement: related?.placement ?? row.placement,
                        });
                    }}
                  >
                    <option value="">Select player</option>
                    {row.playerId && !knownPlayers.some((item) => item.id === row.playerId) ? (
                      <option value={row.playerId}>{row.playerName} (historical)</option>
                    ) : null}
                    {knownPlayers.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.inGameName || item.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    className="input-esports min-w-40"
                    aria-label={`Player ${index + 1} team`}
                    value={row.teamId ?? row.teamName}
                    onChange={(event) => {
                      const related = teams.find((item) => (item.teamId ?? item.teamName) === event.target.value);
                      if (related)
                        changePlayer(index, { teamId: related.teamId, teamName: related.teamName, placement: related.placement });
                    }}
                  >
                    <option value="">Select team</option>
                    {teams.map((item, position) => (
                      <option key={item.teamId ?? position} value={item.teamId ?? item.teamName}>
                        {item.teamName}
                      </option>
                    ))}
                  </select>
                </td>
                {(["kills", "assists", "knocks", "damage", "survivalTime"] as const).map((key) => (
                  <td key={key}>
                    <input
                      className="input-esports w-24"
                      aria-label={`Player ${index + 1} ${key}`}
                      type="number"
                      min={0}
                      step={key === "damage" ? ".01" : "1"}
                      value={row[key]}
                      onChange={(event) => changePlayer(index, { [key]: Number(event.target.value) })}
                    />
                  </td>
                ))}
                <td>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => onPlayers(players.filter((_, position) => position !== index))}
                  >
                    Remove player {index + 1}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        className="btn-secondary"
        disabled={players.length >= 256}
        onClick={() =>
          onPlayers([
            ...players,
            {
              playerId: "",
              playerName: "",
              teamName: teams[0]?.teamName ?? "",
              teamId: teams[0]?.teamId,
              placement: teams[0]?.placement ?? 1,
              kills: 0,
              assists: 0,
              knocks: 0,
              damage: 0,
              survivalTime: 0,
              placementPoints: 0,
              totalPoints: 0,
            },
          ])
        }
      >
        Add player statistics
      </button>
    </section>
  );
}
