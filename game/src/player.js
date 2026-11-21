// Player: the thief. WASD / arrows to move, Shift to sneak (slow, quiet,
// half as easy to spot), Q to toss a coin that rings and pulls guards to
// where it lands, F to fire an EMP burst that kills cameras and lasers for a
// few seconds (loud — the alarm notices), E to grab loot, crack the vault
// safe (hold it) or slip out the getaway exit. Clicking the floor tosses a
// coin at that spot instead. Getting caught costs a life and sends you back
// to the start of the floor — loot you already pocketed stays pocketed.

import { COINS_PER_LEVEL, EMP_PER_LEVEL, PLAYER_SNEAK_SPEED, PLAYER_WALK_SPEED, TILE } from './config.js';
import { moveCircle } from './level.js';

export function makePlayer(start) {
  return {
    x: start.x,
    y: start.y,
    radius: 14,
    dir: -Math.PI / 2,
    sneaking: false,
    moving: false,
    coins: COINS_PER_LEVEL,
    coinCooldown: 0,
    emp: EMP_PER_LEVEL,
    empCooldown: 0,
    stepPhase: 0,
  };
}

export function resetPlayer(player, start) {
  player.x = start.x;
  player.y = start.y;
  player.dir = -Math.PI / 2;
  player.coins = COINS_PER_LEVEL;
  player.emp = EMP_PER_LEVEL;
  player.coinCooldown = 0;
  player.empCooldown = 0;
}

export function updatePlayer(level, player, input, dt) {
  let mx = 0;
  let my = 0;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  if (input.up) my -= 1;
  if (input.down) my += 1;
  player.sneaking = !!input.sneak;
  player.moving = mx !== 0 || my !== 0;
  if (player.moving) {
    const len = Math.hypot(mx, my);
    const speed = player.sneaking ? PLAYER_SNEAK_SPEED : PLAYER_WALK_SPEED;
    const nx = player.x + (mx / len) * speed * dt;
    const ny = player.y + (my / len) * speed * dt;
    const next = moveCircle(level, player.x, player.y, nx, ny, player.radius);
    player.x = next.x;
    player.y = next.y;
    player.dir = Math.atan2(my, mx);
    player.stepPhase += dt * (player.sneaking ? 5 : 9);
  }
  player.coinCooldown = Math.max(0, player.coinCooldown - dt);
  player.empCooldown = Math.max(0, player.empCooldown - dt);
}

// A tossed coin arcs to a spot and rings for a moment. `tx, ty` aim it;
// without a target it lands ahead of the player.
export function tossCoin(player, tx = null, ty = null) {
  if (player.coins <= 0 || player.coinCooldown > 0) return null;
  player.coins -= 1;
  player.coinCooldown = 0.45;
  const range = 190;
  const x = tx ?? player.x + Math.cos(player.dir) * range;
  const y = ty ?? player.y + Math.sin(player.dir) * range;
  return { x, y, born: Date.now(), ttl: 1400 };
}

// An EMP burst: returns true when one fired.
export function fireEmp(player) {
  if (player.emp <= 0 || player.empCooldown > 0) return false;
  player.emp -= 1;
  player.empCooldown = 1.0;
  return true;
}

// Loot within reach of the player's hands.
export function lootInReach(level, player) {
  return level.loot.find((l) => !l.taken && Math.hypot(l.x - player.x, l.y - player.y) < TILE * 0.9);
}

export function safeInReach(level, player) {
  if (!level.safe || level.safe.cracked) return null;
  return Math.hypot(level.safe.x - player.x, level.safe.y - player.y) < TILE * 1.1 ? level.safe : null;
}

export function allLootTaken(level) {
  return level.loot.length > 0 && level.loot.every((l) => l.taken);
}

export function atExit(level, player) {
  return level.exit && Math.hypot(level.exit.x - player.x, level.exit.y - player.y) < TILE * 0.9;
}
