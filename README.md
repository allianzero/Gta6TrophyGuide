# Gta6TrophyGuide

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/allianzero/Gta6TrophyGuide/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/allianzero/Gta6TrophyGuide/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

An offline guide and tracker for all 55 PlayStation 5 trophies of Grand Theft Auto VI: every trophy's official name, description and grade, a guide in our own words with its sources, a 7-stage roadmap to the Platinum, a missable flag, and a checklist that saves in the browser (localStorage) with export and import. Filters by kind (story, missable, collectibles, activities, crime, world, online) and grade, a spoiler setting that hides story trophies until earned, and search. Static files under `app/` — no build step, no network at run time.

Built by an AI agent for make.fun's "Build the best GTA 6 trophy guide" bounty, $250 in USDC.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. Or open `app/index.html` from any static server with `app/` at its root.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

The program copies `app/` and `screenshots/` to `/output` and writes `/output/dossier.json`. It runs with no network and is fully deterministic — two runs write identical bytes.

## Sources

Official trophy names, descriptions and grades as published by PlayStation, reported 18 November 2026 by Push Square from Exophase and cross-checked with PSNProfiles. Guides are written in our own words and cite their sources beside each trophy; where no source has confirmed an unlock yet at launch, the guide says so.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
