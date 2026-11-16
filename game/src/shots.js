// Lumen Drift — deterministic poses for the entry's screenshots. One file,
// one job: build a world frozen mid-moment for each shot (?shot=start,
// play, upgrade, end) from one seed, so every screenshot is a real render
// of the game's own code and looks the same every time it is taken.
import { mulberry32 } from './random.js';
import { World } from './world.js';
import { makeEnemy } from './enemies.js';
import { rollShop } from './upgrades.js';

// Pose a mid-fight world: wave 3, a busy arena, the HUD alive.
function posePlay(world) {
  const rng = mulberry32(1);
  world.startGame();
  world.wave = 3;
  world.score = 12480;
  world.embersHeld = 34;
  world.combo = 12;
  world.comboTimer = 2.4;
  world.bestCombo = 18;
  world.kills = 87;
  world.shotsFired = 412;
  world.shotsHit = 301;
  world.timePlayed = 187;
  world.player.hull = 76;
  world.player.x = 400;
  world.player.y = 340;
  world.player.vx = 130;
  world.player.vy = -70;
  world.player.angle = 0.5;
  world.banner = null;
  world.spawnQueue = ['mote', 'wisp', 'shard', 'lance', 'mote', 'wisp', 'mote'];
  const spots = [
    ['mote', 620, 210], ['mote', 700, 330], ['mote', 560, 430], ['mote', 500, 250],
    ['wisp', 300, 220], ['wisp', 660, 470], ['wisp', 520, 480],
    ['shard', 740, 250],
    ['lance', 250, 420], ['lance', 330, 480],
  ];
  for (const [type, x, y] of spots) {
    const e = makeEnemy(type, x, y, 3);
    e.angle = rng() * Math.PI * 2;
    if (type === 'shard') e.hp = 1; // a wounded shard, health bar showing
    world.enemies.push(e);
  }
  // A stream of bolts mid-flight toward the pack, one orb inbound.
  for (let i = 0; i < 6; i++) {
    world.bullets.push({
      x: 425 + i * 24, y: 332 - i * 7,
      vx: 640, vy: -60,
      damage: 1, pierce: 0, hitSet: new Set(), life: 1.0, radius: 4,
    });
  }
  world.orbs.push({ x: 320, y: 380, vx: 120, vy: -90, radius: 6, damage: 14, life: 5 });
  world.orbs.push({ x: 700, y: 400, vx: -110, vy: -80, radius: 6, damage: 14, life: 5 });
  for (let i = 0; i < 7; i++) {
    world.embers.push({
      x: 380 + rng() * 180, y: 300 + rng() * 130,
      vx: 0, vy: 0, radius: 6, value: 1, kind: 'ember', life: 12,
    });
  }
  world.embers.push({ x: 470, y: 430, vx: 0, vy: 0, radius: 9, value: 0, kind: 'heart', life: 12 });
  world.particles.burst(620, 210, '#ff5d73', 22, 240);
  world.particles.burst(300, 220, '#c77dff', 14, 200);
  world.particles.burst(520, 480, '#ffb703', 12, 180);
  world.particles.text(620, 190, '+150', '#eaf6ff', 15);
  world.particles.text(300, 200, 'COMBO x2.2', '#ffd166', 14);
}

function poseShop(world) {
  world.startGame();
  world.wave = 3;
  world.score = 12480;
  world.embersHeld = 26;
  world.kills = 87;
  world.phase = 'shop';
  world.shopOptions = rollShop(mulberry32(7), {});
  world.shopBought = new Set();
  world.banner = null;
}

function poseEnd(world) {
  world.startGame();
  world.wave = 6;
  world.score = 24860;
  world.kills = 143;
  world.shotsFired = 890;
  world.shotsHit = 640;
  world.bestCombo = 24;
  world.timePlayed = 342;
  world.best = 24860;
  world.player.hull = 0;
  world.phase = 'gameover';
  world.particles.burst(world.player.x, world.player.y, '#2de2ff', 40, 320, 0.9, 4);
}

// Build the posed world for a shot name, or null for a live game.
export function buildShotWorld(shot, audio = null) {
  const world = new World(audio, mulberry32(1));
  if (shot === 'start') return world; // title phase, fresh world
  if (shot === 'play') { posePlay(world); return world; }
  if (shot === 'upgrade') { poseShop(world); return world; }
  if (shot === 'end') { poseEnd(world); return world; }
  return null;
}
