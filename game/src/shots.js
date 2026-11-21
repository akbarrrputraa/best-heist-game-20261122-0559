// Shots: deterministic staged scenes for the screenshots (?shot=start,
// ?shot=play, ?shot=alert, ?shot=win, with &seed=). The game itself is
// untouched — staging only positions the thief, the guards and the cameras
// and picks a screen, then the frame is rendered once, frozen, so a
// screenshot is a real render of the game's own code in a chosen moment.
// The cover (play) shows everything the bounty asks for in one frame: the
// thief crossing a room, guard cones, a camera cone, a loot target and the
// alarm meter.

import { TILE } from './config.js';
import { GUARD_STATE } from './guard.js';

function place(game, px, py, dir) {
  game.player.x = px * TILE + TILE / 2;
  game.player.y = py * TILE + TILE / 2;
  game.player.dir = dir;
}

export function stageShot(game, shot) {
  if (shot === 'start') {
    game.screen = 'title';
    return true;
  }
  if (shot === 'play') {
    // Floor 1, mid-heist: one artifact pocketed, the thief crouched in a
    // shadow pool behind the slot machines while cones sweep past, a camera
    // watching the lane, a loot target ahead, alarm already warm.
    game.startLevel(0);
    game.level.loot[0].taken = true;
    game.lootValue = 500;
    game.score = 500;
    game.alarm = 34;
    place(game, 7, 10, 0);
    game.player.sneaking = true;
    game.guards[0].x = 13 * TILE + TILE / 2;
    game.guards[0].y = 4 * TILE + TILE / 2;
    game.guards[0].dir = Math.PI;
    game.guards[0].suspicion = 42;
    game.guards[0].state = GUARD_STATE.SUSPICIOUS;
    game.guards[0].lastSeen = { x: game.player.x, y: game.player.y };
    game.guards[1].x = 16 * TILE + TILE / 2;
    game.guards[1].y = 11 * TILE + TILE / 2;
    game.guards[1].dir = -Math.PI / 2;
    game.guards[2].x = 24 * TILE + TILE / 2;
    game.guards[2].y = 12 * TILE + TILE / 2;
    game.guards[2].dir = Math.PI / 2;
    game.cameras[0].lock = 55;
    game.levelTime = 47;
    game.screen = 'play';
    return true;
  }
  if (shot === 'alert') {
    // Floor 2: the thief is spotted — a guard charges in with a red cone,
    // a camera has locked on, a laser is live across the corridor, and the
    // alarm meter is nearly full.
    game.startLevel(1);
    game.level.loot[0].taken = true;
    game.level.loot[1].taken = true;
    game.lootValue = 1250;
    game.score = 1250;
    game.alarm = 82;
    place(game, 11, 9, Math.PI);
    game.player.coins = 2;
    game.player.emp = 1;
    game.guards[0].x = 9 * TILE + TILE / 2;
    game.guards[0].y = 9 * TILE + TILE / 2;
    game.guards[0].dir = 0;
    game.guards[0].state = GUARD_STATE.ALERT;
    game.guards[0].suspicion = 100;
    game.guards[0].lastSeen = { x: game.player.x, y: game.player.y };
    game.guards[1].x = 24 * TILE + TILE / 2;
    game.guards[1].y = 5 * TILE + TILE / 2;
    game.guards[1].dir = Math.PI * 0.75;
    game.guards[1].suspicion = 61;
    game.guards[1].state = GUARD_STATE.SUSPICIOUS;
    game.guards[1].lastSeen = { x: game.player.x, y: game.player.y };
    game.cameras[0].lock = 100;
    game.cameras[0].alarmed = true;
    game.lasers[0].live = true;
    game.levelTime = 96;
    game.screen = 'play';
    return true;
  }
  if (shot === 'win') {
    // The perfect heist: all three floors emptied, ghost bonus earned.
    // (A floor stays loaded underneath so the win panel has a world behind it.)
    game.startLevel(0);
    game.level.loot.forEach((l) => { l.taken = true; });
    place(game, 28, 2, Math.PI);
    game.screen = 'win';
    game.score = 9840;
    game.lootValue = 5750;
    game.winLines = [
      'All three floors emptied. Nine artifacts and the vault safe. Not once caught.',
      'Score: 9,840  ·  Time: 7:04  ·  Ghost bonus: +3,000',
      'The Meridian Vault never knew you were there.',
      '',
      'Press Enter to run the heist again.',
    ];
    return true;
  }
  return false;
}
