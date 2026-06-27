# Empire Engine — Complete Reference

**Live:** https://gunsam-999.github.io/empire-engine/ | **Repo:** gunsam-999/empire-engine

---

## What Is This?

Empire Engine is a mobile-first idle tycoon PWA. You found a company, automate production, hire advisors, manage rivals, run PR campaigns, and eventually restructure (prestige) to compound your dynasty. The entire economy runs in a background tick; no external server.

**Stack:** Vite 5 + React 18 + TypeScript + Tailwind CSS v3. Save: localStorage (auto every 30 s + manual). Deploy: GitHub Pages via GitHub Actions on every push to `main`.

---

## Quick Start

1. Open the live URL (PWA — installable from the browser menu).
2. Choose an industry; name your company; pick an ethics philosophy.
3. Tap **Buy** on facilities to build production capacity.
4. Watch revenue compound. Unlock Marketing, Research, Advisors, and World Systems tabs as you grow.
5. At the Prestige tab, restructure when ready — you keep your dynasty traits, advisors, and momentum.

---

## Feature Map

### Economy
- **Facilities:** each tier yields more revenue/s; buy 1 / ×10 / ×100 / max.
- **Multipliers stacked in order:** base facility rate × workers × companions × echelon × dynasty × premise × aide passive × public affairs × rival pressure × market price × manager bonus × reputation.
- **Market:** price cycles ±50%; a Market Boom raises music brightness and increases the master volume nudge.
- **Research:** upgrades unlock permanent multipliers; cost scales logarithmically.
- **Marketing channels:** Ads / Social / PR / Community; each has audience reach + brand.

### Story & People
- **Story beats** (70+): narrative arc across 5 acts, gated by lifetime earnings.
- **Advisors:** collect 12+ specialists; each grants a passive prod/cost modifier.
- **Companions:** co-founder always present; Ravi (lieutenant) + Priya (strategist) unlock by LE. Each has a trust rung (STRANGER → CONFIDANT); trust drifts from rival pressure / ethics.
- **Workforce:** 3–10 named workers (deterministic from game seed); morale decays under pressure; Rally button (+15 morale, 60 s cooldown) counters it.
- **Aides:** 6 specialists (legal, PR, finance, tech, logistics, creative). Brief (+loyalty) → Deploy (events.boost for their domain). Passive mult at loyalty ≥ 75.

### Rival System
- 6 rival companies with unique posture ladders (NEUTRAL→HOSTILE→WAR).
- Telegraphs: 45–90 s warning before an attack; counter buttons available.
- Coalition: when player dominates, all rivals unite (−2 morale/min, +20 agg).
- Intel Desk: commission reports (50 influence, 5 min cooldown) to confirm feints vs real threats.
- Feint system: if player counters the same move ≥ 2 times, rivals switch to feints (safe but scary).

### Director (Era System)
Five eras: BOOTSTRAPPING → GROWING → SCALING → ESTABLISHED → TITAN.
- Unlocks new story beats, raises the rival aggression ceiling, shifts music BPM and layer mix.
- BPM arc: 88 (Bootstrapping) → 96 → 104 → 112 → 120 (Titan).
- Director also gates co-founder coaching pop-ups and golden bubbles.

### Prestige & Dynasty
- Reset the run; keep dynasty traits + echelon momentum + companion trust.
- Dynasty traits accumulate across runs: iron_ethicist / war_hardened / loyal_house / covenant_keeper / titan_touch / iron_will.
- Heirlooms: reach specific milestones to unlock permanent passive boosts for future runs.
- Emergent beats: procedurally generated story beats per dynasty trait, only available after the first prestige.

### Echelon
STARTUP → CONTENDER → PLAYER → LEADER → MOGUL → TITAN (by lifetime earnings).
- Grants +0%→+30% production bonus.
- Each tier advance fires a celebration + music stinger.

