// GILDED HEIST — The Meridian Vault: tuning constants and the three floors.
// A level is a tile map (32 x 18) plus its guards, cameras and lasers. Legend:
//   # wall (blocks movement and sight)   C crate / slot machine (blocks both)
//   S shadow pool (you are hard to spot inside)   . open floor
//   P player start   L loot   V vault safe (hold E to crack)   X getaway exit
// Rows are normalised by level.js: short rows are padded with '#', long cut.
// Cameras sit on wall tiles and sweep a cone. Lasers are beams between two
// tile points that switch on and off on a timer — cross a live beam and the
// alarm jumps.

export const TILE = 40;
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const COLS = 32;
export const ROWS = 18;

export const PLAYER_WALK_SPEED = 175; // px per second
export const PLAYER_SNEAK_SPEED = 92;
export const GUARD_PATROL_SPEED = 74;
export const GUARD_CHASE_SPEED = 158;
export const GUARD_SEARCH_SPEED = 98;

export const VISION_RANGE = 290; // px, how far a guard can see
export const VISION_HALF_ANGLE = 0.62; // radians either side of facing (~35 deg)
export const CAMERA_RANGE = 320;
export const CAMERA_HALF_ANGLE = 0.5;
export const SHADOW_SAFE_RANGE = 120; // inside a shadow you must be this close to be seen
export const DETECT_RATE = 62; // suspicion per second at point-blank, scaled by closeness
export const CAMERA_DETECT_RATE = 78;
export const SNEAK_DETECT_FACTOR = 0.45; // sneaking slows detection this much
export const SUSPICION_DECAY = 26; // suspicion per second while unseen
export const ALERT_MEMORY = 3.5; // seconds an alerted guard chases unseen prey
export const SEARCH_TIME = 4.0; // seconds a guard searches the last seen spot
export const CATCH_RANGE = 26; // px: an alerted guard this close catches you
export const COIN_NOISE_RADIUS = 190;
export const COINS_PER_LEVEL = 3;
export const EMP_PER_LEVEL = 2;
export const EMP_DURATION = 6; // seconds cameras and lasers stay dead
export const EMP_ALARM_COST = 5; // firing an EMP is loud: the alarm notices
export const LASER_ALARM = 18; // alarm points for crossing a live beam
export const CAMERA_ALARM = 25; // alarm points when a camera fully locks on
export const ALARM_DECAY = 2.0; // alarm points per second while calm
export const LOCKDOWN_TIME = 8; // seconds of lockdown at full alarm
export const SAFE_CRACK_TIME = 1.5; // seconds holding E at the vault safe
export const SAFE_VALUE = 1500;
export const LOOT_VALUES = [500, 750, 1000]; // gold bar, diamond, artifact
export const GHOST_BONUS = 1000;
export const LIVES = 3;

