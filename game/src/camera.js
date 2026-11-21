// Security camera: bolted to a wall, sweeping its cone back and forth. It
// never moves, but it never blinks either. If you linger in its cone its
// lock meter fills; a full lock trips the alarm and points every guard at
// you. An EMP burst kills cameras (and lasers) for a few seconds — the
// camera shows a dead grey eye while it is down.

import {
  CAMERA_ALARM,
  CAMERA_DETECT_RATE,
  CAMERA_HALF_ANGLE,
  CAMERA_RANGE,
  SHADOW_SAFE_RANGE,
  SNEAK_DETECT_FACTOR,
  TILE,
} from './config.js';
import { angleDiff, angleTo } from './guard.js';
import { hasLineOfSight, inShadow } from './level.js';

export function makeCamera(def) {
  return {
    x: def.x * TILE + TILE / 2,
    y: def.y * TILE + TILE / 2,
    base: def.base,
    sweep: def.sweep,
    speed: def.speed,
    range: def.range ?? CAMERA_RANGE,
    dir: def.base,
    phase: Math.random() * Math.PI * 2,
    lock: 0, // 0..100, fills while the player is in the cone
    disabledFor: 0, // seconds left of EMP shutdown
    alarmed: false, // true once this lock has already tripped the alarm
  };
}

// Where the camera is looking right now (its sweep is a slow sine).
export function cameraDir(camera, time) {
  return camera.base + Math.sin(time * camera.speed + camera.phase) * camera.sweep;
}

export function cameraSeesPlayer(level, camera, player, time) {
  if (camera.disabledFor > 0) return { seen: false, closeness: 0 };
  const dx = player.x - camera.x;
  const dy = player.y - camera.y;
  const dist = Math.hypot(dx, dy);
  if (dist > camera.range) return { seen: false, closeness: 0 };
  const dir = cameraDir(camera, time);
  if (Math.abs(angleDiff(angleTo(camera.x, camera.y, player.x, player.y), dir)) > CAMERA_HALF_ANGLE) {
    return { seen: false, closeness: 0 };
  }
  if (!hasLineOfSight(level, camera.x, camera.y, player.x, player.y)) return { seen: false, closeness: 0 };
  if (inShadow(level, player.x, player.y) && dist > SHADOW_SAFE_RANGE) return { seen: false, closeness: 0 };
  return { seen: true, closeness: 1 - dist / camera.range, dir };
}

export function updateCamera(level, camera, player, time, dt, events) {
  if (camera.disabledFor > 0) {
    camera.disabledFor = Math.max(0, camera.disabledFor - dt);
    camera.lock = Math.max(0, camera.lock - 60 * dt);
    return;
  }
  const sight = cameraSeesPlayer(level, camera, player, time);
  if (sight.seen) {
    const rate = CAMERA_DETECT_RATE * (0.4 + 0.6 * sight.closeness) * (player.sneaking ? SNEAK_DETECT_FACTOR : 1);
    camera.lock = Math.min(100, camera.lock + rate * dt);
    if (camera.lock >= 100 && !camera.alarmed) {
      camera.alarmed = true;
      events.push({ type: 'camera-lock', camera });
    }
  } else {
    camera.lock = Math.max(0, camera.lock - 40 * dt);
    if (camera.lock < 100) camera.alarmed = false;
  }
}

// The alarm points a full camera lock is worth.
export { CAMERA_ALARM };
