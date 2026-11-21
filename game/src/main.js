// GILDED HEIST — The Meridian Vault: the game loop and the state machine.
// Screens: title -> play -> paused / caught / levelclear / gameover / win.
// Steal every artifact on a floor, then reach the green exit. Get caught
// three times and the vault wins. The alarm is a meter, not a switch:
// cameras and guards feed it, lasers spike it, and at 100% the vault locks
// down and every guard hunts you. Play it with keyboard and mouse, offline,
// from these static files alone.

import {
  ALARM_DECAY,
  CAMERA_ALARM,
  COINS_PER_LEVEL,
  EMP_ALARM_COST,
  EMP_DURATION,
  EMP_PER_LEVEL,
  GHOST_BONUS,
  LASER_ALARM,
  LEVELS,
  LIVES,
  LOOT_VALUES,
  LOCKDOWN_TIME,
  SAFE_CRACK_TIME,
  SAFE_VALUE,
  TILE,
  CATCH_RANGE,
  COIN_NOISE_RADIUS,
} from './config.js';
import { parseLevel } from './level.js';
import { makeGuard, updateGuard, GUARD_STATE } from './guard.js';
import { makeCamera, updateCamera, cameraDir } from './camera.js';
import { makePlayer, resetPlayer, updatePlayer, tossCoin, fireEmp, lootInReach, safeInReach, allLootTaken, atExit } from './player.js';
import { makeAudio, sfx } from './audio.js';
import { render, playerOnLiveLaser } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') ?? 1) || 1;

const game = {
  screen: 'title',
  levelIndex: 0,
  level: null,
  guards: [],
  cameras: [],
  lasers: [],
  player: null,
  score: 0,
  lootValue: 0,
  lives: LIVES,
  levelTime: 0,
  totalTime: 0,
  time: 0,
  alarm: 0,
  lockdown: 0,
  empLeft: 0,
  laserCooldown: 0,
  ghost: true, // true while no guard or camera has fully spotted you this floor
  coins: [], // active tossed coins (noise pulses)
  particles: [],
  input: { left: false, right: false, up: false, down: false, sneak: false, interact: false },
  audio: makeAudio(),
  clearLines: [],
  winLines: [],
  best: 0,
  prompt: null,
  lootDone: false,
  takenByLevel: [new Set(), new Set(), new Set()],
  safeCracked: [false, false, false],
};

function announce(text) {
  statusEl.textContent = text;
}

// Exposed for automated play-testing (and for curious players in devtools).
window.__game = game;

try {
  game.best = Number(window.localStorage.getItem('gilded-heist.best') ?? 0) || 0;
} catch {
  game.best = 0;
}

function saveBest() {
  if (game.score > game.best) {
    game.best = game.score;
    try {
      window.localStorage.setItem('gilded-heist.best', String(game.best));
    } catch {
      // Private mode: the best score just lives for this visit.
    }
  }
}

function burst(x, y, color, n = 14) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 120;
    game.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.7, maxLife: 0.7, color });
  }
}

game.startLevel = function (index) {
  game.levelIndex = index;
  game.level = parseLevel(LEVELS[index]);
  // Loot pocketed on an earlier attempt of this floor stays pocketed.
  game.level.loot.forEach((l, i) => {
    if (game.takenByLevel[index].has(i)) l.taken = true;
  });
  if (game.safeCracked[index] && game.level.safe) game.level.safe.cracked = true;
  game.guards = LEVELS[index].guards.map((def, i) => makeGuard(def, (seed + i * 1.7) % (Math.PI * 2)));
  game.cameras = (LEVELS[index].cameras ?? []).map((def) => makeCamera(def));
  game.lasers = (LEVELS[index].lasers ?? []).map((def) => ({
    ...def,
    x1: def.x1, y1: def.y1, x2: def.x2, y2: def.y2,
    live: false,
  }));
  if (!game.player) game.player = makePlayer(game.level.playerStart);
  else resetPlayer(game.player, game.level.playerStart);
  game.levelTime = 0;
  game.alarm = 0;
  game.lockdown = 0;
  game.empLeft = 0;
  game.laserCooldown = 0;
  game.ghost = true;
  game.coins = [];
  game.particles = [];
  game.prompt = null;
  game.lootDone = allLootTaken(game.level);
  game.screen = 'play';
  announce(`${LEVELS[index].name}. ${LEVELS[index].sub}`);
};

function startRun() {
  game.score = 0;
  game.lootValue = 0;
  game.lives = LIVES;
  game.totalTime = 0;
  game.takenByLevel = [new Set(), new Set(), new Set()];
  game.safeCracked = [false, false, false];
  game.startLevel(0);
}

function nextFloor() {
  if (game.levelIndex + 1 >= LEVELS.length) {
    game.screen = 'win';
    const mm = Math.floor(game.totalTime / 60);
    const ss = Math.floor(game.totalTime % 60).toString().padStart(2, '0');
    game.winLines = [
      'All three floors emptied. Nine artifacts and the vault safe. Not once caught.',
      `Score: ${game.score.toLocaleString('en-US')}  ·  Time: ${mm}:${ss}`,
      'The Meridian Vault never knew you were there.',
      '',
      'Press Enter to run the heist again.',
    ];
    saveBest();
    sfx.win(game.audio);
    announce('The perfect heist. You win.');
    return;
  }
  game.startLevel(game.levelIndex + 1);
}

