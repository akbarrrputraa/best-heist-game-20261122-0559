// Guard: the boots on the floor. A guard patrols waypoints, scans at each
// stop, and runs a four-state mind: PATROL -> SUSPICIOUS (something flickered
// in the cone) -> ALERT (eyes on you, chasing) -> SEARCH (lost you, checks
// the last place you were) -> back to PATROL. A tossed coin pulls a guard to
// investigate the noise. Detection is a suspicion meter, not a coin flip:
// the closer you are and the longer you linger in the cone, the faster it
// fills. Breaking line of sight lets it drain.

import {
  ALERT_MEMORY,
  DETECT_RATE,
  GUARD_CHASE_SPEED,
  GUARD_PATROL_SPEED,
  GUARD_SEARCH_SPEED,
  SEARCH_TIME,
  SHADOW_SAFE_RANGE,
  SNEAK_DETECT_FACTOR,
  SUSPICION_DECAY,
  TILE,
  VISION_HALF_ANGLE,
  VISION_RANGE,
} from './config.js';
import { hasLineOfSight, inShadow, moveCircle } from './level.js';

export const GUARD_STATE = { PATROL: 'patrol', SUSPICIOUS: 'suspicious', ALERT: 'alert', SEARCH: 'search' };

export function makeGuard(def, seedPhase = 0) {
  const [sx, sy] = def.waypoints[0];
  return {
    x: sx * TILE + TILE / 2,
    y: sy * TILE + TILE / 2,
    dir: 0, // facing angle, radians
    state: GUARD_STATE.PATROL,
    suspicion: 0,
    waypointIndex: 1 % def.waypoints.length,
    wait: 0,
    waitTime: def.wait ?? 1,
    speed: GUARD_PATROL_SPEED,
    lastSeen: null, // {x, y} where the player was last spotted
    unseenFor: 0,
    searchFor: 0,
    investigate: null, // {x, y} noise to check out
    waypoints: def.waypoints,
    scanPhase: seedPhase,
  };
}

export function angleTo(x0, y0, x1, y1) {
  return Math.atan2(y1 - y0, x1 - x0);
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function turnToward(guard, target, rate, dt) {
  const d = angleDiff(target, guard.dir);
  const step = Math.max(-rate * dt, Math.min(rate * dt, d));
  guard.dir += step;
}

// Can this guard see the player right now? Range, cone, line of sight, and
// shadow cover (inside a shadow pool you must be close to be spotted).
export function canSeePlayer(level, guard, player) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > VISION_RANGE) return { seen: false, closeness: 0 };
  if (Math.abs(angleDiff(angleTo(guard.x, guard.y, player.x, player.y), guard.dir)) > VISION_HALF_ANGLE) {
    return { seen: false, closeness: 0 };
  }
  if (!hasLineOfSight(level, guard.x, guard.y, player.x, player.y)) return { seen: false, closeness: 0 };
  if (inShadow(level, player.x, player.y) && dist > SHADOW_SAFE_RANGE) return { seen: false, closeness: 0 };
  return { seen: true, closeness: 1 - dist / VISION_RANGE };
}

function moveToward(level, guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  const next = moveCircle(level, guard.x, guard.y, guard.x + (dx / dist) * step, guard.y + (dy / dist) * step, 14);
  guard.dir = angleTo(guard.x, guard.y, next.x, next.y);
  guard.x = next.x;
  guard.y = next.y;
  return dist <= step + 1;
}

export function updateGuard(level, guard, player, dt, events) {
  const sight = canSeePlayer(level, guard, player);
  if (sight.seen) {
    const rate = DETECT_RATE * (0.35 + 0.65 * sight.closeness) * (player.sneaking ? SNEAK_DETECT_FACTOR : 1);
    guard.suspicion = Math.min(100, guard.suspicion + rate * dt);
    guard.lastSeen = { x: player.x, y: player.y };
    guard.unseenFor = 0;
    turnToward(guard, angleTo(guard.x, guard.y, player.x, player.y), 6, dt);
    if (guard.suspicion >= 100 && guard.state !== GUARD_STATE.ALERT) {
      guard.state = GUARD_STATE.ALERT;
      events.push({ type: 'spotted', guard });
    }
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - SUSPICION_DECAY * dt);
    guard.unseenFor += dt;
  }

  switch (guard.state) {
    case GUARD_STATE.PATROL: {
      if (guard.suspicion > 35) {
        guard.state = GUARD_STATE.SUSPICIOUS;
        break;
      }
      if (guard.investigate) {
        const arrived = moveToward(level, guard, guard.investigate.x, guard.investigate.y, GUARD_SEARCH_SPEED, dt);
        if (arrived) guard.investigate = null;
        break;
      }
      if (guard.wait > 0) {
        guard.wait -= dt;
        // Scan the room while waiting at a waypoint.
        guard.scanPhase += dt * 1.4;
        guard.dir += Math.sin(guard.scanPhase) * 0.9 * dt;
        break;
      }
      const [wx, wy] = guard.waypoints[guard.waypointIndex];
      const arrived = moveToward(level, guard, wx * TILE + TILE / 2, wy * TILE + TILE / 2, GUARD_PATROL_SPEED, dt);
      if (arrived) {
        guard.wait = guard.waitTime;
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
      }
      break;
    }
    case GUARD_STATE.SUSPICIOUS: {
      // Stare at the flicker, then go look. A half-full meter means "check it out".
      if (guard.lastSeen) {
        turnToward(guard, angleTo(guard.x, guard.y, guard.lastSeen.x, guard.lastSeen.y), 5, dt);
        const arrived = moveToward(level, guard, guard.lastSeen.x, guard.lastSeen.y, GUARD_SEARCH_SPEED, dt);
        if (arrived || guard.suspicion <= 0) {
          guard.state = GUARD_STATE.PATROL;
          guard.lastSeen = null;
        }
      } else {
        guard.state = GUARD_STATE.PATROL;
      }
      break;
    }
    case GUARD_STATE.ALERT: {
      if (sight.seen) {
        moveToward(level, guard, player.x, player.y, GUARD_CHASE_SPEED, dt);
      } else if (guard.unseenFor > ALERT_MEMORY) {
        guard.state = GUARD_STATE.SEARCH;
        guard.searchFor = SEARCH_TIME;
      } else if (guard.lastSeen) {
        moveToward(level, guard, guard.lastSeen.x, guard.lastSeen.y, GUARD_CHASE_SPEED, dt);
      }
      break;
    }
    case GUARD_STATE.SEARCH: {
      guard.searchFor -= dt;
      if (guard.lastSeen) {
        const arrived = moveToward(level, guard, guard.lastSeen.x, guard.lastSeen.y, GUARD_SEARCH_SPEED, dt);
        if (arrived) {
          guard.scanPhase += dt * 2;
          guard.dir += Math.sin(guard.scanPhase) * 1.6 * dt;
        }
      }
      if (guard.searchFor <= 0) {
        guard.state = GUARD_STATE.PATROL;
        guard.lastSeen = null;
      }
      break;
    }
    default:
      break;
  }
}
