// Lumen Drift — the simulation. One file, one job: the world state, the
// loop step (move, shoot, spawn, collide, score), waves and the shop phase.
// It draws nothing and hears nothing; render.js and audio.js do that.
import { CONFIG } from './config.js';
import { rimPoint } from './random.js';
import { makeEnemy, updateEnemy } from './enemies.js';
import { rollShop, applyUpgrade, freshBuild } from './upgrades.js';
import { Particles } from './particles.js';

export class World {
  constructor(audio = null, rng = Math.random) {
    this.audio = audio;
    this.rng = rng;
    this.particles = new Particles();
    this.phase = 'title'; // title | playing | shop | gameover
    this.reset();
  }

  reset() {
    const a = CONFIG.arena;
    this.player = {
      x: a.x, y: a.y, vx: 0, vy: 0, angle: -Math.PI / 2,
      hull: CONFIG.player.hull,
      fireCooldown: 0,
      dashTime: 0,
      dashCooldown: 0,
      invuln: 0,
      shieldUntil: 0,
    };
    this.build = freshBuild();
    this.owned = {};
    this.bullets = [];
    this.orbs = [];
    this.enemies = [];
    this.embers = [];
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.wave = 0;
    this.score = 0;
    this.embersHeld = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.bestCombo = 0;
    this.kills = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.embersEarned = 0;
    this.timePlayed = 0;
    this.banner = null; // {text, sub, t, max}
    this.shopOptions = [];
    this.shopBought = new Set();
    this.particles = new Particles();
    this.best = this.loadBest();
  }

  loadBest() {
    try {
      return Number(window.localStorage.getItem('lumen-drift-best') || 0) || 0;
    } catch {
      return 0;
    }
  }

  saveBest() {
    try {
      if (this.score > this.best) window.localStorage.setItem('lumen-drift-best', String(this.score));
    } catch { /* storage unavailable: best score just isn't kept */ }
  }

  get multiplier() {
    const capSteps = (this.build.comboCap - 1) * 10;
    return 1 + Math.min(this.combo, capSteps) * CONFIG.combo.perKill;
  }

  get magnetRadius() {
    return CONFIG.player.magnetRadius * this.build.magnetMul;
  }

  startGame() {
    this.reset();
    this.phase = 'playing';
    this.nextWave();
  }

  nextWave() {
    this.wave += 1;
    const budget = CONFIG.waves.budgetBase + CONFIG.waves.budgetPerWave * this.wave;
    const queue = [];
    let left = budget;
    const isBoss = this.wave % 5 === 0;
    // Spend the budget: cheap motes early, heavier mix as waves climb.
    const table = [
      ['mote', 1], ['mote', 1], ['wisp', 2],
      ['shard', 3], ['lance', 3],
    ];
    if (this.wave >= 3) table.push(['wisp', 2], ['shard', 3]);
    if (this.wave >= 4) table.push(['lance', 3]);
    while (left > 0) {
      const [type, cost] = table[Math.floor(this.rng() * table.length)];
      if (cost > left && left < 3) {
        queue.push('mote');
        left -= 1;
      } else if (cost <= left) {
        queue.push(type);
        left -= cost;
      } else {
        queue.push('mote');
        left -= 1;
      }
    }
    if (isBoss) queue.unshift('boss');
    this.spawnQueue = queue;
    this.spawnTimer = 0.6;
    this.banner = {
      text: isBoss ? 'THE UMBRAL CROWN' : `WAVE ${this.wave}`,
      sub: isBoss ? `Wave ${this.wave} — the Crown awakens` : `${queue.length} shades incoming`,
      t: 1.8, max: 1.8,
    };
    this.audio?.wave();
  }

  openShop() {
    const bonus = CONFIG.waves.clearBonus * this.wave;
    this.score += bonus;
    this.particles.text(CONFIG.arena.x, CONFIG.arena.y - 40, `WAVE BONUS +${bonus}`, '#ffd166', 22);
    this.shopOptions = rollShop(this.rng, this.owned);
    this.shopBought = new Set();
    this.phase = 'shop';
  }

  buyUpgrade(index) {
    const u = this.shopOptions[index];
    if (!u || this.shopBought.has(u.id)) return false;
    if (this.embersHeld < u.cost) return false;
    this.embersHeld -= u.cost;
    applyUpgrade(this.build, this.owned, u.id);
    this.shopBought.add(u.id);
    this.audio?.upgrade();
    this.particles.burst(this.player.x, this.player.y, '#ffd166', 18, 200);
    return true;
  }

