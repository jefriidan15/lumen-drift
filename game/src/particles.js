// Lumen Drift — particles, floating texts and screen shake. One file, one
// job: everything that makes a hit feel like a hit, and nothing else.
export class Particles {
  constructor() {
    this.list = [];
    this.texts = [];
    this.shake = 0;
  }

  burst(x, y, color, count, speed = 220, life = 0.6, size = 3) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.3 + Math.random() * 0.7);
      this.list.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: life * (0.6 + Math.random() * 0.6),
        maxLife: life,
        size: size * (0.6 + Math.random() * 0.8),
        color,
      });
    }
  }

  ring(x, y, color, count = 26, speed = 320) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      this.list.push({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: 0.5, maxLife: 0.5,
        size: 3, color,
      });
    }
  }

  trail(x, y, color) {
    this.list.push({
      x, y,
      vx: (Math.random() - 0.5) * 30,
      vy: (Math.random() - 0.5) * 30,
      life: 0.28, maxLife: 0.28,
      size: 2.5, color,
    });
  }

  text(x, y, str, color = '#eaf6ff', size = 16) {
    this.texts.push({ x, y, str, color, size, life: 0.9, maxLife: 0.9 });
  }

  addShake(amount) {
    this.shake = Math.min(14, this.shake + amount);
  }

  update(dt) {
    for (const p of this.list) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 2.2 * dt;
      p.vy *= 1 - 2.2 * dt;
      p.life -= dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
    for (const t of this.texts) {
      t.y -= 34 * dt;
      t.life -= dt;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
    this.shake = Math.max(0, this.shake - 40 * dt);
  }

  shakeOffset() {
    if (this.shake <= 0.1) return { x: 0, y: 0 };
    return {
      x: (Math.random() - 0.5) * this.shake,
      y: (Math.random() - 0.5) * this.shake,
    };
  }

  draw(ctx) {
    for (const p of this.list) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const t of this.texts) {
      ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
      ctx.font = `bold ${t.size}px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}
