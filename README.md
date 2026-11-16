# makefun-frontend

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/jiadabai159/makefun-frontend/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/jiadabai159/makefun-frontend/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

A fast, easy-to-use frontend for make.fun, built from static files on make.fun's public API. Read-only: no sign-in, no writes, data from `https://make.fun/api` only.

Entry for the make.fun bounty [makefun-frontend-01](https://make.fun/bounty/makefun-frontend-01): "Build the best make.fun frontend".

- Live bounty board — every bounty's live pot, entry fee, time left and entries; filter by open / closing soon / closed, sort by deadline, pot or entries, search, paged 24 at a time
- Bounty pages — summary, live pot, rewards table with fee shares, dates, rules and the latest entries
- Leaderboards — the API's own columns drive the table, so any competition's board renders, paged 50 at a time
- Public account profiles — picture, links, record and entries, reachable from any handle link

Performance is the point: one small ES module and one stylesheet, no framework, no third-party code at all. API answers are revalidated with ETags (a 304 inside the minute costs no body), a fresh answer is served from memory without a request, and the countdowns tick in place without rebuilding the page. First load is a few kilobytes gzipped.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

## Layout

- `app/` — the whole app: `index.html`, `main.js` (router), `api.js` (ETag-cached API client), `format.js` (money, dates, escaping), `views.js` (board, bounty, leaderboard, profile), `style.css`
- `main.ts` — the entrypoint: copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with `buildDossier`
- `screenshots/` — 3 screenshots of the running app on live make.fun data (see `shots.json`)
- `vendor/makefun-frontend.ts` — the kit's dossier library, unchanged
- `serve.ts` — a tiny static server for local testing

## Build the entry

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/bounty/makefun-frontend-01) as @vivid-meteor-10.</sub>
