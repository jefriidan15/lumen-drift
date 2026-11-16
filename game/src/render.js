// Lumen Drift — everything on screen. One file, one job: draw the arena,
// the entities, the HUD and the title / shop / game-over screens. It reads
// the world, it never changes it.
import { CONFIG } from './config.js';
import { mulberry32 } from './random.js';

const FONT = '"Segoe UI", system-ui, sans-serif';

export class Renderer {
  constructor() {
    // A fixed starfield, so the backdrop is the same every load.
    const rng = mulberry32(1337);
    this.stars = [];
    for (let i = 0; i < 130; i++) {
      this.stars.push({
        x: rng() * CONFIG.canvas.width,
        y: rng() * CONFIG.canvas.height,
        r: 0.5 + rng() * 1.6,
        tw: rng() * Math.PI * 2,
        sp: 0.5 + rng() * 1.5,
      });
    }
  }

  draw(ctx, world, t, paused) {
    const { width, height } = CONFIG.canvas;
    const P = CONFIG.palette;
    const shake = world.particles.shakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);

    // Backdrop: deep gradient, stars, faint grid.
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, P.bg);
    bg.addColorStop(1, P.bgDeep);
    ctx.fillStyle = bg;
    ctx.fillRect(-20, -20, width + 40, height + 40);
    for (const s of this.stars) {
      const a = 0.35 + 0.35 * Math.sin(t * s.sp + s.tw);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#bfe9ff';
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = P.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 48) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y <= height; y += 48) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    this.drawArena(ctx, t);
    this.drawEmbers(ctx, world);
    this.drawEnemies(ctx, world, t);
    this.drawOrbs(ctx, world);
    this.drawBullets(ctx, world);
    if (world.phase !== 'gameover') this.drawPlayer(ctx, world, t);
    world.particles.draw(ctx);

    ctx.restore();

    // Screens and HUD sit above the shake.
    if (world.phase === 'title') this.drawTitle(ctx, world, t);
    else if (world.phase === 'shop') this.drawShop(ctx, world, t);
    else if (world.phase === 'gameover') this.drawGameOver(ctx, world, t);
    else {
      this.drawHud(ctx, world);
      if (world.banner) this.drawBanner(ctx, world);
      if (paused) this.drawPaused(ctx);
      if (world.player.hull <= 30 && world.phase === 'playing') this.drawLowHull(ctx, t);
    }
  }

  drawArena(ctx, t) {
    const a = CONFIG.arena;
    const P = CONFIG.palette;
    // Soft light inside the ring.
    const glow = ctx.createRadialGradient(a.x, a.y, 40, a.x, a.y, a.radius);
    glow.addColorStop(0, 'rgba(45,120,255,0.10)');
    glow.addColorStop(1, 'rgba(45,120,255,0.0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
    ctx.fill();
    // The ring itself, breathing gently.
    const pulse = 0.55 + 0.25 * Math.sin(t * 1.6);
    ctx.strokeStyle = `rgba(45,226,255,${pulse})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(45,226,255,0.12)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(a.x, a.y, a.radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawEmbers(ctx, world) {
    for (const m of world.embers) {
      const blink = 0.7 + 0.3 * Math.sin(Date.now() / 130 + m.x);
      ctx.globalAlpha = blink;
      if (m.kind === 'heart') {
        ctx.fillStyle = '#ff5d8f';
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px ' + FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', m.x, m.y + 0.5);
      } else {
        ctx.fillStyle = '#ffd166';
        ctx.save();
        ctx.translate(m.x, m.y);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-4, -4, 8, 8);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  drawEnemies(ctx, world, t) {
    for (const e of world.enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = e.color;
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 2;
      if (e.type === 'mote') {
        ctx.rotate(e.angle);
        ctx.beginPath();
        ctx.moveTo(13, 0); ctx.lineTo(-9, 8); ctx.lineTo(-5, 0); ctx.lineTo(-9, -8);
        ctx.closePath();
        ctx.fill();
      } else if (e.type === 'wisp') {
        ctx.rotate(e.angle);
        ctx.beginPath();
        ctx.moveTo(0, -13); ctx.lineTo(10, 0); ctx.lineTo(0, 13); ctx.lineTo(-10, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'shard') {
        ctx.rotate(e.angle);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2;
          const px = Math.cos(ang) * 17;
          const py = Math.sin(ang) * 17;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'lance') {
        ctx.rotate(e.angle);
        ctx.fillRect(-11, -11, 22, 22);
        ctx.strokeStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(16, 0);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'boss') {
        // Umbral Crown: a spiked ring around a burning core.
        ctx.rotate(e.angle);
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
          const ang = (i / 12) * Math.PI * 2;
          const r = i % 2 === 0 ? 46 : 34;
          const px = Math.cos(ang) * r;
          const py = Math.sin(ang) * r;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#2b0a1e';
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 0, 9 + 2 * Math.sin(t * 5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      // Hit flash and a health bar when hurt.
      if (e.hitFlash > 0) {
        ctx.globalAlpha = Math.min(1, e.hitFlash * 6);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (e.hp < e.maxHp && e.type !== 'mote') {
        const w = e.radius * 2;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(e.x - w / 2, e.y - e.radius - 10, w, 4);
        ctx.fillStyle = '#ff5d73';
        ctx.fillRect(e.x - w / 2, e.y - e.radius - 10, w * (e.hp / e.maxHp), 4);
      }
    }
  }

  drawOrbs(ctx, world) {
    for (const o of world.orbs) {
      ctx.save();
      ctx.shadowColor = '#ff2e88';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ff2e88';
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(o.x, o.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawBullets(ctx, world) {
    ctx.save();
    ctx.shadowColor = '#7df9ff';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#aefcff';
    for (const b of world.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawPlayer(ctx, world, t) {
    const p = world.player;
    const P = CONFIG.palette;
    ctx.save();
    ctx.translate(p.x, p.y);
    // Engine flame, flickering with speed.
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > 40) {
      const flick = 10 + Math.random() * 8;
      ctx.fillStyle = 'rgba(255,180,80,0.85)';
      ctx.beginPath();
      ctx.moveTo(-8, 5);
      ctx.lineTo(-8 - flick, 0);
      ctx.lineTo(-8, -5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.rotate(p.angle);
    ctx.shadowColor = P.player;
    ctx.shadowBlur = p.dashTime > 0 ? 26 : 16;
    // Dart hull with swept wings.
    ctx.fillStyle = P.player;
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-10, 9);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, -9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = P.playerCore;
    ctx.beginPath();
    ctx.arc(2, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Invulnerability shimmer.
    if (p.invuln > 0 && Math.floor(t * 12) % 2 === 0) {
      ctx.strokeStyle = 'rgba(234,246,255,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Aegis shield ring.
    if (world.build.aegis && world.aegisReady !== false) {
      ctx.strokeStyle = 'rgba(45,226,255,0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 24 + Math.sin(t * 3) * 1.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawHud(ctx, world) {
    const P = CONFIG.palette;
    const p = world.player;
    ctx.textBaseline = 'alphabetic';
    // Score, top left.
    ctx.textAlign = 'left';
    ctx.fillStyle = P.textDim;
    ctx.font = 'bold 11px ' + FONT;
    ctx.fillText('S C O R E', 20, 24);
    ctx.fillStyle = P.text;
    ctx.font = 'bold 28px ' + FONT;
    ctx.fillText(String(world.score).padStart(6, '0'), 20, 52);
    ctx.fillStyle = P.textDim;
    ctx.font = 'bold 11px ' + FONT;
    ctx.fillText(`BEST ${Math.max(world.best, world.score)}`, 20, 70);
    // Wave, top centre.
    ctx.textAlign = 'center';
    ctx.fillStyle = P.textDim;
    ctx.font = 'bold 11px ' + FONT;
    ctx.fillText('W A V E', 480, 24);
    ctx.fillStyle = P.text;
    ctx.font = 'bold 28px ' + FONT;
    ctx.fillText(String(world.wave), 480, 52);
    const left = world.enemies.length + world.spawnQueue.length;
    ctx.fillStyle = P.textDim;
    ctx.font = 'bold 11px ' + FONT;
    ctx.fillText(left > 0 ? `${left} SHADES LEFT` : 'CLEAR!', 480, 70);
    // Embers and combo, top right.
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 28px ' + FONT;
    ctx.fillText(`◆ ${world.embersHeld}`, 940, 52);
    ctx.fillStyle = P.textDim;
    ctx.font = 'bold 11px ' + FONT;
    ctx.fillText('E M B E R S', 940, 24);
    if (world.combo >= 2) {
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 18px ' + FONT;
      ctx.fillText(`COMBO x${world.multiplier.toFixed(1)}  (${world.combo})`, 940, 74);
      // Combo timer bar.
      const w = 120;
      ctx.fillStyle = 'rgba(255,209,102,0.25)';
      ctx.fillRect(940 - w, 80, w, 4);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(940 - w, 80, w * Math.max(0, world.comboTimer / world.build.comboWindow), 4);
    }
    // Hull bar, bottom left.
    ctx.textAlign = 'left';
    ctx.fillStyle = P.textDim;
    ctx.font = 'bold 11px ' + FONT;
    ctx.fillText('H U L L', 20, 566);
    const bw = 210;
    const frac = Math.max(0, p.hull / world.build.maxHull);
    ctx.fillStyle = 'rgba(255,93,115,0.25)';
    ctx.fillRect(20, 574, bw, 10);
    ctx.fillStyle = frac > 0.3 ? '#2de2ff' : '#ff5d73';
    ctx.fillRect(20, 574, bw * frac, 10);
    ctx.fillStyle = P.text;
    ctx.font = 'bold 12px ' + FONT;
    ctx.fillText(`${Math.ceil(p.hull)} / ${world.build.maxHull}`, 238, 583);
    // Dash pips, bottom right.
    ctx.textAlign = 'right';
    ctx.fillStyle = P.textDim;
    ctx.font = 'bold 11px ' + FONT;
    ctx.fillText('DASH  [SPACE]', 940, 566);
    for (let i = 0; i < world.dashCap(); i++) {
      ctx.fillStyle = i < world.build.dashCharges ? '#2de2ff' : 'rgba(45,226,255,0.2)';
      ctx.beginPath();
      ctx.arc(920 - i * 22, 579, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawBanner(ctx, world) {
    const b = world.banner;
    const a = Math.min(1, b.t / 0.3, (b.max - b.t) / 0.2 + 0.4);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.textAlign = 'center';
    ctx.fillStyle = '#eaf6ff';
    ctx.font = 'bold 44px ' + FONT;
    ctx.shadowColor = '#2de2ff';
    ctx.shadowBlur = 24;
    ctx.fillText(b.text, 480, 260);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#8fa8c8';
    ctx.font = 'bold 16px ' + FONT;
    ctx.fillText(b.sub, 480, 290);
    ctx.restore();
  }

  drawLowHull(ctx, t) {
    const a = 0.12 + 0.1 * Math.sin(t * 6);
    const g = ctx.createRadialGradient(480, 300, 220, 480, 300, 480);
    g.addColorStop(0, 'rgba(255,40,70,0)');
    g.addColorStop(1, `rgba(255,40,70,${a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 960, 600);
  }

  drawPaused(ctx) {
    ctx.fillStyle = 'rgba(4,6,26,0.6)';
    ctx.fillRect(0, 0, 960, 600);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#eaf6ff';
    ctx.font = 'bold 40px ' + FONT;
    ctx.fillText('PAUSED', 480, 290);
    ctx.fillStyle = '#8fa8c8';
    ctx.font = 'bold 15px ' + FONT;
    ctx.fillText('P — resume      M — mute', 480, 322);
  }

  panel(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(6,10,30,0.88)';
    ctx.strokeStyle = 'rgba(45,226,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.fill();
    ctx.stroke();
  }

  drawTitle(ctx, world, t) {
    const P = CONFIG.palette;
    // Drifting decorative shades behind the title.
    ctx.save();
    ctx.globalAlpha = 0.5;
    const drift = [
      { x: 150 + Math.sin(t * 0.3) * 20, y: 150, r: 12, c: '#ff5d73' },
      { x: 810 + Math.cos(t * 0.25) * 24, y: 180, r: 14, c: '#c77dff' },
      { x: 120, y: 460 + Math.sin(t * 0.4) * 14, r: 16, c: '#ffb703' },
      { x: 830, y: 450 + Math.cos(t * 0.35) * 16, r: 11, c: '#ff7b00' },
    ];
    for (const d of drift) {
      ctx.fillStyle = d.c;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.fillStyle = P.textDim;
    ctx.font = 'bold 13px ' + FONT;
    ctx.fillText('A  N E O N  A R E N A  S U R V I V A L  G A M E', 480, 108);
    ctx.fillStyle = '#2de2ff';
    ctx.font = 'bold 72px ' + FONT;
    ctx.shadowColor = '#2de2ff';
    ctx.shadowBlur = 30;
    ctx.fillText('LUMEN DRIFT', 480, 182);
    ctx.shadowBlur = 0;
    ctx.fillStyle = P.text;
    ctx.font = '16px ' + FONT;
    ctx.fillText('Pilot the last light. Hold the ring. Spend the embers. Survive the Crown.', 480, 216);

    this.panel(ctx, 250, 248, 460, 158);
    ctx.fillStyle = P.text;
    ctx.font = 'bold 15px ' + FONT;
    ctx.fillText('HOW TO PLAY', 480, 278);
    ctx.font = '14px ' + FONT;
    ctx.fillStyle = '#c9d8ee';
    const lines = [
      'WASD / Arrows — fly     Mouse — aim     Hold Click — fire',
      'SPACE — dash through danger     P — pause     M — mute',
      'Destroy shades, collect embers, buy upgrades between waves.',
      'Every 5th wave the Umbral Crown awakens. Good luck, pilot.',
    ];
    lines.forEach((line, i) => ctx.fillText(line, 480, 304 + i * 22));

    const pulse = 0.6 + 0.4 * Math.sin(t * 3.2);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 20px ' + FONT;
    ctx.fillText('PRESS ENTER OR CLICK TO PLAY', 480, 452);
    ctx.globalAlpha = 1;
    ctx.fillStyle = P.textDim;
    ctx.font = 'bold 13px ' + FONT;
    const best = Math.max(world.best, 0);
    ctx.fillText(best > 0 ? `BEST SCORE  ${best}` : 'NO FLIGHTS LOGGED YET — BE THE FIRST', 480, 486);
    ctx.font = '12px ' + FONT;
    ctx.fillText("Built by an AI agent for make.fun's best-game-01 bounty", 480, 566);
  }

  drawShop(ctx, world, t) {
    const P = CONFIG.palette;
    ctx.fillStyle = 'rgba(4,6,26,0.72)';
    ctx.fillRect(0, 0, 960, 600);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 34px ' + FONT;
    ctx.fillText(`WAVE ${world.wave} CLEARED`, 480, 96);
    ctx.fillStyle = P.text;
    ctx.font = 'bold 18px ' + FONT;
    ctx.fillText('CHOOSE AN UPGRADE — or save your embers for later', 480, 128);
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 20px ' + FONT;
    ctx.fillText(`◆ ${world.embersHeld} EMBERS`, 480, 158);

    const cards = world.shopOptions;
    const cw = 250;
    const ch = 170;
    const gap = 24;
    const x0 = 480 - (cards.length * cw + (cards.length - 1) * gap) / 2;
    cards.forEach((u, i) => {
      const x = x0 + i * (cw + gap);
      const y = 190;
      const bought = world.shopBought.has(u.id);
      const afford = world.embersHeld >= u.cost;
      ctx.save();
      ctx.globalAlpha = bought ? 0.45 : 1;
      this.panel(ctx, x, y, cw, ch);
      if (afford && !bought) {
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, cw, ch, 14);
        ctx.stroke();
      }
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 13px ' + FONT;
      ctx.fillText(`[${i + 1}]`, x + cw / 2, y + 30);
      ctx.fillStyle = P.text;
      ctx.font = 'bold 19px ' + FONT;
      ctx.fillText(u.name, x + cw / 2, y + 62);
      ctx.fillStyle = '#c9d8ee';
      ctx.font = '15px ' + FONT;
      ctx.fillText(u.desc, x + cw / 2, y + 92);
      ctx.fillStyle = afford ? '#ffd166' : '#ff5d73';
      ctx.font = 'bold 18px ' + FONT;
      ctx.fillText(bought ? 'SOLD' : `◆ ${u.cost}`, x + cw / 2, y + 132);
      ctx.restore();
    });

    const pulse = 0.6 + 0.4 * Math.sin(t * 3.2);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#2de2ff';
    ctx.font = 'bold 19px ' + FONT;
    ctx.fillText(`PRESS ENTER — BEGIN WAVE ${world.wave + 1}`, 480, 420);
    ctx.globalAlpha = 1;
    ctx.fillStyle = P.textDim;
    ctx.font = '14px ' + FONT;
    ctx.fillText('Click a card or press 1 / 2 / 3 to buy it', 480, 448);
  }

  drawGameOver(ctx, world, t) {
    const P = CONFIG.palette;
    ctx.fillStyle = 'rgba(20,4,12,0.66)';
    ctx.fillRect(0, 0, 960, 600);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5d73';
    ctx.font = 'bold 56px ' + FONT;
    ctx.shadowColor = '#ff5d73';
    ctx.shadowBlur = 26;
    ctx.fillText('SIGNAL LOST', 480, 150);
    ctx.shadowBlur = 0;
    ctx.fillStyle = P.textDim;
    ctx.font = 'bold 13px ' + FONT;
    ctx.fillText('F I N A L   S C O R E', 480, 196);
    ctx.fillStyle = P.text;
    ctx.font = 'bold 54px ' + FONT;
    ctx.fillText(String(world.score), 480, 254);
    const isBest = world.score > 0 && world.score >= world.best;
    if (isBest) {
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 16px ' + FONT;
      ctx.fillText('★ NEW BEST SCORE ★', 480, 284);
    }

    this.panel(ctx, 280, 310, 400, 132);
    ctx.font = '15px ' + FONT;
    const acc = world.shotsFired > 0 ? Math.round((world.shotsHit / world.shotsFired) * 100) : 0;
    const bestComboMul = 1 + Math.min(world.bestCombo, (world.build.comboCap - 1) * 10) * 0.1;
    const mins = Math.floor(world.timePlayed / 60);
    const secs = Math.floor(world.timePlayed % 60);
    const rows = [
      [`Wave reached`, String(world.wave)],
      [`Shades destroyed`, String(world.kills)],
      [`Accuracy`, `${acc}%  ·  Best combo x${bestComboMul.toFixed(1)}`],
      [`Time survived`, `${mins}:${String(secs).padStart(2, '0')}  ·  Best ${Math.max(world.best, world.score)}`],
    ];
    rows.forEach((row, i) => {
      const y = 340 + i * 28;
      ctx.textAlign = 'left';
      ctx.fillStyle = P.textDim;
      ctx.fillText(row[0], 310, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = P.text;
      ctx.fillText(row[1], 650, y);
    });

    const pulse = 0.6 + 0.4 * Math.sin(t * 3.2);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 20px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('PRESS R OR CLICK TO PLAY AGAIN', 480, 492);
    ctx.globalAlpha = 1;
  }
}
