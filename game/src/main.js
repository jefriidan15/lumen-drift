// Lumen Drift — boot and the game loop. One file, one job: wire input,
// audio, world and renderer together, run the fixed-step loop, and own the
// state machine (title / playing / shop / game over / paused).
import { CONFIG } from './config.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { World } from './world.js';
import { Renderer } from './render.js';
import { buildShotWorld } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const audio = new AudioEngine();
const renderer = new Renderer();

// Screenshot mode: pose one frozen frame and stop. No loop, no audio,
// the same pixels every time the shot is taken.
if (shot) {
  const world = buildShotWorld(shot, null);
  if (world) {
    renderer.draw(ctx, world, 2.0, false);
    document.documentElement.dataset.shotReady = '1';
    window.__world = world;
  }
} else {
  const input = new Input(canvas);
  const world = new World(audio, Math.random);
  window.__world = world;
  let paused = false;
  let audioUnlocked = false;
  let last = performance.now();
  let acc = 0;
  const STEP = 1 / 60;

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const t = now / 1000;

    if (input.anyGesture && !audioUnlocked) {
      audio.unlock();
      audioUnlocked = true;
    }
    if (input.justPressed('m')) {
      const muted = audio.toggleMute();
      void muted;
    }

    // State machine, driven by edges (not held keys).
    if (world.phase === 'title') {
      if (input.justPressed('enter') || input.mouse.clicked) world.startGame();
    } else if (world.phase === 'playing') {
      if (input.justPressed('p') || input.justPressed('escape')) paused = !paused;
      if (!paused) {
        acc += dt;
        let steps = 0;
        while (acc >= STEP && steps < 5) {
          world.update(STEP, input);
          acc -= STEP;
          steps += 1;
        }
        if (steps === 5) acc = 0;
      }
    } else if (world.phase === 'shop') {
      if (input.justPressed('1')) world.buyUpgrade(0);
      if (input.justPressed('2')) world.buyUpgrade(1);
      if (input.justPressed('3')) world.buyUpgrade(2);
      if (input.mouse.clicked) {
        const hit = shopCardHit(input.mouse.x, input.mouse.y, world.shopOptions.length);
        if (hit >= 0) world.buyUpgrade(hit);
        else world.beginNextWave();
      }
      if (input.justPressed('enter')) world.beginNextWave();
      world.particles.update(dt);
    } else if (world.phase === 'gameover') {
      if (input.justPressed('r') || input.justPressed('enter') || input.mouse.clicked) {
        world.startGame();
      }
      world.particles.update(dt);
    }

    renderer.draw(ctx, world, t, paused);
    input.endFrame();
  }

  requestAnimationFrame(frame);
}

// The shop cards' hit boxes, kept identical to the renderer's layout.
function shopCardHit(mx, my, count) {
  const cw = 250;
  const ch = 170;
  const gap = 24;
  const y = 190;
  const x0 = 480 - (count * cw + (count - 1) * gap) / 2;
  for (let i = 0; i < count; i++) {
    const x = x0 + i * (cw + gap);
    if (mx >= x && mx <= x + cw && my >= y && my <= y + ch) return i;
  }
  return -1;
}
