# Empire Engine — Game Logic Reference

> Exhaustive map of every system, formula, constant, and mechanic.

---

## Table of Contents

1. [Game State Structure](#1-game-state-structure)
2. [Core Multiplier Stack](#2-core-multiplier-stack)
3. [Production System](#3-production-system)
4. [Facility Purchasing](#4-facility-purchasing)
5. [Research System](#5-research-system)
6. [Prestige System](#6-prestige-system)
7. [Advisor System](#7-advisor-system)
8. [Market System](#8-market-system)
9. [Territory System](#9-territory-system)
10. [Event System](#10-event-system)
11. [Marketing System](#11-marketing-system)
12. [Story Engine](#12-story-engine)
13. [Guidance System](#13-guidance-system)
14. [Achievement / Milestone System](#14-achievement--milestone-system)
15. [Game Loop & Tick](#15-game-loop--tick)
16. [Offline Progress](#16-offline-progress)
17. [Save / Load System](#17-save--load-system)
18. [Industries & Facilities](#18-industries--facilities)
19. [Research Nodes](#19-research-nodes)
20. [Action Reducer Contract](#20-action-reducer-contract)
21. [Constants Reference](#21-constants-reference)

---

## 1. Game State Structure

**File:** `src/game/types.ts`

### Top-level GameState fields

| Field | Type | Description |
|---|---|---|
| `version` | `number` | Save format version (current: 2) |
| `setup` | `CompanySetup` | Company name, industry, accent, philosophy, foundedAt |
| `cash` | `number` | Liquid currency |
| `resource` | `number \| undefined` | Stockpiled production (when stockpiling mode is on) |
| `lifetimeEarnings` | `number` | Total cash ever earned; gates tier & prestige unlocks |
| `insight` | `number` | Research currency |
| `influence` | `number` | Advisor & prestige currency |
| `legacyPoints` | `number` | Tier-1 prestige currency (accumulated across rebirths) |
| `prestigeCount` | `number` | Number of Restructure prestiges completed |
| `masteryStars` | `number` | Tier-2 prestige currency (from IPO) |
| `transcendShards` | `number` | Tier-3 prestige currency (from Conglomerate) |
| `facilities` | `Record<string, number>` | Count of each facility owned |
| `research` | `ResearchState` | Completed nodes + active node |
| `advisors` | `AdvisorState` | Owned, assigned, cooldowns |
| `story` | `StoryState` | Seen beats, queue, ethics score, act |
| `territory` | `TerritoryState` | Unlocked regions, active expansion |
| `market` | `MarketState` | Price multiplier, trend, history, demand shift timer |
| `events` | `EventState` | Active boost, micro-event timer, golden bubble timer |
| `milestones` | `string[]` | One-time achievement IDs unlocked |
| `marketing` | `MarketingState` | Reach, audience, followers, brand, channels, campaign |
| `cofounder` | `CofounderState` | Name, role, avatar customization |
| `guidance` | `GuidanceState` | Seen/queued/dismissed coach beats, last shown timestamp |
| `settings` | `Settings` | Sound, buy-quantity mode, live-view toggle |
| `stats` | `Stats` | clicks, playSeconds, prestiges, created timestamp |
| `lastTick` | `number` | Timestamp of last game-loop tick |
| `lastSaved` | `number` | Timestamp of last save |

### CompanySetup

| Field | Values |
|---|---|
| `name` | Player-entered string |
| `industry` | One of 8 industry IDs |
| `accent` | Color theme string |
| `philosophy` | `'efficiency'` \| `'innovator'` \| `'aggressive'` \| `'people_first'` |
| `foundedAt` | Unix timestamp |

### ResearchState

```
completed: string[]           // node IDs already researched
active: { id, startedAt, endsAt } | null
```

### AdvisorState

```
owned:     Record<advisorId, level>
assigned:  Record<facilityId, advisorId>   // 1-to-1
cooldowns: Record<advisorId, cooldownEndsAt>
```

### StoryState

```
seen:   string[]    // completed beat IDs
queue:  string[]    // beats waiting to be shown
ethics: number      // cumulative score (-20 to +20)
act:    number      // current act (1–5)
```

### TerritoryState

```
unlocked:  string[]                          // region IDs
expanding: { id, endsAt } | null
```

### MarketState

```
priceMul:      number       // 0.4 – 2.0
trend:         number       // recent direction
history:       number[]     // last 40 price samples
demandShiftAt: number       // timestamp for next demand shift
stockpiling:   boolean      // true → accumulate resource instead of selling each tick
```

### EventState

```
boost:       { mult, endsAt, source } | null
lastMicroAt: number
bubbleAt:    number
```

### MarketingState

```
reach:     number
audience:  number
followers: number
brand:     number     // starts at 1
channels:  Record<channelId, { level, active, invested, progressMs }>
campaign:  { id, name, endsAt, reachMult } | null
```

### Settings

```
sound:    boolean
buyQty:   1 | 10 | 100 | 'max'
liveView: boolean
```

### Stats

```
clicks:      number    // facility purchase count
playSeconds: number
prestiges:   number
created:     number    // unix timestamp
```

---

## 2. Core Multiplier Stack

**File:** `src/systems/EconomyEngine.ts` — `getMultipliers(state)`

Every numeric effect flows through a single multiplier object `M`. Nothing bypasses it.

### M.production

```
M.production = philosophyProd
             × prestigeMult
             × researchProd
             × eventMult
             × advisorProd
             × marketingMult
```

| Factor | Formula |
|---|---|
| `philosophyProd` | `1.15` if philosophy = `'efficiency'`, else `1` |
| `prestigeMult` | `1.01^legacyPoints × (1 + 0.25×masteryStars) × (1 + 0.5×transcendShards)` |
| `researchProd` | `∏(1 + effect.value)` for all completed production-branch research |
| `eventMult` | `boost.mult` if active and not expired, else `1` |
| `advisorProd` | `∏ assignmentMult` for all assigned advisors (see §7) |
| `marketingMult` | `1 + log₁₀(1 + audience) × 0.12 + (campaignActive ? 0.25 : 0)` |

### M.cost

```
M.cost = clamp(∏(1 - effect.value) for all cost-branch research, 0.1, 1)
```

Minimum 10% of base cost — no free facilities.

### M.insight

```
M.insight = researchInsight × advisorInsight

researchInsight = ∏(1 + effect.value) for all innovation-branch research
advisorInsight  = ∏(1 + advisor.insightBonus × level) for all owned advisors
```

### M.prestige

```
M.prestige = 1.01^legacyPoints × (1 + 0.25×masteryStars) × (1 + 0.5×transcendShards)
```

Identical to the prestige factor inside `M.production`. Exposed separately for UI display.

---

## 3. Production System

**File:** `src/systems/ProductionChain.ts`

### Per-facility production per second

```
prodPerSec(id) = count[id]
               × baseRate[id]
               × M.production
               × chainBonus(tier[id])
               × facilityAdvisorMult(id)
```

### Chain bonus

```
chainBonus(tier) = 1 + 0.02 × count_of_facilities_at_(tier - 1)
```

Tier-1 facilities have no chain bonus (no tier-0 exists). Higher tiers receive a 2% additive bonus per lower-tier facility owned. Encourages broad ownership rather than rushing the latest tier.

### Facility advisor multiplier

```
facilityAdvisorMult(id) = assignmentMult of the advisor assigned to id
                        = 1 if no advisor assigned
```

(See §7 for full `assignmentMult` formula.)

### Income per second

```
incomePerSec = resourceProdPerSec × marketPrice

resourceProdPerSec = Σ prodPerSec(id) for all unlocked facilities
marketPrice        = clamp(priceMul, 0.4, 2.0)
```

When `stockpiling = true`, `resourceProdPerSec` accumulates to `resource` instead of converting to cash each tick. Selling manually via `SELL_RESOURCE` converts at the current `marketPrice`.

### Insight per second

Only facilities at Tier 3 and above generate insight.

```
insightPerSec = Σ (count[id] × 0.05 × baseRate[id]) for tier3+ facilities
              × M.insight
```

### Influence trickle

Passive influence accretes at a small rate driven by completed research and advisors with `influence` bonus type.

---

## 4. Facility Purchasing

**File:** `src/systems/EconomyEngine.ts`

### Geometric cost series

All facilities follow a geometric price curve. Buying qty units when n are already owned:

```
geometricCost(unit, r, n, qty) =
    unit × r^n × (r^qty - 1) / (r - 1)   [when r ≠ 1]
    unit × qty                              [when r = 1]

where:
  unit = baseCost[id] × M.cost
  r    = costMul[id]        (per-facility growth rate, 1.07–1.15)
  n    = facilities[id]     (currently owned)
  qty  = quantity to buy
```

### Base costs

```
baseCost(tier, slot) = 10^(3 × (tier - 1)) × 6^slot
```

Tier-1 slot-0 starts at ~1. Tier-5 slot-9 reaches into the trillions. Each slot within a tier is roughly 6× the previous; each tier is 1000× the previous tier's base.

### Cost multiplier per tier

| Tier | `costMul` |
|---|---|
| 1 | 1.07 |
| 2 | 1.08 |
| 3 | 1.10 |
| 4 | 1.12 |
| 5 | 1.15 |

### Max affordable

```
maxAffordable(id) = largest qty such that geometricCost(unit, r, n, qty) ≤ cash
```

Solved numerically (binary search or closed-form log inversion).

### Tier unlock thresholds

Tiers unlock based on `lifetimeEarnings`:

| Tier | Unlock at |
|---|---|
| 1 | $0 (always available) |
| 2 | $10,000 |
| 3 | $10,000,000 |
| 4 | $10,000,000,000 |
| 5 | $10,000,000,000,000 |

Individual industries may override with a custom `tierUnlock[]` array.

---

## 5. Research System

**File:** `src/systems/ResearchSystem.ts`, `src/data/research.ts`

### Research duration

```
researchDurationMs = node.timeSec × 1000 / philosophySpeed

philosophySpeed = 1.15 if philosophy = 'innovator', else 1
```

`'innovator'` philosophy gives a permanent 15% research speed bonus.

### Prerequisites

All nodes are chained within their branch — Tier N requires Tier N-1 completed. Cross-branch dependencies exist at higher tiers (e.g., Production Tier 4 requires Efficiency Tier 2).

### Only one active research at a time

`research.active` stores the single in-progress node. Starting a new research when one is active replaces it (the old node's progress is lost).

### Research effect application

Each node carries `effects: Array<{ type, value }>`. Effects stack multiplicatively within their type across all completed nodes.

---

## 6. Prestige System

**File:** `src/data/prestige.ts`, `src/systems/EconomyEngine.ts`

### Three prestige tiers

#### Tier 1 — Restructure

Requirement: `potentialLP > 0` OR owns any Tier-3+ facility.

```
potentialLP = base + floor(base × 0.1 × prestigeCount)

base = floor(log₁₀(lifetimeEarnings / 1e6))
     = 0 if lifetimeEarnings < 1e6
```

Each prior prestige gives a 10% bonus to base LP earned. Rewards grinding multiple cycles.

**What resets:**
- Cash, resource
- All facility counts
- Insight
- Active research (completed research kept)
- Market state
- Active event boosts

**What persists:**
- Completed research nodes
- Advisors (owned levels, assignments, cooldowns)
- Story progress and ethics score
- Territory unlocks
- Legacy Points, Influence, Mastery Stars, Transcend Shards
- Stats (clicks, playtime, prestige count)

**Permanent benefit:** Each LP contributes `1.01^totalLP` to production (compounding).

#### Tier 2 — IPO

Requirement: 500 total LP accumulated.

**What additionally resets:** Most research, influence stockpile.

**Grants:** 1 Mastery Star.

```
Mastery Star bonus = +25% to prestige multiplier
M.prestige factor  = (1 + 0.25 × masteryStars)
```

Unlocks: Tier-2 prestige research branch, Legendary advisors.

#### Tier 3 — Conglomerate

Requirement: 50 Mastery Stars.

**What additionally resets:** All advisors except founder.

**Grants:** 1 Transcend Shard.

```
Transcend Shard bonus = +50% to prestige multiplier
M.prestige factor     = (1 + 0.5 × transcendShards)
```

Unlocks: Cross-industry facility access.

### Combined prestige multiplier

```
M.prestige = 1.01^legacyPoints
           × (1 + 0.25 × masteryStars)
           × (1 + 0.50 × transcendShards)
```

All three factors multiply together. Late-game power is dominated by LP count inside the exponential.

---

## 7. Advisor System

**File:** `src/systems/AdvisorSystem.ts`

### Roster

40 advisors total — 5 per industry (8 industries), each with 4 rarities:

| Count per industry | Rarity |
|---|---|
| 2 | Common |
| 1 | Rare |
| 1 | Epic |
| 1 | Legendary |

### Assignment multiplier

```
assignmentMult(advisor, state) =
    1 + advisor.bonus.value
      × sameIndustry
      × (1 + 0.1 × advisor.level)
      × peopleMult

sameIndustry = 1.5 if advisor.industry === setup.industry, else 1.0
peopleMult   = 1.15 if philosophy = 'people_first', else 1.0
```

Assigning an advisor from the same industry gives 50% extra effectiveness. `'people_first'` philosophy stacks another 15% on top.

### Advisor stacking in M.production

All assigned advisors multiply together:

```
advisorProd = ∏ assignmentMult(advisor) for every assigned advisor
```

### Leveling

```
levelCost(level) = 50 × 1.6^level   (paid in influence)
```

Level increases the `(1 + 0.1 × level)` term inside `assignmentMult`, amplifying the base bonus linearly.

**Level caps by rarity:**

| Rarity | Max Level |
|---|---|
| Common | 10 |
| Rare | 15 |
| Epic | 20 |
| Legendary | 30 |

### Active abilities (Legendary only)

```
cooldownSeconds = 600   (10 minutes)
boostMult       = 5–6×
boostDuration   = 25–30s
cost            = influence (varies per advisor)
```

Activating sets `cooldowns[advisorId] = now + cooldownSeconds`. The `ADVISOR_ACTIVATE` action validates the cooldown has expired before applying the boost.

### Recruitment

Recruitment is gated by prestige tier or story progress, not by currency. Choosing to recruit simply adds the advisor at level 1.

---

## 8. Market System

**File:** `src/systems/MarketSystem.ts`

### Price random walk with mean reversion

Each tick:

```
scale     = clamp(dt / 1, 0, 1)
noise     = (random() - 0.5) × 2 × 0.03 × scale
delta     = (1 - priceMul) × 0.04 × scale + noise

priceMul += delta
priceMul  = clamp(priceMul, 0.4, 2.0)
```

The `(1 - priceMul) × 0.04` term creates mean reversion toward 1.0. Noise provides genuine volatility.

### Shocks (per tick)

```
if random() < 0.01: priceMul += 0.25   // boom
if random() < 0.01: priceMul -= 0.25   // crash
```

Applied before clamping. Both can trigger in the same tick (net zero, but rare).

### Demand shift

Every 60–180 seconds a demand shift fires, changing which tier gets a bonus on that window. Exact mechanism: `demandShiftAt` is reset to `now + random(60000, 180000)`.

### Price history

Last 40 price samples are stored in `market.history` for the in-game chart. New samples append, old ones drop when length exceeds 40.

### Stockpile mode

When `stockpiling = true`:

- Production accumulates to `state.resource` instead of `state.cash`.
- `SELL_RESOURCE` action liquidates all `resource` at the current `priceMul`.
- Strategy: accumulate during a crash, sell during a boom.

---

## 9. Territory System

**File:** `src/systems/TerritorySystem.ts`

### Regions

| ID | Bonus | Unlock Cost | Expand Time |
|---|---|---|---|
| `home` | +10% production | Free (starts unlocked) | — |
| `coast` | +15% market stability | $50,000 lifetime | 120s |
| `capital` | +20% influence | $1,000,000 lifetime | 300s |
| `frontier` | +25% production | $50,000,000 lifetime | 600s |
| `overseas` | +30% insight | $1,000,000,000 lifetime | 1,200s |
| `orbit` | +50% production | $100,000,000,000 lifetime | 2,400s |

### Expansion duration

```
expandDurationMs = region.expandSeconds × 1000 × aggressiveMult

aggressiveMult = 0.85 if philosophy = 'aggressive', else 1.0
```

`'aggressive'` philosophy reduces expansion time by 15%.

### Concurrent expansions

Only one expansion can be active at a time (`territory.expanding`). The tick loop checks `endsAt` and moves the region from `expanding` to `unlocked[]` when it expires.

---

## 10. Event System

**File:** `src/systems/EventSystem.ts`

### Three tiers of events

#### Micro events (automatic)

Trigger: fires every 45 seconds (`MICRO_INTERVAL_MS`), rate-limited by `lastMicroAt`.

Pool of ~10 events. Each offers a quick collect or binary choice.

Typical rewards:
- Instant cash injection
- Instant insight
- Short boost: `1.5–2×` for `45–90s`

#### Major events (manual discovery)

Rarer, require player engagement. Present meaningful trade-offs:
- Spend influence now for a sustained production boost
- Fork choices with narrative and mechanical consequences

Pool rotates (~5 events). The player sees each at most once per prestige cycle.

#### Crisis events (dangerous)

- Pay to defend (cash or influence) and avoid damage
- Refuse → accept damage and gamble for a larger reward

High risk / high reward. Narrative flavor varies by industry.

### Boost mechanics

Any event that grants a boost calls:

```
applyBoost(state, { mult, seconds, source })
→ events.boost = { mult, endsAt: now + seconds×1000, source }
```

`eventMult` in `M.production` reads this: `boost.mult if now < endsAt else 1`.

Only one boost can be active at a time; a new boost overwrites the old one.

### Reward application

`applyReward(state, reward)` is the single function all events route through:

```
reward = {
  cash?:     number
  insight?:  number
  influence?: number
  lp?:       number
  advisorId?: string    // unlocks an advisor
  boost?:    { mult, seconds, source }
}
```

---

## 11. Marketing System

**File:** `src/systems/MarketingSystem.ts`

Marketing is a passive income multiplier built on audience size.

### Final multiplier

```
getMarketingMult(state) = 1 + log₁₀(1 + audience) × 0.12
                        + (campaignActive ? 0.25 : 0)
```

This feeds directly into `M.production` as `marketingMult`.

### Brand

Brand starts at 1 and grows as reach accumulates:

```
brand += log₁₀(1 + reachRate) × 0.02 × dt
```

Brand amplifies the `compoundingFactor` of all channels.

### Per-channel reach rate

```
reachRate = baseRate × brandMult × compoundingFactor × campaignMult

brandMult        = 1 + log₁₀(1 + (brand - 1)) × 0.25
compoundingFactor = 1 + ch.compounding
                     × (log₁₀(1 + audience) × 0.18 + log₁₀(brand) × 0.4)
campaignMult     = campaign.reachMult if active, else 1
```

### Audience dynamics

Audience converges toward a target:

```
audienceTarget = √reach × 1.5 × retentionFactor

audiencePerSec = (audienceTarget - audience) × 0.05   [converging up]
audiencePerSec = -audience × 0.01                      [decaying when no marketing active]
```

### The 6 channels

| Channel | Currency | Compounding | Steps | Special |
|---|---|---|---|---|
| Social Media | Cash | 0.6 | 6 | Viral scaling; followers snowball |
| Content Marketing | Cash | 0.9 | 6 | Highest compounding (SEO) |
| Paid Ads | Cash | 0 | 4 | Instant reach; ongoing upkeep (6/s); auto-pauses if broke |
| Email | Cash | 0.4 | 4 | Retention factor; audience decays without active marketing |
| Influencer & PR | Influence | 0.2 | 4 | Borrowed trust at scale |
| Referral & Community | Cash | 0.7 | 3 | Viral coefficient; synergy bonus with Social |

**Social + Content synergy:**

```
if both active: social reachRate += 0.25 × socialBaseRate
```

### Channel step costs

```
stepCost(step) = STEP_COST_BASE × STEP_COST_MUL^step
              = 60 × 4.2^step
```

### Campaigns

One campaign active at a time (`marketing.campaign`).

| ID | Name | `reachMult` | Duration |
|---|---|---|---|
| `launch` | Product Launch | 2.5× | 60s |
| `seasonal` | Seasonal Sale | 2.0× | 120s |
| `viral_stunt` | Viral Stunt | 4.0× | varies (costs influence) |

Campaign `reachMult` multiplies all channel reach rates and adds `+0.25` to `getMarketingMult`.

---

## 12. Story Engine

**File:** `src/systems/StoryEngine.ts`, `src/data/story.ts`

### Structure

5 acts, 4+ beats per act, 20+ total beats.

Each beat has:
- `id`: unique string
- `trigger`: `{ type, value }` (see trigger types below)
- `speaker`: `'mentor'` | `'rival'` | `'partner'` | `'consortium'` | `'narrator'` | `'player'`
- `lines`: `string[]` — dialogue
- `choice?`: optional player choice with options
- `reward?`: applied on completion or choice

### Trigger types

| `type` | `value` meaning |
|---|---|
| `start` | Fires once on first game start |
| `earnings` | Fire when `lifetimeEarnings` ≥ value |
| `tier` | Fire when the player has unlocked tier ≥ value |
| `prestige` | Fire when `prestigeCount` ≥ value |
| `territory` | Fire when `territory.unlocked.length` ≥ value |
| `research` | Fire when `research.completed.length` ≥ value |
| `advisor` | Fire when number of owned advisors ≥ value |

### Ethics axis

Player choices shift `story.ethics` in the range `[-20, +20]`:
- Positive = moral / cooperative
- Negative = ruthless / exploitative

Act V has three branching endings based on final ethics score.

### Act advancement

The game advances `story.act` when all beats in the current act are in `seen[]`. New act unlocks new beats which become eligible to queue.

### Beat queuing

`StoryEngine.tickStory(state, dt)` checks all unqueued, unseen beats each tick. When a beat's trigger condition is met and the beat isn't yet in `seen` or `queue`, it is appended to `story.queue`. The UI dequeues one at a time.

---

## 13. Guidance System

**File:** `src/systems/GuidanceSystem.ts`

Co-founder coaching overlays that teach the player new mechanics as they encounter them.

### Trigger types

| Trigger | Condition |
|---|---|
| `start` | First launch |
| `reach` | `marketing.reach` ≥ threshold |
| `audience` | `marketing.audience` ≥ threshold |
| `income` | `incomePerSec` ≥ threshold |
| `channel` | A specific channel is unlocked |
| `tier` | Facility tier ≥ value unlocked |
| `campaign` | A campaign is active |
| `firstBuy` | First facility purchase beyond the starting one |
| `idle` | Returned from offline (seeded by offline logic) |

### Rate-limiting

```
GUIDANCE_MIN_INTERVAL_MS = 25,000   (25 seconds)
```

A guidance beat will not show if `now - guidance.lastShownAt < 25000`. Queue depth is capped at 1 (no spam).

### Dismissed beats

`guidance.dismissed[]` stores IDs the player has closed without acting on. Dismissed beats will not re-queue.

---

## 14. Achievement / Milestone System

**File:** `src/systems/AchievementSystem.ts`

~20 one-time milestones. Once `milestones.unlocked` contains an ID it never fires again.

### Trigger types

| Trigger | Example threshold |
|---|---|
| `earnings` | `lifetimeEarnings ≥ $1M` |
| `tier` | Unlocked Tier 3 |
| `prestige` | `prestigeCount ≥ 1` |
| `advisors` | Recruited ≥ 5 advisors |
| `facilities` | Total facilities ≥ 100 |
| `research` | Completed ≥ 10 nodes |
| `clicks` | `stats.clicks ≥ 1000` |
| `insight` | `insight ≥ 5000` |
| `influence` | `influence ≥ 500` |

### Rewards

All milestone rewards route through the same `applyReward` function as events:

```
{ cash?, insight?, influence?, lp?, advisorId?, boost? }
```

---

## 15. Game Loop & Tick

**File:** `src/game/GameLoop.ts`

### Tick rates

| Tab state | Interval |
|---|---|
| Visible | ~100ms (`requestAnimationFrame`, ~10 tps) |
| Hidden | 1,000ms |

### Max `dt` per tick

```
dt = clamp(now - lastTick, 0, MAX_DT)   // MAX_DT = 5 seconds
```

Prevents a single massive tick after the tab is hidden for a long time. Long gaps are handled by the offline progress system instead.

### Per-tick operations (in order)

1. **Production** — add `incomePerSec × dt` to `cash` (or `resource` if stockpiling)
2. **Insight** — add `insightPerSec × dt` to `insight`
3. **Influence** — trickle passive influence
4. **Marketing** — advance reach/audience/brand; deduct upkeep (Paid Ads); check campaign expiry
5. **Research** — check if `research.active.endsAt ≤ now`, complete it if so
6. **Territory** — check if `territory.expanding.endsAt ≤ now`, unlock it if so
7. **Event boost** — clear `events.boost` if `endsAt ≤ now`
8. **Market drift** — apply one step of random walk; check demand shift
9. **Story eligibility** — check all unqueued beats; enqueue newly eligible ones
10. **Guidance eligibility** — check all unqueued guidance beats (respecting rate limit)
11. **Milestone eligibility** — check all un-unlocked milestones
12. **Stats** — increment `stats.playSeconds` by `dt`
13. **lastTick** — set to `now`

---

## 16. Offline Progress

**File:** `src/game/OfflineProgress.ts`

Runs once on game load, before the first tick.

### Calculation

```
elapsed = now - lastTick
elapsed = clamp(elapsed, MIN_OFFLINE_SECONDS, MAX_OFFLINE_SECONDS)
        = clamp(elapsed, 60, 86400)       // 1 minute to 24 hours

offlineCash    = incomePerSec × elapsed × OFFLINE_EFFICIENCY   (0.5)
offlineInsight = insightPerSec × elapsed × OFFLINE_EFFICIENCY
offlineMarketing = tickMarketing(state, elapsed × 0.5)
```

The 50% offline efficiency penalty is fixed — no research or advisor can increase it.

### Show threshold

If `elapsed < MIN_OFFLINE_SECONDS` (60s) the welcome-back popup is skipped silently. If ≥ 60s, the popup shows a summary:

```
{ seconds: elapsed, cash: offlineCash, insight: offlineInsight, events[] }
```

Events here refers to any milestones or story beats that would have triggered during that window (informational only, not re-simulated).

---

## 17. Save / Load System

**File:** `src/game/SaveSystem.ts`

### Storage

```
key: 'empire-engine-save-v1'   (localStorage)
```

Despite the key name, the save format is version 2. The key name is fixed to avoid breaking existing saves.

### Versioning

```
SAVE_VERSION = 2
```

On load:
1. Parse JSON from localStorage.
2. If `save.version < SAVE_VERSION`: run migration.
3. Return migrated state.

### V1 → V2 migration

Deep-merges v2 defaults for fields that didn't exist in v1:
- `marketing` (all channels, reach, audience, etc.)
- `cofounder`
- `guidance`

Old fields are preserved; only missing fields are added. Non-destructive.

### Export / Import

- **Export:** `JSON.stringify(state)` → Base64 encode → user copies string.
- **Import:** Base64 decode → `JSON.parse` → same version migration logic → `LOAD` action.

---

## 18. Industries & Facilities

**File:** `src/data/industries.ts`

### The 8 industries

| ID | Company Name | Color | Resource | Chain (T1→T5) | Signature Mechanic |
|---|---|---|---|---|---|
| `tech` | NeuroByte Systems | #6366f1 | Compute Cycles (TFLOP) | Garage → Startup → Datacenter → Cloud Region → Quantum Grid | Overclock Surge |
| `space` | Orbital Dynamics | #38bdf8 | Delta-V | Hangar → Spaceport → Orbital Yard → Lunar Base → Interstellar Dock | Launch Window |
| `culinary` | Flavor House | — | Flavor | — | Rush Service |
| `energy` | PowerGrid Global | — | Power | — | Peak Load |
| `fashion` | Trend Cycle | — | Style | — | Seasonal Refresh |
| `biotech` | Genesis Labs | — | Cures | — | R&D Pipeline |
| `media` | Spotlight Productions | — | Attention | — | Viral Moment |
| `agriculture` | Harvest Collective | — | Harvest | — | Seasonal Yield |

### Facility slot layout

Each industry has 5 tiers × 10 slots = **50 unique facilities**.

Across all 8 industries: **400 unique facility IDs**.

### Base rate scaling

```
baseRate(tier, slot) ≈ 0.01 × 1.6^slot × 8^(tier - 1)
```

Rough approximation — actual values in the data file. Production roughly doubles each slot and multiplies by 8 per tier.

---

## 19. Research Nodes

**File:** `src/data/research.ts`

20 nodes across 5 branches × 4 tiers (some branches have 3 tiers).

### Branch: Production

| Tier | Effect | Cost (insight) | Time (s) | Prerequisites |
|---|---|---|---|---|
| 1 | +25% production | 100 | 60 | — |
| 2 | +40% production | 200 | 120 | prod-1 |
| 3 | +60% production | 400 | 240 | prod-2 |
| 4 | +100% production | 800 | 480 | prod-3, eff-2 |

### Branch: Efficiency

| Tier | Effect | Cost | Time | Prerequisites |
|---|---|---|---|---|
| 1 | −10% facility cost | 80 | 45 | — |
| 2 | −14% facility cost | 160 | 90 | eff-1 |
| 3 | −18% facility cost | 320 | 180 | eff-2 |

Costs multiply together: completing all three gives `(0.9 × 0.86 × 0.82) ≈ 0.634×` base cost, then clamped to minimum 0.1.

### Branch: Innovation

| Tier | Effect | Cost | Time | Prerequisites |
|---|---|---|---|---|
| 1 | +20% insight generation | 60 | 30 | — |
| 2 | +35% insight generation | 120 | 60 | inn-1 |
| 3 | +50% insight generation | 240 | 120 | inn-2 |
| 4 | +70% insight generation | 500 | 300 | inn-3 |

### Branch: Market

| Tier | Effect | Notes |
|---|---|---|
| 1 | Market price effects | Stabilizes random walk |
| 2 | Prestige multiplier bonus | Scales with prestige count |
| 3 | Influence scaling | Influence-to-production bonus |

### Branch: Legacy (unlocks at Prestige Tier 2)

Nodes in this branch **do not reset** on any prestige tier. They provide permanent multipliers that compound across all subsequent runs.

---

## 20. Action Reducer Contract

**File:** `src/game/reducer.ts`

All state changes flow through a single pure reducer. No side effects occur outside it.

```typescript
type Action =
  | { type: 'SETUP';             payload: CompanySetup }
  | { type: 'TICK';              dt: number }
  | { type: 'BUY_FACILITY';      id: string; qty: 1 | 10 | 100 | 'max' }
  | { type: 'PRESTIGE' }
  | { type: 'START_RESEARCH';    id: string }
  | { type: 'ADVISOR_RECRUIT';   id: string }
  | { type: 'ADVISOR_LEVEL';     id: string }
  | { type: 'ADVISOR_ASSIGN';    advisorId: string; facilityId: string }
  | { type: 'ADVISOR_ACTIVATE';  id: string }
  | { type: 'STORY_SEEN';        id: string }
  | { type: 'STORY_CHOICE';      beatId: string; optionIndex: number }
  | { type: 'SET_BOOST';         mult: number; seconds: number; source: string }
  | { type: 'EVENT_RESOLVE';     reward?: GameReward; cost?: { cash?: number; influence?: number; lp?: number } }
  | { type: 'SELL_RESOURCE' }
  | { type: 'TOGGLE_STOCKPILE' }
  | { type: 'SET_BUYQTY';        qty: 1 | 10 | 100 | 'max' }
  | { type: 'SET_SETTINGS';      payload: Partial<Settings> }
  | { type: 'EXPAND_TERRITORY';  id: string }
  | { type: 'MARKETING_UPGRADE'; channelId: string }
  | { type: 'MARKETING_TOGGLE';  channelId: string }
  | { type: 'MARKETING_CAMPAIGN';id: string }
  | { type: 'CHARACTER_CUSTOMIZE'; payload: Partial<CofounderState> }
  | { type: 'GUIDANCE_SEEN';     id: string }
  | { type: 'GUIDANCE_DISMISS';  id: string }
  | { type: 'TOGGLE_LIVE_VIEW' }
  | { type: 'LOAD';              state: GameState }
  | { type: 'IMPORT';            state: GameState }
  | { type: 'HARD_RESET' }
```

---

## 21. Constants Reference

| Constant | Value | Location | Purpose |
|---|---|---|---|
| `TICK_INTERVAL_MS` | 100 | GameLoop | Visible-tab tick rate |
| `HIDDEN_INTERVAL_MS` | 1,000 | GameLoop | Hidden-tab tick rate |
| `MAX_DT` | 5 | GameLoop | Max seconds per tick (clamp) |
| `MAX_OFFLINE_SECONDS` | 86,400 | OfflineProgress | 24-hour cap on offline gains |
| `MIN_OFFLINE_SECONDS` | 60 | OfflineProgress | Minimum gap to trigger popup |
| `OFFLINE_EFFICIENCY` | 0.5 | OfflineProgress | 50% income while offline |
| `SAVE_VERSION` | 2 | SaveSystem | Current save format |
| `SAVE_KEY` | `'empire-engine-save-v1'` | SaveSystem | localStorage key |
| `MICRO_INTERVAL_MS` | 45,000 | EventSystem | Time between micro-events |
| `HISTORY_CAP` | 40 | MarketSystem | Max market price history samples |
| `MARKET_REVERT` | 0.04 | MarketSystem | Mean-reversion pull strength |
| `MARKET_NOISE` | 0.03 | MarketSystem | Per-tick price volatility |
| `BOOM_CHANCE` | 0.01 | MarketSystem | 1% per tick probability of +0.25 shock |
| `CRASH_CHANCE` | 0.01 | MarketSystem | 1% per tick probability of −0.25 shock |
| `PRICE_MIN` | 0.4 | MarketSystem | Minimum market price multiplier |
| `PRICE_MAX` | 2.0 | MarketSystem | Maximum market price multiplier |
| `STEP_COST_BASE` | 60 | MarketingSystem | Base cost for first channel step |
| `STEP_COST_MUL` | 4.2 | MarketingSystem | Cost multiplier per step |
| `SOCIAL_CONTENT_SYNERGY` | 0.25 | MarketingSystem | +25% reach when both active |
| `GUIDANCE_MIN_INTERVAL_MS` | 25,000 | GuidanceSystem | Min gap between guidance pops |
| `CHAIN_BONUS_PER_LOWER` | 0.02 | ProductionChain | +2% per lower-tier facility |
| `INSIGHT_RATE_T3` | 0.05 | EconomyEngine | Insight coefficient for Tier 3+ |
| `ADVISOR_LEVEL_BASE_COST` | 50 | AdvisorSystem | Base influence cost to level |
| `ADVISOR_LEVEL_COST_MUL` | 1.6 | AdvisorSystem | Cost multiplier per level |
| `SAME_INDUSTRY_MULT` | 1.5 | AdvisorSystem | Bonus for same-industry advisor |
| `PEOPLE_FIRST_MULT` | 1.15 | AdvisorSystem | Extra mult for people_first philosophy |
| `INNOVATOR_SPEED` | 1.15 | ResearchSystem | Research speed for innovator philosophy |
| `AGGRESSIVE_EXPAND_MULT` | 0.85 | TerritorySystem | Faster expansions for aggressive philosophy |
| `EFFICIENCY_PROD_MULT` | 1.15 | EconomyEngine | Production bonus for efficiency philosophy |
| `LP_PRESTIGE_MULT` | 0.1 | EconomyEngine | 10% bonus LP per prior prestige |
| `LP_MIN_EARNINGS` | 1,000,000 | EconomyEngine | Minimum lifetime earnings to earn LP |
| `MARKETING_AUDIENCE_COEFF` | 0.12 | MarketingSystem | Audience-to-multiplier coefficient |
| `CAMPAIGN_BONUS` | 0.25 | MarketingSystem | Flat mult addition during campaign |

---

*Generated from source at `empire-engine/src/`. All formulas are exact where code is deterministic; probabilistic formulas (market shocks) use `Math.random()`.*