  beginNextWave() {
    this.phase = 'playing';
    this.nextWave();
  }

  // ---- per-frame step (only called while phase is 'playing') ----
  update(dt, input) {
    const p = this.player;
    const a = CONFIG.arena;

    if (this.banner) {
      this.banner.t -= dt;
      if (this.banner.t <= 0) this.banner = null;
    }
    this.timePlayed += dt;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
    if (p.invuln > 0) p.invuln -= dt;
    if (p.dashCooldown > 0) p.dashCooldown -= dt;
    if (p.fireCooldown > 0) p.fireCooldown -= dt;
    this.tickAegis(dt);

    // Aim follows the mouse; movement follows WASD / arrows.
    p.angle = Math.atan2(input.mouse.y - p.y, input.mouse.x - p.x);
    const mv = input.moveVector();
    const maxSpeed = CONFIG.player.maxSpeed * this.build.speedMul;
    if (p.dashTime > 0) {
      p.dashTime -= dt;
    } else {
      p.vx += mv.x * CONFIG.player.accel * dt;
      p.vy += mv.y * CONFIG.player.accel * dt;
      const damp = Math.max(0, 1 - CONFIG.player.damping * dt);
      p.vx *= damp;
      p.vy *= damp;
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > maxSpeed) {
        p.vx = (p.vx / sp) * maxSpeed;
        p.vy = (p.vy / sp) * maxSpeed;
      }
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    // Stay inside the arena ring.
    const dcx = p.x - a.x;
    const dcy = p.y - a.y;
    const dc = Math.hypot(dcx, dcy);
    if (dc > a.radius - 11) {
      p.x = a.x + (dcx / dc) * (a.radius - 11);
      p.y = a.y + (dcy / dc) * (a.radius - 11);
      p.vx *= 0.4;
      p.vy *= 0.4;
    }

    // Dash: Space or Shift, if a charge is ready.
    if ((input.justPressed(' ') || input.justPressed('shift')) && p.dashCooldown <= 0 && this.build.dashCharges > 0) {
      this.build.dashCharges -= 1;
      p.dashTime = CONFIG.player.dashTime;
      p.dashCooldown = CONFIG.player.dashCooldown;
      p.invuln = Math.max(p.invuln, CONFIG.player.dashTime + 0.05);
      const d = Math.hypot(mv.x, mv.y) > 0 ? mv : { x: Math.cos(p.angle), y: Math.sin(p.angle) };
      p.vx = d.x * maxSpeed * CONFIG.player.dashSpeed;
      p.vy = d.y * maxSpeed * CONFIG.player.dashSpeed;
      this.particles.burst(p.x, p.y, '#2de2ff', 10, 160);
      this.audio?.dash();
    }
    // Dash charges refill slowly, one at a time, up to the owned cap.
    if (p.dashTime <= 0 && this.build.dashCharges < this.dashCap()) {
      this.dashRefill = (this.dashRefill || 0) + dt;
      if (this.dashRefill > 3.5) {
        this.dashRefill = 0;
        this.build.dashCharges += 1;
      }
    }

    // Fire: hold the mouse button.
    if (input.firing && p.fireCooldown <= 0) {
      const rate = CONFIG.player.fireRate * this.build.fireRateMul;
      p.fireCooldown = 1 / rate;
      const n = this.build.shots;
      for (let i = 0; i < n; i++) {
        const spread = (i - (n - 1) / 2) * 0.09;
        const ang = p.angle + spread;
        this.bullets.push({
          x: p.x + Math.cos(p.angle) * 16,
          y: p.y + Math.sin(p.angle) * 16,
          vx: Math.cos(ang) * CONFIG.player.boltSpeed,
          vy: Math.sin(ang) * CONFIG.player.boltSpeed,
          damage: CONFIG.player.boltDamage * this.build.damageMul,
          pierce: this.build.pierce,
          hitSet: new Set(),
          life: 1.2,
          radius: CONFIG.player.boltRadius,
        });
      }
      this.shotsFired += n;
      this.audio?.shoot();
    }

    // Spawn trickle.
    if (this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const interval = Math.max(
          CONFIG.waves.spawnIntervalMin,
          CONFIG.waves.spawnInterval - this.wave * 0.05,
        );
        this.spawnTimer = interval;
        const type = this.spawnQueue.shift();
        let pt = rimPoint(this.rng, a);
        // Not right on top of the player, if we can help it.
        for (let tries = 0; tries < 5 && Math.hypot(pt.x - p.x, pt.y - p.y) < 200; tries++) {
          pt = rimPoint(this.rng, a);
        }
        this.enemies.push(makeEnemy(type, pt.x, pt.y, this.wave));
      }
    }