### World Systems
- **Newspaper:** negative coverage (heat 0–100) decays production by up to 18%. Respond with influence to clear heat.
- **Notifications:** real-time bell — rival telegraphs, coalition, clause breaches, press attacks.
- **Public Affairs:** confidence (0–100) drives 0.80–1.30× production. Issue statements (200 influence, 10 min cooldown).
- **Premise / Old Master's Will:** 5 clauses (growth, ethics, labour, diplomacy, loyalty). Fulfil each over time to earn prod/cost rewards; breach them and lose those rewards after a grace period.
- **Dispatch Feed:** live ambient log of big in-world events (rival moves, companion trust shifts, morale crossings, premise changes, era transitions).

---

## Music System (Part 8)

### Architecture

Empire Engine generates its entire soundtrack procedurally — no audio files, no CDN, zero bundle cost. The `MusicEngine` module (`src/systems/MusicEngine.ts`) shares the Web Audio `AudioContext` with `AudioEngine` (via `getAudioCtx()`) and attaches its own sub-graph:

```
layers (6 × GainNode) → musicMaster GainNode (0.24) → DynamicsCompressor → destination
```

### The Score

**Key:** C natural / harmonic minor  
**Chord loop (4 bars, 64 × 16th notes):**
- Bar 1 — **Cm7**: dark home, pad enters on bar start
- Bar 2 — **Fm7**: searching, tension
- Bar 3 — **Ebmaj7**: relief, dreaming
- Bar 4 — **G7**: dominant pull (harmonic minor B-natural)

**Melody:** 64-step C minor pentatonic hook across the 4-bar loop.  
**Arp:** 8th-note ARP_SEQ `[0,1,2,3,2,1,0,1]` cycling through chord tones.  
**Percussion:** 16-step bar `K · H · · H | S · H · · H | K · H · · H | S · H Oh ·`.

### 6 Mix Layers

| Layer | Bootstrapping | Growing | Scaling | Established | Titan |
|---|---|---|---|---|---|
| Pad (choir) | 0.55 | 0.55 | 0.50 | 0.48 | 0.52 |
| Bass | 0 | 0.62 | 0.70 | 0.80 | 0.88 |
| Melody | 0 | 0 | 0.58 | 0.66 | 0.74 |
| Arp | 0 | 0 | 0 | 0.50 | 0.66 |
| Perc | 0 | 0 | 0.48 | 0.68 | 0.82 |
| Tension | 0 → rival threat | — | — | — | — |

Layer gain crossfades use a 5-second `linearRampToValueAtTime` on every era change — no jarring cuts.

### Tension Layer

A C2 + F#2 tritone pair (maximum dissonance) routed through a low-pass filter with a 0.14 Hz LFO on the cutoff. Gives a slow-breathing, organic drone that rises in proportion to active rival threats (0 → 0.42 gain). Automatically falls silent when all rivals are at peace.

### Stingers

The `music.sting(kind)` API ducks the main mix to 6% and plays a synthesized one-shot:

