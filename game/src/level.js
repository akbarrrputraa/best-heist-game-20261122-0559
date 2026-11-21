// Level: parses a tile map into walls, crates, shadows, loot, safe and exit,
// and answers the questions a heist lives on: can I walk here, and can that
// guard or camera see me from there. Lasers are beams between tile points.

import { COLS, ROWS, TILE } from './config.js';

export function tileAt(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return level.grid[ty][tx];
}

export function isSolid(level, tx, ty) {
  const t = tileAt(level, tx, ty);
  return t === '#' || t === 'C';
}

export function blocksSight(level, tx, ty) {
  return isSolid(level, tx, ty);
}

export function inShadow(level, px, py) {
  return tileAt(level, Math.floor(px / TILE), Math.floor(py / TILE)) === 'S';
}

// A circle (x, y, radius) may move to (nx, ny) if no solid tile blocks it.
// Slides along walls: tries the full move, then each axis alone.
export function moveCircle(level, x, y, nx, ny, radius) {
  if (!hitsSolid(level, nx, ny, radius)) return { x: nx, y: ny };
  if (!hitsSolid(level, nx, y, radius)) return { x: nx, y };
  if (!hitsSolid(level, x, ny, radius)) return { x, y: ny };
  return { x, y };
}

export function hitsSolid(level, x, y, radius) {
  const x0 = Math.floor((x - radius) / TILE);
  const x1 = Math.floor((x + radius) / TILE);
  const y0 = Math.floor((y - radius) / TILE);
  const y1 = Math.floor((y + radius) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (!isSolid(level, tx, ty)) continue;
      const cx = Math.max(tx * TILE, Math.min(x, tx * TILE + TILE));
      const cy = Math.max(ty * TILE, Math.min(y, ty * TILE + TILE));
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy < radius * radius) return true;
    }
  }
  return false;
}

// Line of sight between two points: steps along the segment and checks the
// tiles it passes through. Walls and crates block sight.
export function hasLineOfSight(level, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / (TILE / 4)));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const tx = Math.floor((x0 + dx * t) / TILE);
    const ty = Math.floor((y0 + dy * t) / TILE);
    if (blocksSight(level, tx, ty)) return false;
  }
  return true;
}

// Distance from point (px, py) to the segment (x1,y1)-(x2,y2).
export function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

export function parseLevel(def) {
  const grid = [];
  for (let y = 0; y < ROWS; y++) {
    const row = (def.map[y] ?? '').padEnd(COLS, '#').slice(0, COLS).split('');
    grid.push(row);
  }
  const level = {
    def,
    grid,
    loot: [],
    safe: null,
    exit: null,
    playerStart: { x: 2 * TILE + TILE / 2, y: 15 * TILE + TILE / 2 },
  };
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = grid[y][x];
      const cx = x * TILE + TILE / 2;
      const cy = y * TILE + TILE / 2;
      if (t === 'P') {
        level.playerStart = { x: cx, y: cy };
        grid[y][x] = '.';
      } else if (t === 'L') {
        level.loot.push({ x: cx, y: cy, tx: x, ty: y, taken: false, kind: level.loot.length % 3 });
        grid[y][x] = '.';
      } else if (t === 'V') {
        level.safe = { x: cx, y: cy, tx: x, ty: y, cracked: false, progress: 0 };
        grid[y][x] = '.';
      } else if (t === 'X') {
        level.exit = { x: cx, y: cy, tx: x, ty: y };
        grid[y][x] = '.';
      }
    }
  }
  return level;
}
