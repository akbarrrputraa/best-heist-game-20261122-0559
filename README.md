[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/akbarrrputraa/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/akbarrrputraa/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

# GILDED HEIST — The Meridian Vault

A top-down heist game in the browser, offline, from static files. You are the thief. Three floors of the Meridian Vault, three artifacts per floor, guards sweeping the halls with vision cones, wall cameras locking on, laser grids blinking across the corridors — steal everything and reach the getaway door before the alarm hits 100%.

Entry for the [make.fun competition **"Make the best heist game"**](https://make.fun/competitions/best-heist-game-20261122-0559) ($50, free entry).

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Or open `game/index.html` through any static server. No build step, no network requests, no dependencies.

## How to play

- **WASD / arrows** — move
- **Shift** — sneak (slow, quiet, half as easy to spot)
- **Q or click** — toss a coin; the ring pulls nearby guards to where it lands
- **F** — EMP burst: kills cameras and lasers for 6 seconds, but it is loud (+5 alarm)
- **E** — grab loot / slip out the exit (once all loot is taken)
- **Hold E** — crack the vault safe (+$1,500)
- **P** — pause · **M** — mute · **R** — restart floor

## The heist

- Guards patrol waypoints and scan at every stop. Their vision cones are pale yellow — orange when suspicious, red when they have spotted you.
- Suspicion is a meter, not a coin flip: the closer you are and the longer you linger in a cone, the faster it fills. Break line of sight and it drains.
- **Shadow pools** hide you — inside one, a guard must be close to spot you at all. **Slot machines** block sight completely.
- **Cameras** sweep their cones back and forth. Linger in one and its lock meter fills; a full lock trips the alarm (+25) and points every guard at you.
- **Lasers** blink on and off across the corridors. Cross a live beam and the alarm jumps (+18). Time your crossing — or burn an EMP.
- The **alarm meter** drains while you stay calm. At 100% the vault **locks down**: every guard hunts you for 8 seconds.
- A guard that fills its meter chases you. If it catches you, you lose a life and restart the floor (loot you pocketed stays pocketed). Three lives.
- A guard that loses you searches your last seen spot, then goes back to its beat. A tossed coin sends patrolling guards to investigate the noise.
- Clear a floor unseen for a **ghost bonus** (+1,000). Three floors: The Casino, The Vault Floor, The Penthouse.

## The hand-in

`main.ts` (Node 22) copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` — with the kit's `vendor/makefun-game.ts` when present, or a built-in stand-in writer when it is not (see the header of `main.ts`).

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