    // Enemies move; lances and the boss may fire orbs.
    for (const e of this.enemies) {
      const shot = updateEnemy(e, p, dt, this.rng);
      if (shot) {
        if (shot.burst) {
          for (let i = 0; i < shot.count; i++) {
            const ang = (i / shot.count) * Math.PI * 2 + e.angle;
            this.orbs.push({
              x: shot.x, y: shot.y,
              vx: Math.cos(ang) * shot.speed, vy: Math.sin(ang) * shot.speed,
              radius: CONFIG.orbs.radius, damage: CONFIG.orbs.damage, life: 6,
            });
          }
        } else {
          this.orbs.push({ ...shot, life: 6 });
        }
      }
    }
    // Gentle separation so enemies never stack into one blob.
    for (let i = 0; i < this.enemies.length; i++) {
      for (let j = i + 1; j < this.enemies.length; j++) {
        const A = this.enemies[i];
        const B = this.enemies[j];
        const dx = B.x - A.x;
        const dy = B.y - A.y;
        const d = Math.hypot(dx, dy);
        const min = A.radius + B.radius;
        if (d > 0 && d < min) {
          const push = ((min - d) / 2) * 0.5;
          const nx = dx / d;
          const ny = dy / d;
          A.x -= nx * push;
          A.y -= ny * push;
          B.x += nx * push;
          B.y += ny * push;
        }
      }
    }

    // Bullets fly and hit.
    for (const b of this.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (Math.hypot(b.x - a.x, b.y - a.y) > a.radius + 20) b.life = 0;
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);
    for (const b of this.bullets) {
      for (const e of this.enemies) {
        if (b.life <= 0 || b.hitSet.has(e)) continue;
        if (Math.hypot(b.x - e.x, b.y - e.y) < b.radius + e.radius) {
          b.hitSet.add(e);
          this.shotsHit += 1;
          e.hp -= b.damage;
          e.hitFlash = 0.12;
          this.particles.burst(b.x, b.y, e.color, 4, 140, 0.3, 2.5);
          this.audio?.hit();
          if (e.hp <= 0) this.killEnemy(e);
          if (b.pierce > 0) {
            b.pierce -= 1;
          } else {
            b.life = 0;
          }
          break;
        }
      }
    }

    // Orbs fly and hurt the player.
    for (const o of this.orbs) {
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.life -= dt;
      if (Math.hypot(o.x - a.x, o.y - a.y) > a.radius + 30) o.life = 0;
      if (o.life > 0 && p.invuln <= 0 && Math.hypot(o.x - p.x, o.y - p.y) < o.radius + 11) {
        o.life = 0;
        this.hurtPlayer(o.damage, o.x, o.y);
      }
    }
    this.orbs = this.orbs.filter((o) => o.life > 0);

    // Enemies touch the player.
    for (const e of this.enemies) {
      if (p.invuln <= 0 && Math.hypot(e.x - p.x, e.y - p.y) < e.radius + 11) {
        this.hurtPlayer(e.damage, e.x, e.y);
        // Shove the enemy back so one touch is not a chain of touches.
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        e.x = p.x + (dx / d) * (e.radius + 14);
        e.y = p.y + (dy / d) * (e.radius + 14);
      }
    }

