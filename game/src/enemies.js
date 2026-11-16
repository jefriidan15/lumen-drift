// Lumen Drift — enemy types and their movement. One file, one job: what
// each shade is, how it moves, and how it attacks. Combat numbers live in
// config.js; this file only turns them into behaviour.
import { CONFIG } from './config.js';

// Build one enemy of a type at a position, scaled to the wave number.
export function makeEnemy(type, x, y, wave) {
  const base = CONFIG.enemies[type];
  const hpScale = 1 + CONFIG.waves.hpScalePerWave * (wave - 1);
  const speedScale = 1 + CONFIG.waves.speedScalePerWave * (wave - 1);
  return {
    type,
    x, y,
    vx: 0, vy: 0,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 2.4,
    hp: Math.max(1, Math.round(base.hp * hpScale)),
    maxHp: Math.max(1, Math.round(base.hp * hpScale)),
    speed: base.speed * speedScale * (0.9 + Math.random() * 0.2),
    radius: base.radius,
    score: base.score,
    embers: base.embers,
    damage: base.damage,
    color: base.color,
    t: Math.random() * 10, // per-enemy clock for wobble / firing
    fireCooldown: 1.2 + Math.random(),
    hitFlash: 0,
    splitDone: false,
  };
}

// Steer one enemy for dt seconds. Returns an orb to fire, or null.
export function updateEnemy(e, player, dt, rng) {
  e.t += dt;
  const dx = player.x - e.x;
  const dy = player.y - e.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;

  if (e.type === 'mote') {
    // Chaser: straight at the player, slight wobble.
    const wob = Math.sin(e.t * 3) * 0.4;
    e.vx = (nx + -ny * wob) * e.speed;
    e.vy = (ny + nx * wob) * e.speed;
    e.angle = Math.atan2(e.vy, e.vx);
  } else if (e.type === 'wisp') {
    // Weaver: approaches on a sine wave, hard to lead.
    const perp = Math.sin(e.t * 2.2) * 0.9;
    e.vx = (nx + -ny * perp) * e.speed;
    e.vy = (ny + nx * perp) * e.speed;
    e.angle += e.spin * dt;
  } else if (e.type === 'shard') {
    // Splitter: slow, steady, rotates like a tumbling rock.
    e.vx = nx * e.speed;
    e.vy = ny * e.speed;
    e.angle += e.spin * dt;
  } else if (e.type === 'lance') {
    // Sniper: holds ~230px away and fires slow orbs.
    const want = 230;
    const toward = dist > want + 30 ? 1 : dist < want - 30 ? -1 : 0;
    const strafe = Math.sin(e.t * 1.4) * 0.7;
    e.vx = (nx * toward + -ny * strafe) * e.speed;
    e.vy = (ny * toward + nx * strafe) * e.speed;
    e.angle = Math.atan2(ny, nx);
    e.fireCooldown -= dt;
    if (e.fireCooldown <= 0 && dist < 520) {
      e.fireCooldown = 2.4 + rng() * 0.8;
      return {
        x: e.x, y: e.y,
        vx: nx * CONFIG.orbs.speed,
        vy: ny * CONFIG.orbs.speed,
        radius: CONFIG.orbs.radius,
        damage: CONFIG.orbs.damage,
      };
    }
  } else if (e.type === 'boss') {
    // Umbral Crown: drifts toward the player, spins, and every few
    // seconds fires a radial burst of orbs.
    e.vx = nx * e.speed;
    e.vy = ny * e.speed;
    e.angle += 0.9 * dt;
    e.fireCooldown -= dt;
    if (e.fireCooldown <= 0) {
      e.fireCooldown = 2.6;
      return { burst: true, x: e.x, y: e.y, count: 10, speed: CONFIG.orbs.speed * 0.8 };
    }
  }

  e.x += e.vx * dt;
  e.y += e.vy * dt;
  if (e.hitFlash > 0) e.hitFlash -= dt;
  return null;
}