function levelClear() {
  const timeBonus = Math.max(0, Math.round((180 - game.levelTime) * 5));
  const ghostBonus = game.ghost ? GHOST_BONUS : 0;
  game.score += timeBonus + ghostBonus;
  game.clearLines = [
    `Artifacts: ${game.level.loot.filter((l) => l.taken).length}/${game.level.loot.length}` +
      (game.level.safe?.cracked ? '  ·  Vault safe cracked (+$1,500)' : '') +
      `  ·  Time: ${Math.floor(game.levelTime / 60)}:${Math.floor(game.levelTime % 60).toString().padStart(2, '0')}`,
    `Time bonus: +${timeBonus.toLocaleString('en-US')}${ghostBonus ? `  ·  Ghost bonus: +${ghostBonus.toLocaleString('en-US')} (never spotted)` : ''}`,
    `Score: ${game.score.toLocaleString('en-US')}`,
    '',
    'Press Enter for the next floor.',
  ];
  game.screen = 'levelclear';
  saveBest();
  sfx.levelClear(game.audio);
  announce(`Floor cleared. Score ${game.score}.`);
}

function caught() {
  game.lives -= 1;
  sfx.caught(game.audio);
  burst(game.player.x, game.player.y, '#ff5a4d', 22);
  if (game.lives <= 0) {
    game.screen = 'gameover';
    saveBest();
    announce('Caught three times. The vault wins.');
  } else {
    game.screen = 'caught';
    announce('Caught! One life gone.');
  }
}

function updateLasers(dt) {
  for (const beam of game.lasers) {
    const phase = (game.levelTime + beam.phase) % beam.period;
    beam.live = phase < beam.period * beam.on;
  }
}

function step(dt) {
  if (game.screen !== 'play') return;
  game.time += dt;
  game.levelTime += dt;
  game.totalTime += dt;
  game.empLeft = Math.max(0, game.empLeft - dt);
  game.laserCooldown = Math.max(0, game.laserCooldown - dt);

  updateLasers(dt);
  updatePlayer(game.level, game.player, game.input, dt);

  // The alarm drains while calm, and lockdown counts down.
  if (game.lockdown > 0) {
    game.lockdown = Math.max(0, game.lockdown - dt);
    if (game.lockdown === 0) game.alarm = 55;
  } else {
    game.alarm = Math.max(0, game.alarm - ALARM_DECAY * dt);
  }

  const events = [];
  for (const guard of game.guards) updateGuard(game.level, guard, game.player, dt, events);
  for (const cam of game.cameras) updateCamera(game.level, cam, game.player, game.time, dt, events);
  for (const e of events) {
    if (e.type === 'spotted') {
      game.ghost = false;
      sfx.spotted(game.audio);
      announce('Spotted! Break line of sight!');
    } else if (e.type === 'camera-lock') {
      game.ghost = false;
      game.alarm = Math.min(100, game.alarm + CAMERA_ALARM);
      sfx.cameraLock(game.audio);
      // A camera lock points every guard at you.
      for (const guard of game.guards) {
        guard.lastSeen = { x: game.player.x, y: game.player.y };
        if (guard.state === GUARD_STATE.PATROL) guard.state = GUARD_STATE.SUSPICIOUS;
      }
      announce('Camera lock! The alarm is rising!');
    }
  }

  // A live laser across the body spikes the alarm.
  const beam = playerOnLiveLaser(game);
  if (beam && game.laserCooldown <= 0) {
    game.laserCooldown = 1.0;
    game.alarm = Math.min(100, game.alarm + LASER_ALARM);
    sfx.laserZap(game.audio);
    burst(game.player.x, game.player.y, '#ff2d2d', 12);
    announce('Laser trip! The alarm jumps!');
  }

  // Full alarm: lockdown. Every guard hunts your position.
  if (game.alarm >= 100 && game.lockdown <= 0) {
    game.lockdown = LOCKDOWN_TIME;
    for (const guard of game.guards) {
      guard.state = GUARD_STATE.ALERT;
      guard.suspicion = 100;
      guard.lastSeen = { x: game.player.x, y: game.player.y };
    }
    announce('LOCKDOWN! Every guard is hunting you!');
  }

  // Tossed coins pull patrolling guards to the noise.
  const now = Date.now();
  game.coins = game.coins.filter((c) => now - c.born < c.ttl);
  for (const coin of game.coins) {
    for (const guard of game.guards) {
      if (guard.state === GUARD_STATE.PATROL && Math.hypot(guard.x - coin.x, guard.y - coin.y) < COIN_NOISE_RADIUS) {
        guard.investigate = { x: coin.x, y: coin.y };
      }
    }
  }

  // Particles.
  for (const p of game.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  game.particles = game.particles.filter((p) => p.life > 0);

  // Caught: an alerted guard that reaches you.
  for (const guard of game.guards) {
    if (guard.state === GUARD_STATE.ALERT && Math.hypot(guard.x - game.player.x, guard.y - game.player.y) < CATCH_RANGE) {
      caught();
      return;
    }
  }

  // Interact: loot, the vault safe (hold), the exit.
  game.prompt = null;
  const loot = lootInReach(game.level, game.player);
  const safe = safeInReach(game.level, game.player);
  if (loot) {
    game.prompt = 'E — grab the loot';
    if (game.input.interact) {
      loot.taken = true;
      game.takenByLevel[game.levelIndex].add(game.level.loot.indexOf(loot));
      const value = LOOT_VALUES[loot.kind % LOOT_VALUES.length];
      game.score += value;
      game.lootValue += value;
      game.input.interact = false;
      burst(loot.x, loot.y, '#f2c94c');
      sfx.pickup(game.audio);
      game.lootDone = allLootTaken(game.level);
      announce(game.lootDone ? 'All loot taken. Reach the green exit!' : `Loot pocketed: $${value}.`);
    }
  } else if (safe) {
    game.prompt = 'Hold E — crack the safe';
    if (game.input.interact) {
      safe.progress += dt / SAFE_CRACK_TIME;
      if (safe.progress >= 1) {
        safe.cracked = true;
        game.safeCracked[game.levelIndex] = true;
        game.score += SAFE_VALUE;
        game.lootValue += SAFE_VALUE;
        game.input.interact = false;
        burst(safe.x, safe.y, '#7ee7f2', 22);
        sfx.safeCrack(game.audio);
        announce('Safe cracked! $1,500.');
      }
    } else {
      safe.progress = Math.max(0, safe.progress - dt * 2);
    }
  } else if (game.lootDone && atExit(game.level, game.player)) {
    game.prompt = 'E — slip out the getaway door';
    if (game.input.interact) {
      game.input.interact = false;
      levelClear();
      return;
    }
  }
  if (game.level.safe && !safe) game.level.safe.progress = Math.max(0, game.level.safe.progress - dt * 2);
}

const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ShiftLeft: 'sneak', ShiftRight: 'sneak',
};