| Kind | Duration | Moment |
|---|---|---|
| `'prestige'` | 9 s | Rising 5-note climax → chord sustain. Fires on restructure. |
| `'era'` | 5 s | Low brass-like power swell. Fires on era advance. |
| `'milestone'` | 3 s | Bright ascending 4-note fanfare. Fires on milestone unlock. |
| `'threat'` | 2.5 s | Dissonant tritone stab (C4 + F#5). Fires on new rival telegraph. |

### New SFX (Part 8)

| Name | Use | Sound |
|---|---|---|
| `tierUnlock` | Echelon tier climbed | Ascending gate-opening sweep |
| `rivalAlert` | New rival telegraph appears | Dissonant square-wave danger ping |
| `echelonUp` | 4-step major arpeggio | Triumphant ascending shimmer |
| `companionUp` | Trust rung advance | Warm sine-tone 3-note chord |
| `fanfare` | Biggest celebrations | Full 4-note + tail celebration |

### Settings

**Settings → Preferences → Music** toggle (on by default). Saved in `state.settings.music`; migrated from v1 saves (defaults to true). Immediately calls `music.setEnabled()` on toggle.

### Autoplay Policy

Music starts on the first user click / touchstart after the app loads (`useMusicEngine` hook registers `{ once: true }` listeners on `document`). This satisfies browser autoplay restrictions — the AudioContext is created lazily by `AudioEngine` on the very first `sfx.play()`, which already requires a gesture.

---

## Settings Reference

| Setting | Default | Effect |
|---|---|---|
| Buy quantity | ×1 | Facilities purchased per tap (1 / ×10 / ×100 / Max) |
| Sound effects | On | All synthesized SFX |
| Music | On | Adaptive procedural soundtrack |
| Haptics | On | Vibration API (mobile) |
| Reduce motion | Off | Disables aurora blobs, FX particles, confetti (card only) |
| Live Empire View | Off | Animated city canvas on the Empire screen |

---

## Visual Systems

### Ambient Backdrop
Three drifting blurred colour blobs + top spotlight behind the entire UI. Intensity and warmth scale with the current director era (`ERA_INTENSITY` / `ERA_WARMTH`). Spotlight tints by market mood (boom = warm; bust = cool). Disabled at full opacity in reduce-motion mode.

### FX Layer
On every facility buy: `fx.fromElement()` spawns floating `+$N` gains and spark particles from the tapped button; tap ring ripple also fires. Larger buys emit bigger flourishes. All FX are capped and reduce-motion-aware.

### Celebration Host
Canvas confetti (procedural ribbons with gravity + flutter) behind a swell-in title card. Fires for: milestone unlocks, echelon tier advances, era transitions, and prestige. Reduce-motion shows only the title card, no canvas.

### Aurora (Ambient Backdrop)
Uses CSS `backdrop-filter: blur` + Tailwind utilities; no canvas overhead. Era intensity map:
- BOOTSTRAPPING: dim (opacity 0.22)
- TITAN: vivid (opacity 0.55), warm amber tones.

---

## Troubleshooting

### Sound / Music silent after refresh
Browsers suspend AudioContext until the next user gesture. Tap anywhere in the game to resume. The engine calls `ctx.resume()` on every scheduler tick and every `sfx.play()`.

### Music doesn't start
Check Settings → Music toggle. If it's off, toggle it on — this calls `music.setEnabled(true)` and `music.start()`. On first load, start requires one user gesture (any click).

### Game feels too easy / hard after prestige
Dynasty traits compound across runs. By run 3–4 you may have 2–3 active traits (e.g. `iron_ethicist` + `war_hardened`). This is by design — each run is meaningfully shorter.

### Progress wipes after clearing browser data
The game auto-saves to `localStorage` key `empire_v1` every 30 seconds. Export your save (Settings → Export) to clipboard before clearing data.

### Rival telegraphs won't stop
Under coalition, all rivals are in heightened threat posture. Commission Intel reports to expose feints (50 influence each). Raise ethics above 20 (`+0.3 morale/min` per worker) and companion trust above 60 to stabilise morale. Reaching a prestige reset removes the coalition.

### Screen blank on first load
The inline boot splash in `index.html` renders a branded frame immediately; if you see it for more than 2 s, the JS bundle may be blocked (ad blocker, slow connection). Hard-refresh (Ctrl+Shift+R) clears service-worker cache.

### TypeScript / build errors
```
cd empire-engine
npm install
npm run build
```
All 9 music files are pure TypeScript with no external audio deps. If `getAudioCtx` is missing, ensure `AudioEngine.ts` is at the correct path (`src/systems/`).

---

## Deployment

Push to `main` → GitHub Actions runs `npm run build` → uploads `dist/` to `gh-pages` branch → live in ~2–3 minutes.

```bash
cd empire-engine
git push origin main
```

PWA service worker (`public/sw.js`) auto-updates on next app load after deploy.

---

## Development

```bash
cd empire-engine
npm install
npm run dev       # dev server on :5173
npm run build     # TypeScript check + Vite production build
```

`launch.json` in the parent workspace starts the dev server via VS Code (F5).

Key file map:
- `src/game/GameContext.tsx` — reducer, tick, save migration
- `src/game/types.ts` — all GameState types
- `src/systems/` — AudioEngine, MusicEngine, EconomyEngine, RivalEngine, etc.
- `src/hooks/useMusicEngine.ts` — game state → music wiring
- `src/hooks/useCelebrations.ts` — celebration + music sting watcher
- `src/components/screens/` — tab screens
- `src/components/shared/` — reusable panels and overlays
- `src/data/` — advisors, rivals, companions, milestones, story beats, etc.
