# Friends League — Valorant fantasy leaderboard

A mobile-first leaderboard for friends that want to do valorant fantasy league. Plain HTML/CSS/JavaScript, no dependencies, no API keys. Real VFL event totals; ties share a rank. Missing users show a dash, never a made-up zero.

## Deploy to GitHub Pages

Repository: https://github.com/Dheeraj9489/vfl-leaderboard

The **public** repository is named `vfl-leaderboard`. Public repositories support Pages on GitHub Free. Upload this project's contents at the repository root, preserving `.github/workflows/deploy.yml` (hidden folders may not appear in Finder; press Command–Shift–Period). Do not upload the ZIP itself or put the whole project inside another folder.

The reliable terminal route, after creating the empty repository, is:

```sh
cd /path/to/vfl-leaderboard
git init -b main
git add .
git commit -m "Build friends fantasy leaderboard"
git remote add origin https://github.com/Dheeraj9489/vfl-leaderboard.git
git push -u origin main
```

1. In the repository, open **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Open **Actions → Update scores and deploy → Run workflow** on `main`.
4. Once the run succeeds, open `https://Dheeraj9489.github.io/vfl-leaderboard/`.

If the first automatic run failed before Pages was enabled, run it again after step 2. If uploading through GitHub's web interface, make sure `.github/workflows/deploy.yml` exists: create that exact path using **Add file → Create new file** and paste the included workflow if necessary.

## Add or remove friends

Edit **league.json** in GitHub using the pencil button. Add a quoted username to the `usernames` array, separated by commas:

```json
{
  "name": "The Friends League",
  "eventId": null,
  "usernames": ["snipper19", "xyvalt", "tekkers4270", "baljeettj", "newfriend"]
}
```

Click **Commit changes** to save on `main`. The workflow fetches scores and republishes automatically. No HTML edits are needed. Usernames are matched exactly, ignoring case and surrounding spaces; duplicates are removed.

`name` changes the page heading and browser title. `eventId: null` follows VFL's current event automatically. To stay on Champions Shanghai, set `eventId` to `11`. Scores always represent the selected event's total, not a single gameweek.

## Updates and reliability

- GitHub Actions fetches fresh scores every 30 minutes from 4 a.m. through noon CDT (UTC−5), including a final noon update, on pushes to `main`, and on manual runs. Scheduled runs can be delayed by GitHub; this is not a real-time feed.
- The page's Refresh button reloads the latest published snapshot. It does not trigger an Action or query VFL directly.
- The last successful deployment stays online if VFL is unavailable or its response format changes. The page shows a warning during the update window when the snapshot is over 90 minutes old. Inspect failed runs in **Actions**.
- GitHub may disable scheduled workflows in public repositories after 60 days without repository activity. Re-enable the workflow in Actions if needed.
- Only usernames, point totals, event name/ID, and update time are published. No account login or VFL credentials are used.
- These are VFL's public website endpoints, not a guaranteed or versioned API. Changes upstream may require updating `update-scores.mjs`.
- The initial checked-in snapshot contains actual scores captured during development. Deployed snapshots are generated in Actions and do not create repository commits.

## Run locally

Install Node.js 22 or newer, then:

```sh
node update-scores.mjs
node --test scores.test.mjs
python3 -m http.server 4173 
```

Open http://localhost:4173. Use an HTTP server; opening index.html directly blocks JSON loading in some browsers.

## Project map

- `league.json` — edit friends, league name, or event.
- `index.html`, `styles.css`, `app.js`, `leaderboard.json` — the only files published to Pages.
- `update-scores.mjs` — verifies exact usernames and retrieves score snapshots.
- `scores.test.mjs` — checks zero scores, missing users, exact matching, deduplication, and failure behavior.
- `.github/workflows/deploy.yml` — scheduled update and deployment.

Data source: https://www.valorantfantasyleague.net/leaderboard

Independent fan project; not affiliated with VFL or Riot Games.

## Roster links

Click a manager’s name to expand their roster on the leaderboard. Add a profile link in the `teamUrls` object in `league.json`, for example:

```json
"teamUrls": {
  "snipper19": "https://www.valorantfantasyleague.net/team/56047",
  "patricka": "https://www.valorantfantasyleague.net/team/REPLACE_WITH_ID"
}
```

Replace REPLACE_WITH_ID with the numeric ID from the actual profile. Omit unknown links or use null. Keep adding usernames to `usernames` as before. Saving changes triggers a deployment. Missing or temporarily unavailable rosters do not stop score updates. Rosters and scores refresh together.

The automatic schedule uses fixed CDT (UTC−5), as requested, rather than changing with winter Central Standard Time. Pushes and manual workflow runs can still update and deploy outside the scheduled window.