window.addEventListener('keydown', (e) => {
  sfx.unlock(game.audio);
  const mapped = KEYMAP[e.code];
  if (mapped) {
    game.input[mapped] = true;
    e.preventDefault();
    return;
  }
  if (e.code === 'KeyE') {
    game.input.interact = true;
    e.preventDefault();
    return;
  }
  if (e.code === 'KeyQ') {
    const coin = tossCoin(game.player);
    if (coin) {
      game.coins.push(coin);
      sfx.coin(game.audio);
    }
    return;
  }
  if (e.code === 'KeyF') {
    if (fireEmp(game.player)) {
      game.empLeft = EMP_DURATION;
      game.alarm = Math.min(100, game.alarm + EMP_ALARM_COST);
      for (const cam of game.cameras) cam.disabledFor = EMP_DURATION;
      sfx.emp(game.audio);
      burst(game.player.x, game.player.y, '#7ee7f2', 18);
      announce('EMP burst! Cameras and lasers are down — but the alarm heard it.');
    }
    return;
  }
  if (e.code === 'KeyM') {
    sfx.toggleMute(game.audio);
    return;
  }
  if (e.code === 'KeyP') {
    if (game.screen === 'play') game.screen = 'paused';
    else if (game.screen === 'paused') game.screen = 'play';
    return;
  }
  if (e.code === 'KeyR') {
    if (game.screen === 'play' || game.screen === 'paused') game.startLevel(game.levelIndex);
    return;
  }
  if (e.code === 'Enter') {
    if (game.screen === 'title' || game.screen === 'gameover' || game.screen === 'win') startRun();
    else if (game.screen === 'caught') game.startLevel(game.levelIndex);
    else if (game.screen === 'levelclear') nextFloor();
  }
});

window.addEventListener('keyup', (e) => {
  const mapped = KEYMAP[e.code];
  if (mapped) game.input[mapped] = false;
  if (e.code === 'KeyE') game.input.interact = false;
});

// Click the floor to toss a coin at that spot (the mouse half of the game).
canvas.addEventListener('pointerdown', (e) => {
  if (game.screen !== 'play') return;
  const rect = canvas.getBoundingClientRect();
  const tx = ((e.clientX - rect.left) / rect.width) * 1280;
  const ty = ((e.clientY - rect.top) / rect.height) * 720;
  const coin = tossCoin(game.player, tx, ty);
  if (coin) {
    game.coins.push(coin);
    sfx.coin(game.audio);
  }
});

// Staged screenshot, or the live game.
if (shot) {
  if (stageShot(game, shot)) {
    render(game, ctx);
    announce(`Screenshot scene: ${shot}.`);
  } else {
    game.startLevel(0);
    render(game, ctx);
  }
} else {
  game.startLevel(0);
  game.screen = 'title';
  let last = performance.now();
  let acc = 0;
  const STEP = 1 / 60;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += dt;
    while (acc >= STEP) {
      step(STEP);
      acc -= STEP;
    }
    render(game, ctx);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
