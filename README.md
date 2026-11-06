# vitaliypikalo.com

Personal site of Vitaliy Pikalo, plus a short strategy game that tells the same story.

- `/`: single-page portfolio (about, experience, projects, open source, beyond code, contact)
- `/play`: the campaign, a Warcraft III-inspired game built with three.js. Visit five shrines to recruit a warband, then defeat the Final Round to win the resume.

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4 (tokens in `app/globals.css` under `@theme`)
- three.js for the game (loaded only on `/play`)
- Self-hosted fonts via `@fontsource`: Cinzel for display, Inter for body
- Deployed on Vercel

## Campaign controls

| Input | Action |
|---|---|
| Left-click a unit | Select it (Shift adds or removes) |
| Drag a box | Select every unit inside |
| Left- or right-click ground | Move the selection |
| Click the giant | Attack it |
| A, then click | Attack-move |
| S / H | Stop / hold position |
| Q / W / E | Medical Drone / Checkmate / Kelly Bet (hero abilities) |
| Ctrl+1–9, then 1–9 | Save and recall control groups (double-tap to center) |
| Ctrl+A or \` | Select the whole warband |
| F1 / Space | Select the hero / center the camera |
| Arrows, screen edge, middle-drag, touch drag | Move the camera |
| Minimap | Click to look, right-click to send units |

### The Final Round

- **Slam:** a red circle fills under the giant. Recruits step out; you move Vitaliy.
- **Boulder** (below 85% health): a small red zone appears under a backline unit, healer first, and fills over 3 seconds; then the boulder lands there. That unit doesn't dodge on its own: select it and step it out.
- **Stone shards** (at 55% and 25%): adds that hunt the healer and ranged units. The giant takes half damage while any shard lives.
- **Difficulty:** Story is meant to be won by selecting everyone and attacking; Veteran punishes ignoring the mechanics. Tuning lives in `DIFF` in `lib/game/engine.ts`.

### Vitaliy's abilities

Vitaliy auto-attacks; the player only presses abilities. Each comes from a project and unlocks at that chapter's shrine.

| Key | Ability | From | Effect | Unlocks at |
|---|---|---|---|---|
| Q | Medical Drone | CMU Project Ignite | Revives the last fallen recruit at half health, heals everyone 30% (20 s) | The Academy |
| W | Checkmate | Chess960-NN | 170 damage to the nearest enemy; stuns the giant 1.6 s and cancels a slam (10 s) | The Chess Forge |
| E | Kelly Bet | Kalshi bot | Warband deals 1.5x damage for 6 s (20 s) | The Market Watch |

Left-clicking the ground moves units (WC3 only uses right-click) so first-time players can play without knowing RTS controls.

### Sound

All audio is generated in the browser with the Web Audio API; there are no audio files and nothing to license.

- Effects (`lib/game/audio.ts`): 24 synthesized sounds for orders, combat, abilities, the slam, the boulder strike, and shards. They pan with screen position and play quieter off-screen.
- Music (`lib/game/music.ts`): an original score with an exploration loop, a battle loop when the giant wakes, and victory/defeat stingers.
- Unit voices: each unit has select and order lines (`barks` in `story.ts`). They show as speech bubbles; spoken lines use the browser's speech engine and are off by default.
- Audio starts on the first click or key press (browser autoplay rules). The top bar toggles all sound; the Controls panel has Sound, Music, and Unit voices, saved per browser.

## Editing content

- Site copy: `lib/content.ts`. Every experience entry needs a `period` (dates).
- Game story: `lib/game/story.ts` (shrine chapters, recruits, abilities, boss text, unit barks).
- Game balance: unit stats in `lib/game/units.ts`; `BOSS`, `DIFF`, `SHARD`, `BOULDER`, and `ABILITY` at the top of `lib/game/engine.ts`.
- Resume: replace `public/Vitaliy_Pikalo_resume.pdf`.

## Project structure

```
app/
  page.tsx          main site
  play/page.tsx     game route
  globals.css       theme tokens, HUD styles
  icon.svg          favicon
components/
  SideNav.tsx       scroll-spy section nav
  Spotlight.tsx     pointer light effect
  icons.tsx         inline SVG icons
  game/Campaign.tsx game HUD, dialogue, and engine lifecycle
  game/Minimap.tsx  rotated minimap
lib/
  content.ts        site copy
  game/engine.ts    three.js world, units, orders, combat, camera
  game/models.ts    procedural low-poly models
  game/fx.ts        pooled particles and effects
  game/nav.ts       grid A* pathfinding
  game/units.ts     unit stats
  game/story.ts     campaign script
  game/audio.ts     synthesized sound effects, mixer, settings
  game/music.ts     procedural score
```

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
npm run typecheck
```

Append `?debug=1` to `/play` to expose the engine as `window.__campaign` for automated playtests (`debugMoveTo(x, z)`, `debugState()`, `debugProject(x, y, z)`, `debugUnitsInObstacles()`, `debugSkipToBoss()`, `debugAttack(kinds, target)`, `debugMoveKinds(kinds, x, z)`).

## Workflow

`main` is production: every push to it deploys vitaliypikalo.com. Work never lands on `main` directly.

1. **Branch** from `main`, one branch per feature: `feature/<name>`, `fix/<name>`, `content/<name>`, or `docs/<name>`.
2. **Commit** in small, buildable steps with conventional messages (`feat(game): ...`, `fix: ...`, `content: ...`, `docs: ...`, `perf: ...`). Push after each commit; Vercel builds a preview for every push.
3. **Release checks** before merging:
   - `npm run typecheck` and `npm run build` pass, `npm audit --omit=dev` is clean
   - routes respond and old URLs still redirect
   - the campaign plays end to end (all shrines, unlocks, boss win on Story) and new mechanics are checked on Veteran
   - the Vercel preview for the branch's last commit is READY
4. **Merge** into `main` with a merge commit (`git merge --no-ff`) whose message summarizes the feature and the checks run.
5. **Verify** the production deployment is READY and the live site serves the change, then delete the branch.

If production breaks, roll back to the previous deployment in Vercel first, then fix forward on a `fix/` branch.

## Credits

Layout inspired by [Brittany Chiang](https://brittanychiang.com). The game is original work inspired by Warcraft III: The Frozen Throne and uses no Blizzard assets.