    // Embers drift, magnetise and get collected.
    for (const m of this.embers) {
      m.life -= dt;
      const dx = p.x - m.x;
      const dy = p.y - m.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < this.magnetRadius) {
        m.vx += (dx / d) * 1400 * dt;
        m.vy += (dy / d) * 1400 * dt;
      }
      m.vx *= 1 - 2.5 * dt;
      m.vy *= 1 - 2.5 * dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (d < 11 + m.radius) {
        m.life = 0;
        if (m.kind === 'heart') {
          p.hull = Math.min(this.build.maxHull, p.hull + 20);
          this.particles.text(p.x, p.y - 22, '+20 HULL', '#ff5d8f', 15);
        } else {
          this.embersHeld += m.value;
          this.embersEarned += m.value;
          this.particles.text(m.x, m.y - 8, `+${m.value}`, '#ffd166', 13);
        }
        this.audio?.pickup();
      }
    }
    this.embers = this.embers.filter((m) => m.life > 0);

    // Remove the dead (kills already paid out in killEnemy).
    this.enemies = this.enemies.filter((e) => e.hp > 0);

    // Wave cleared: nothing left to spawn, nothing left alive.
    if (this.spawnQueue.length === 0 && this.enemies.length === 0 && this.phase === 'playing') {
      this.openShop();
    }

    this.particles.update(dt);
  }

  dashCap() {
    return 1 + (this.owned.dash || 0);
  }

  hurtPlayer(damage, fromX, fromY) {
    const p = this.player;
    if (p.invuln > 0) return;
    // Aegis: the first hit after the shield recharges is ignored.
    if (this.build.aegis && (this.aegisReady === undefined || this.aegisReady)) {
      this.aegisReady = false;
      this.aegisTimer = 6;
      p.invuln = 1.0;
      this.particles.ring(p.x, p.y, '#2de2ff', 22, 260);
      this.particles.text(p.x, p.y - 26, 'AEGIS!', '#2de2ff', 16);
      return;
    }
    p.hull -= damage;
    p.invuln = CONFIG.player.invulnAfterHit;
    this.combo = 0;
    this.comboTimer = 0;
    const dx = p.x - fromX;
    const dy = p.y - fromY;
    const d = Math.hypot(dx, dy) || 1;
    p.vx += (dx / d) * 320;
    p.vy += (dy / d) * 320;
    this.particles.burst(p.x, p.y, '#ff5d73', 16, 260);
    this.particles.addShake(9);
    this.audio?.hurt();
    if (p.hull <= 0) {
      p.hull = 0;
      this.gameOver();
    }
  }

  killEnemy(e) {
    this.kills += 1;
    this.combo += 1;
    this.comboTimer = this.build.comboWindow;
    if (this.combo > this.bestCombo) this.bestCombo = this.combo;
    const gained = Math.round(e.score * this.multiplier);
    this.score += gained;
    this.particles.text(e.x, e.y - 14, `+${gained}`, '#eaf6ff', e.type === 'boss' ? 24 : 15);
    if (this.combo >= 5) {
      this.particles.text(e.x, e.y - 34, `COMBO x${this.multiplier.toFixed(1)}`, '#ffd166', 14);
    }
    this.particles.burst(e.x, e.y, e.color, e.type === 'boss' ? 60 : 16, e.type === 'boss' ? 380 : 240);
    if (e.type === 'boss') {
      this.particles.ring(e.x, e.y, e.color, 40, 420);
      this.particles.addShake(12);
      this.audio?.explode(true);
    } else {
      this.audio?.explode(false);
    }
    // Drops.
    const dropEmber = (x, y, value) => {
      const ang = this.rng() * Math.PI * 2;
      this.embers.push({
        x, y,
        vx: Math.cos(ang) * 90, vy: Math.sin(ang) * 90,
        radius: CONFIG.ember.radius, value, kind: 'ember',
        life: CONFIG.ember.life,
      });
    };
    if (e.type === 'boss') {
      for (let i = 0; i < 8; i++) dropEmber(e.x, e.y, 3);
      this.embers.push({ x: e.x, y: e.y, vx: 0, vy: 0, radius: 9, value: 0, kind: 'heart', life: 14 });
    } else {
      let left = e.embers;
      while (left > 0) {
        dropEmber(e.x, e.y, 1);
        left -= 1;
      }
      if (this.rng() < 0.1) {
        this.embers.push({ x: e.x, y: e.y, vx: 0, vy: 0, radius: 9, value: 0, kind: 'heart', life: 14 });
      }
    }
    // A splitter breaks into three motes.
    if (e.type === 'shard' && !e.splitDone) {
      e.splitDone = true;
      for (let i = 0; i < 3; i++) {
        const m = makeEnemy('mote', e.x + (this.rng() - 0.5) * 30, e.y + (this.rng() - 0.5) * 30, this.wave);
        this.enemies.push(m);
      }
    }
  }

  gameOver() {
    this.phase = 'gameover';
    this.saveBest();
    this.particles.burst(this.player.x, this.player.y, '#2de2ff', 50, 380, 1.0, 4);
    this.particles.ring(this.player.x, this.player.y, '#ff5d73', 36, 420);
    this.particles.addShake(14);
    this.audio?.gameOver();
  }

  // Aegis shield recharges over time.
  tickAegis(dt) {
    if (!this.build.aegis) return;
    if (this.aegisReady === false) {
      this.aegisTimer = (this.aegisTimer || 0) - dt;
      if (this.aegisTimer <= 0) this.aegisReady = true;
    }
  }
}