export const LEVELS = [
  {
    name: 'FLOOR 1 — THE CASINO',
    sub: 'Three guards walk the floor, two cameras sweep the lanes. Take the loot, reach the getaway door unseen.',
    map: [
      '################################',
      '#P......C......#.......C.......#',
      '#.......C......#.......C...L...#',
      '#..S....C......#..S....C.......#',
      '#.......C......#.......C.......#',
      '#..C....C......#.......C...S...#',
      '#.......#####..#..#####........#',
      '#..............................#',
      '#..C......C.....C.....C....C...#',
      '#......S........C.....C........#',
      '#..C......C.....C.....C...S....#',
      '#.............C......C.........#',
      '#..L...C......C......C....C....#',
      '#.............C......C.........#',
      '#..S...C......C..S...C....L....#',
      '#.............C......C.........#',
      '#..C..........C......C........X#',
      '################################',
    ],
    guards: [
      { x: 4, y: 7, waypoints: [[4, 7], [27, 7]], wait: 1.2 },
      { x: 24, y: 2, waypoints: [[24, 2], [24, 6]], wait: 0.9 },
      { x: 8, y: 11, waypoints: [[4, 11], [12, 11]], wait: 1.0 },
    ],
    cameras: [
      { x: 15, y: 1, base: Math.PI / 2, sweep: 0.85, speed: 0.55, range: 320 },
      { x: 16, y: 17, base: -Math.PI / 2, sweep: 0.85, speed: 0.45, range: 320 },
    ],
    lasers: [],
  },
  {
    name: 'FLOOR 2 — THE VAULT FLOOR',
    sub: 'Four guards, three cameras, and laser grids that blink on and off. Time your crossing — or burn an EMP.',
    map: [
      '################################',
      '#P........#....S....#....C.....#',
      '#.........#....L...............#',
      '#..C......#.........#...S......#',
      '#.........#..C......#..........#',
      '#..S................#....C.....#',
      '#.........#....C....#..........#',
      '#....C....#.........#..S.......#',
      '#.........#....L....#..........#',
      '#..C......#..............C.....#',
      '#.........#....S....#..........#',
      '#....S....#.........#..C.......#',
      '#.........#..C......#..........#',
      '#...................#....S.....#',
      '#...C.....#.........#....L.....#',
      '#.........#....C...............#',
      '#.........#.........#........X.#',
      '################################',
    ],
    guards: [
      { x: 4, y: 6, waypoints: [[2, 6], [8, 6]], wait: 0.9 },
      { x: 15, y: 4, waypoints: [[15, 4], [15, 11]], wait: 0.7 },
      { x: 26, y: 6, waypoints: [[24, 6], [29, 6]], wait: 0.9 },
      { x: 5, y: 10, waypoints: [[5, 10], [5, 15]], wait: 0.8 },
    ],
    cameras: [
      { x: 10, y: 8, base: 0, sweep: 1.0, speed: 0.6, range: 300 },
      { x: 20, y: 5, base: Math.PI, sweep: 1.0, speed: 0.5, range: 300 },
      { x: 15, y: 0, base: Math.PI / 2, sweep: 0.7, speed: 0.4, range: 320 },
    ],
    lasers: [
      { x1: 16, y1: 6, x2: 16, y2: 10, period: 2.6, on: 0.55, phase: 0 },
      { x1: 25, y1: 4, x2: 25, y2: 8, period: 3.1, on: 0.5, phase: 1.2 },
    ],
  },
  {
    name: 'FLOOR 3 — THE PENTHOUSE',
    sub: 'Five guards on short beats, cameras on every wall, lasers on the vault door. Crack the safe, then run.',
    map: [
      '################################',
      '#P....S...#....C....#....V.....#',
      '#.........#....................#',
      '#...L.....#..C......#..S.......#',
      '#.........#.........#..........#',
      '#....C....#....S....#....C.....#',
      '#...................#..........#',
      '#..S......#....C....#..........#',
      '#.........#..............C.....#',
      '#.........#..S......#..........#',
      '#....C....#....L....#..S.......#',
      '#.........#.........#..........#',
      '#.........#....C...............#',
      '#..C......#.........#....S.....#',
      '#...................#....L.....#',
      '#.........#....S....#..........#',
      '#.........#.........#........X.#',
      '################################',
    ],
    guards: [
      { x: 5, y: 4, waypoints: [[2, 4], [8, 4]], wait: 0.6 },
      { x: 15, y: 2, waypoints: [[12, 2], [18, 2]], wait: 0.6 },
      { x: 26, y: 9, waypoints: [[22, 9], [29, 9]], wait: 0.6 },
      { x: 14, y: 12, waypoints: [[14, 12], [14, 15]], wait: 0.7 },
      { x: 5, y: 12, waypoints: [[5, 12], [5, 15]], wait: 0.8 },
    ],
    cameras: [
      { x: 10, y: 8, base: 0, sweep: 0.9, speed: 0.55, range: 300 },
      { x: 20, y: 10, base: Math.PI, sweep: 0.9, speed: 0.5, range: 300 },
      { x: 15, y: 0, base: Math.PI / 2, sweep: 0.7, speed: 0.45, range: 320 },
    ],
    lasers: [
      { x1: 15, y1: 6, x2: 15, y2: 9, period: 2.4, on: 0.5, phase: 0 },
      { x1: 25, y1: 10, x2: 25, y2: 13, period: 2.8, on: 0.55, phase: 0.9 },
      { x1: 27, y1: 3, x2: 27, y2: 6, period: 3.0, on: 0.5, phase: 1.8 },
    ],
  },
];

// A tiny deterministic RNG (mulberry32) so demo screenshots are stable.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
