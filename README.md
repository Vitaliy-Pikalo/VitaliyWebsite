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
| Q / W | Deploy / Rally (hero abilities) |
| Ctrl+1–9, then 1–9 | Save and recall control groups (double-tap to center) |
| Ctrl+A or \` | Select the whole warband |
| F1 / Space | Select the hero / center the camera |
| Arrows, screen edge, middle-drag, touch drag | Move the camera |
| Minimap | Click to look, right-click to send units |

Left-clicking the ground moves units (WC3 only uses right-click) so first-time players can play without knowing RTS controls.

## Editing content

- Site copy: `lib/content.ts`. Experience entries take an optional `period` for dates.
- Game story: `lib/game/story.ts` (shrine chapters, recruits, boss text).
- Game balance: unit stats in `lib/game/units.ts`; `BOSS`, `DEPLOY`, and `RALLY` at the top of `lib/game/engine.ts`.
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
  game/nav.ts       grid A* pathfinding
  game/units.ts     unit stats
  game/story.ts     campaign script
```

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
npm run typecheck
```

Append `?debug=1` to `/play` to expose the engine as `window.__campaign` for automated playtests (`debugMoveTo(x, z)`, `debugState()`, `debugProject(x, y, z)`, `debugUnitsInObstacles()`).

## Credits

Layout inspired by [Brittany Chiang](https://brittanychiang.com). The game is original work inspired by Warcraft III: The Frozen Throne and uses no Blizzard assets.
