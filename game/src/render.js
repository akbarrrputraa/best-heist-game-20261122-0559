// Render: everything the eye sees. Canvas 2D, no images, no fonts to load:
// the vault is drawn from flat shapes — green felt floors, gold trim, dark
// walls, slot-machine crates, shadow pools, red laser beams, camera cones,
// guard cones that change colour with suspicion, and a HUD that always shows
// the loot target and the alarm meter. Screens are overlays on the world.

import { COLS, ROWS, TILE, VIEW_H, VIEW_W } from './config.js';
import { GUARD_STATE } from './guard.js';
import { cameraDir } from './camera.js';
import { distToSegment } from './level.js';

const GOLD = '#e8b64c';
const GOLD_DIM = '#8a6d2f';
const FELT_A = '#16211a';
const FELT_B = '#121a15';
const WALL = '#262b38';
const WALL_TOP = '#3a4152';
const CRATE = '#3d2f1e';
const CRATE_TOP = '#5a4426';
const SHADOW = 'rgba(18, 28, 58, 0.6)';
const TEXT = '#eef1f5';
const MUTED = '#9aa3b2';
const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

function conePath(ctx, x, y, dir, halfAngle, range) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, dir - halfAngle, dir + halfAngle);
  ctx.closePath();
}

function drawCone(ctx, x, y, dir, halfAngle, range, fill, edge) {
  conePath(ctx, x, y, dir, halfAngle, range);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function coneColor(state, suspicion) {
  if (state === GUARD_STATE.ALERT) return ['rgba(229, 83, 75, 0.28)', 'rgba(229, 83, 75, 0.55)'];
  if (state === GUARD_STATE.SUSPICIOUS || suspicion > 35) return ['rgba(242, 153, 60, 0.25)', 'rgba(242, 153, 60, 0.5)'];
  return ['rgba(242, 201, 76, 0.16)', 'rgba(242, 201, 76, 0.35)'];
}

function drawWorld(game, ctx) {
  const { level, time } = game;
  // Floor: green felt checker.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = level.grid[y][x];
      const px = x * TILE;
      const py = y * TILE;
      if (t === '#') {
        ctx.fillStyle = WALL;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = WALL_TOP;
        ctx.fillRect(px, py, TILE, 4);
        continue;
      }
      ctx.fillStyle = (x + y) % 2 === 0 ? FELT_A : FELT_B;
      ctx.fillRect(px, py, TILE, TILE);
      if (t === 'S') {
        ctx.fillStyle = SHADOW;
        ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
        ctx.strokeStyle = 'rgba(90, 120, 200, 0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 3.5, py + 3.5, TILE - 7, TILE - 7);
      } else if (t === 'C') {
        // A slot machine: dark cabinet, gold trim, a lit-up reel window.
        ctx.fillStyle = CRATE;
        ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
        ctx.strokeStyle = CRATE_TOP;
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 4.5, py + 4.5, TILE - 9, TILE - 9);
        const blink = 0.5 + 0.5 * Math.sin(time * 3 + x * 1.7 + y * 2.3);
        ctx.fillStyle = `rgba(242, 201, 76, ${0.25 + 0.45 * blink})`;
        ctx.fillRect(px + 10, py + 8, TILE - 20, 10);
        ctx.fillStyle = '#c94f4f';
        ctx.fillRect(px + 10, py + 22, TILE - 20, 4);
      }
    }
  }

  // Exit: the getaway door. Green and open once all loot is taken.
  if (level.exit) {
    const { x, y } = level.exit;
    const open = game.lootDone;
    const pulse = 0.5 + 0.5 * Math.sin(time * 4);
    ctx.save();
    ctx.fillStyle = open ? `rgba(76, 175, 80, ${0.35 + 0.3 * pulse})` : 'rgba(120, 60, 60, 0.4)';
    ctx.fillRect(x - 18, y - 18, 36, 36);
    ctx.strokeStyle = open ? '#4caf50' : '#a33';
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 18, y - 18, 36, 36);
    ctx.fillStyle = open ? '#b8f5bc' : '#e8a0a0';
    ctx.font = `bold 11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(open ? 'EXIT' : 'LOCKED', x, y + 1);
    if (open) {
      ctx.fillStyle = '#b8f5bc';
      ctx.beginPath();
      ctx.moveTo(x - 6, y + 26);
      ctx.lineTo(x + 6, y + 26);
      ctx.lineTo(x, y + 33);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Loot: gold bar, diamond, artifact — each glinting so the eye finds it.
  for (const loot of level.loot) {
    if (loot.taken) continue;
    const glint = 0.6 + 0.4 * Math.sin(time * 3.5 + loot.tx * 1.3);
    ctx.save();
    ctx.translate(loot.x, loot.y);
    ctx.shadowColor = '#ffd76a';
    ctx.shadowBlur = 12 * glint;
    if (loot.kind === 0) {
      ctx.fillStyle = '#f2c94c';
      ctx.beginPath();
      ctx.moveTo(-12, 6);
      ctx.lineTo(-8, -7);
      ctx.lineTo(8, -7);
      ctx.lineTo(12, 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffe9a8';
      ctx.fillRect(-6, -4, 12, 3);
    } else if (loot.kind === 1) {
      ctx.fillStyle = '#7ee7f2';
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(10, 0);
      ctx.lineTo(0, 12);
      ctx.lineTo(-10, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#d8fbff';
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, 12);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = '#c77dff';
      ctx.beginPath();
      ctx.arc(0, -2, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e0aaff';
      ctx.beginPath();
      ctx.arc(-3, -5, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#9d4edd';
      ctx.fillRect(-7, 6, 14, 4);
    }
    ctx.restore();
  }

  // The vault safe: steel door, dial, and a crack progress ring.
  if (level.safe) {
    const s = level.safe;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.fillStyle = s.cracked ? '#3a5a3a' : '#4a4f5c';
    ctx.fillRect(-19, -19, 38, 38);
    ctx.strokeStyle = s.cracked ? '#7fd67f' : GOLD;
    ctx.lineWidth = 3;
    ctx.strokeRect(-19, -19, 38, 38);
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#22252e';
    ctx.fill();
    ctx.strokeStyle = '#c8cdd8';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(7, -4);
    ctx.stroke();
    if (!s.cracked && s.progress > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * s.progress);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.fillStyle = s.cracked ? '#b8f5bc' : GOLD;
    ctx.font = `bold 10px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(s.cracked ? 'OPEN' : 'VAULT', 0, 30);
    ctx.restore();
  }

  // Lasers: emitter posts and the beam between them, live or charging.
  for (const beam of game.lasers) {
    const ax = beam.x1 * TILE + TILE / 2;
    const ay = beam.y1 * TILE + TILE / 2;
    const bx = beam.x2 * TILE + TILE / 2;
    const by = beam.y2 * TILE + TILE / 2;
    const live = beam.live && game.empLeft <= 0;
    const disabled = game.empLeft > 0;
    ctx.save();
    if (live) {
      ctx.shadowColor = '#ff2d2d';
      ctx.shadowBlur = 14;
      ctx.strokeStyle = 'rgba(255, 45, 45, 0.95)';
      ctx.lineWidth = 3;
    } else if (disabled) {
      ctx.strokeStyle = 'rgba(120, 120, 120, 0.6)';
      ctx.lineWidth = 2;
    } else {
      ctx.strokeStyle = 'rgba(255, 45, 45, 0.25)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
    }
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.restore();
    for (const [ex, ey] of [[ax, ay], [bx, by]]) {
      ctx.fillStyle = disabled ? '#666' : '#c22';
      ctx.fillRect(ex - 5, ey - 5, 10, 10);
      ctx.fillStyle = live ? '#ff8080' : '#ff5a5a';
      ctx.beginPath();
      ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Cameras: wall-mounted eyes and their sweeping red cones.
  for (const cam of game.cameras) {
    const dir = cameraDir(cam, time);
    const dead = cam.disabledFor > 0;
    if (!dead) {
      const locked = cam.lock >= 100;
      const fill = locked ? 'rgba(255, 45, 45, 0.30)' : `rgba(255, 45, 45, ${0.10 + 0.08 * (cam.lock / 100)})`;
      drawCone(ctx, cam.x, cam.y, dir, 0.5, cam.range, fill, locked ? 'rgba(255, 45, 45, 0.6)' : 'rgba(255, 45, 45, 0.25)');
    }
    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.rotate(dir);
    ctx.fillStyle = dead ? '#555' : '#2a2e38';
    ctx.fillRect(-8, -5, 16, 10);
    ctx.fillStyle = dead ? '#777' : cam.lock >= 100 ? '#ff2d2d' : '#ff5a5a';
    ctx.beginPath();
    ctx.arc(8, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (!dead && cam.lock > 1) {
      ctx.save();
      ctx.strokeStyle = cam.lock >= 100 ? '#ff2d2d' : '#ffb84d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cam.x, cam.y, 15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (cam.lock / 100));
      ctx.stroke();
      ctx.restore();
    }
  }

  // Guard vision cones first (under the guards), then the guards.
  for (const guard of game.guards) {
    const [fill, edge] = coneColor(guard.state, guard.suspicion);
    drawCone(ctx, guard.x, guard.y, guard.dir, 0.62, 290, fill, edge);
  }
  for (const guard of game.guards) {
    ctx.save();
    ctx.translate(guard.x, guard.y);
    ctx.fillStyle = guard.state === GUARD_STATE.ALERT ? '#a33327' : '#2e4a6b';
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = guard.state === GUARD_STATE.ALERT ? '#ff6b5e' : '#6ea8d8';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Facing tick + cap brim.
    ctx.rotate(guard.dir);
    ctx.fillStyle = '#dfe6ef';
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(6, -4);
    ctx.lineTo(6, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Suspicion arc over the head.
    if (guard.suspicion > 1) {
      ctx.save();
      ctx.strokeStyle = guard.suspicion >= 100 ? '#ff2d2d' : '#ffb84d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (guard.suspicion / 100));
      ctx.stroke();
      ctx.restore();
    }
    if (guard.state === GUARD_STATE.ALERT) {
      ctx.fillStyle = '#ff2d2d';
      ctx.font = `bold 16px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('!', guard.x, guard.y - 24);
    } else if (guard.state === GUARD_STATE.SUSPICIOUS) {
      ctx.fillStyle = '#ffb84d';
      ctx.font = `bold 16px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('?', guard.x, guard.y - 24);
    }
  }

  // Tossed coins: gold dot + the noise ring guards can hear.
  for (const coin of game.coins) {
    const age = Date.now() - coin.born;
    const left = Math.max(0, 1 - age / coin.ttl);
    ctx.save();
    ctx.strokeStyle = `rgba(242, 201, 76, ${0.55 * left})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 190 * (1 - left * 0.6), 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Particles: gold sparks on a grab, red flash on a laser.
  for (const p of game.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // The thief: black hood, gold mask line, a soft ring when sneaking.
  const pl = game.player;
  ctx.save();
  ctx.translate(pl.x, pl.y);
  const bob = pl.moving ? Math.sin(pl.stepPhase) * 1.5 : 0;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 12 + bob, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#101014';
  ctx.beginPath();
  ctx.arc(0, bob, pl.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = pl.sneaking ? '#8a6d2f' : GOLD;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.rotate(pl.dir);
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.moveTo(pl.radius + 2, 0);
  ctx.lineTo(pl.radius - 6, -5);
  ctx.lineTo(pl.radius - 6, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  if (pl.sneaking) {
    ctx.save();
    ctx.strokeStyle = 'rgba(232, 182, 76, 0.5)';
    ctx.setLineDash([4, 5]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(pl.x, pl.y, pl.radius + 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  // "E" prompt when something is in reach.
  if (game.prompt) {
    ctx.save();
    ctx.fillStyle = 'rgba(10, 12, 18, 0.85)';
    ctx.fillRect(pl.x - 52, pl.y - 52, 104, 22);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1;
    ctx.strokeRect(pl.x - 52, pl.y - 52, 104, 22);
    ctx.fillStyle = GOLD;
    ctx.font = `bold 12px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(game.prompt, pl.x, pl.y - 41);
    ctx.restore();
  }
}

function bar(ctx, x, y, w, h, frac, fill, label) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * Math.min(1, Math.max(0, frac))), h - 2);
  ctx.strokeStyle = 'rgba(238, 241, 245, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);
  ctx.fillStyle = TEXT;
  ctx.font = `bold 11px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 6, y + h / 2 + 0.5);
  ctx.restore();
}

function drawHUD(game, ctx) {
  const taken = game.level.loot.filter((l) => l.taken).length;
  const total = game.level.loot.length;
  const alarm = game.alarm;
  const alarmColor = alarm >= 100 ? '#ff2d2d' : alarm >= 60 ? '#ff7a2d' : alarm >= 30 ? '#f2c94c' : '#4caf50';
  const flash = alarm >= 60 ? 0.5 + 0.5 * Math.sin(game.time * 6) : 0;

  ctx.save();
  ctx.fillStyle = 'rgba(8, 10, 15, 0.82)';
  ctx.fillRect(0, 0, VIEW_W, 56);
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, 56, VIEW_W, 2);

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = GOLD;
  ctx.font = `bold 17px ${FONT}`;
  ctx.fillText('GILDED HEIST', 14, 18);
  ctx.fillStyle = MUTED;
  ctx.font = `12px ${FONT}`;
  ctx.fillText(game.level.def.name, 14, 38);

  // Loot target.
  ctx.fillStyle = TEXT;
  ctx.font = `bold 14px ${FONT}`;
  ctx.fillText(`◆ LOOT ${taken}/${total}`, 250, 18);
  ctx.fillStyle = MUTED;
  ctx.font = `12px ${FONT}`;
  ctx.fillText(`$${game.lootValue.toLocaleString('en-US')} banked`, 250, 38);

  // Alarm meter — the big one, centre stage.
  const ax = 470;
  ctx.fillStyle = alarm >= 60 ? `rgba(255, 45, 45, ${0.25 + 0.35 * flash})` : 'transparent';
  ctx.fillRect(ax - 8, 6, 300, 44);
  bar(ctx, ax, 12, 284, 16, alarm / 100, alarmColor, `ALARM ${Math.round(alarm)}%`);
  ctx.fillStyle = MUTED;
  ctx.font = `11px ${FONT}`;
  ctx.fillText(game.lockdown > 0 ? '⚠ LOCKDOWN — every guard is hunting you' : alarm >= 60 ? 'They know something is wrong…' : alarm >= 30 ? 'Stay out of the cones' : 'Silent so far', ax, 40);

  // Score, lives, tools, time.
  ctx.textAlign = 'right';
  ctx.fillStyle = TEXT;
  ctx.font = `bold 14px ${FONT}`;
  ctx.fillText(`SCORE ${game.score.toLocaleString('en-US')}`, 1270 - 330, 18);
  ctx.fillStyle = '#ff6b6b';
  ctx.font = `bold 14px ${FONT}`;
  ctx.fillText('♥'.repeat(Math.max(0, game.lives)) + '♡'.repeat(Math.max(0, 3 - game.lives)), 1270 - 330, 38);
  ctx.fillStyle = TEXT;
  ctx.font = `13px ${FONT}`;
  ctx.fillText(`◉ coins ${game.player.coins}    ⚡ EMP ${game.player.emp}${game.empLeft > 0 ? ` (${Math.ceil(game.empLeft)}s)` : ''}`, 1270 - 170, 18);
  ctx.fillStyle = MUTED;
  ctx.font = `12px ${FONT}`;
  const mm = Math.floor(game.levelTime / 60);
  const ss = Math.floor(game.levelTime % 60).toString().padStart(2, '0');
  ctx.fillText(`${mm}:${ss}`, 1270 - 170, 38);
  ctx.restore();
}

function overlay(ctx, lines, title, titleColor) {
  ctx.save();
  ctx.fillStyle = 'rgba(5, 7, 11, 0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = titleColor;
  ctx.font = `bold 52px ${FONT}`;
  ctx.fillText(title, VIEW_W / 2, 190);
  ctx.fillStyle = TEXT;
  ctx.font = `19px ${FONT}`;
  let y = 268;
  for (const line of lines) {
    ctx.fillText(line, VIEW_W / 2, y);
    y += 34;
  }
  ctx.restore();
}

function drawTitle(game, ctx) {
  // The vault door behind the title: concentric gold rings on dark felt.
  ctx.save();
  ctx.fillStyle = '#0b0e13';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const cx = VIEW_W / 2;
  const cy = 330;
  for (let r = 260; r > 40; r -= 34) {
    ctx.strokeStyle = r % 68 === 0 ? 'rgba(232, 182, 76, 0.35)' : 'rgba(232, 182, 76, 0.12)';
    ctx.lineWidth = r % 68 === 0 ? 3 : 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#1c2029';
  ctx.beginPath();
  ctx.arc(cx, cy, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 26, cy);
  ctx.lineTo(cx + 26, cy);
  ctx.moveTo(cx, cy - 26);
  ctx.lineTo(cx, cy + 26);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = GOLD;
  ctx.font = `bold 64px ${FONT}`;
  ctx.fillText('GILDED HEIST', VIEW_W / 2, 108);
  ctx.fillStyle = TEXT;
  ctx.font = `20px ${FONT}`;
  ctx.fillText('Three floors of the Meridian Vault. One thief. No alarms — if you can help it.', VIEW_W / 2, 158);
  ctx.fillStyle = MUTED;
  ctx.font = `16px ${FONT}`;
  const lines = [
    'WASD / arrows — move      Shift — sneak (slow, half as easy to spot)',
    'Q or click — toss a coin, pull a guard away      F — EMP burst (kills cameras + lasers, but loud)',
    'E — grab loot · hold E — crack the vault safe · reach the green EXIT once the loot is taken',
    'Guards and cameras fill their meters when they see you. A full camera lock trips the alarm.',
    'Cross a live laser and the alarm jumps. At 100% the vault locks down and every guard hunts you.',
  ];
  let y = 470;
  for (const line of lines) {
    ctx.fillText(line, VIEW_W / 2, y);
    y += 28;
  }
  const blink = 0.55 + 0.45 * Math.sin(game.time * 3);
  ctx.fillStyle = `rgba(238, 241, 245, ${blink})`;
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillText('Press Enter to start the heist', VIEW_W / 2, 648);
  if (game.best > 0) {
    ctx.fillStyle = GOLD;
    ctx.font = `15px ${FONT}`;
    ctx.fillText(`Best score: ${game.best.toLocaleString('en-US')}`, VIEW_W / 2, 684);
  }
  ctx.restore();
}

export function render(game, ctx) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (game.screen === 'title') {
    drawTitle(game, ctx);
    return;
  }
  drawWorld(game, ctx);
  drawHUD(game, ctx);
  if (game.screen === 'paused') {
    overlay(ctx, ['Take a breath. The vault waits.', '', 'Press P to keep moving.'], 'PAUSED', TEXT);
  } else if (game.screen === 'caught') {
    overlay(ctx, ['A guard grabbed you. One life gone — the loot stays pocketed.', '', 'Press Enter to try the floor again.'], 'CAUGHT!', '#ff5a4d');
  } else if (game.screen === 'gameover') {
    overlay(
      ctx,
      ['Three strikes. The Meridian Vault keeps its gold tonight.', `Score: ${game.score.toLocaleString('en-US')}`, '', 'Press Enter to plan the heist again.'],
      'THE VAULT WINS',
      '#ff5a4d',
    );
  } else if (game.screen === 'levelclear') {
    overlay(ctx, game.clearLines, 'FLOOR CLEARED', GOLD);
  } else if (game.screen === 'win') {
    overlay(ctx, game.winLines, 'THE PERFECT HEIST', GOLD);
  }
}

// True while the thief's body crosses a live laser beam.
export function playerOnLiveLaser(game) {
  const pl = game.player;
  if (game.empLeft > 0) return null;
  for (const beam of game.lasers) {
    if (!beam.live) continue;
    const ax = beam.x1 * TILE + TILE / 2;
    const ay = beam.y1 * TILE + TILE / 2;
    const bx = beam.x2 * TILE + TILE / 2;
    const by = beam.y2 * TILE + TILE / 2;
    if (distToSegment(pl.x, pl.y, ax, ay, bx, by) < pl.radius + 3) return beam;
  }
  return null;
}
