# Bravo Gaming OBS broadcast overlay

The overlay is available at `/overlay` and reads only published match records from the existing `matches` collection.

## Browser source URLs

Replace `MATCH_ID` with the internal match record ID or the PUBG match ID saved on that record.

- Full broadcast package: `https://YOUR_DOMAIN/overlay?matchId=MATCH_ID`
- Match scoreboard: `https://YOUR_DOMAIN/overlay?matchId=MATCH_ID&scene=scoreboard`
- Winner reveal: `https://YOUR_DOMAIN/overlay?matchId=MATCH_ID&scene=winner`
- MVP reveal: `https://YOUR_DOMAIN/overlay?matchId=MATCH_ID&scene=mvp`
- Player stats: `https://YOUR_DOMAIN/overlay?matchId=MATCH_ID&scene=players`
- Lower third: `https://YOUR_DOMAIN/overlay?matchId=MATCH_ID&scene=lower-third`

## OBS setup

1. Open OBS Studio and select the scene for your PUBG PC broadcast.
2. Add a **Browser** source and paste one of the URLs above.
3. Set the browser source resolution to 1920 × 1080.
4. Enable **Shutdown source when not visible** only if you want the overlay to reload each time the scene is shown. Otherwise leave it off.
5. Keep the source above the gameplay capture in the Sources list.
6. Use separate Browser sources for different scenes if you want hotkey-driven winner/MVP/scoreboard reveals.

The feed checks for updated published match data every five seconds. Publishing or correcting the match in the existing admin workflow updates the overlay automatically.

## Data and limitations

- The endpoint exposes only a published, non-deleted match and returns no-store responses.
- Team placement, kills and points, plus player kills, assists and damage, are read from existing match result records.
- Headshots are shown only if a future import/data source supplies a per-player headshot count. The current shared `MatchPlayerResult` type does not store headshots, so the overlay displays a dash instead of inventing a value.
- The PUBG API provides match/telemetry data for eligible PUBG matches, but it does not automatically provide the private custom-room results from every Bravo scrim. Continue importing or entering verified results through the existing admin process.
- This overlay is a transparent graphics layer, not a full match observer feed: it does not draw live player positions, kill-feed events or a live minimap.

## Broadcast control room

Open `https://YOUR_DOMAIN/overlay/control` to select a published match, choose a graphic scene, preview the overlay, and copy its OBS Browser Source URL. The match list refreshes every 30 seconds. The control room is a setup/selection panel; it does not remotely switch scenes already added to OBS. Add each generated scene URL as its own OBS Browser Source if you want hotkey-based scene switching in OBS.
