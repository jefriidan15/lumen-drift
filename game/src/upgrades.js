// Lumen Drift — the between-wave upgrade shop. One file, one job: which
// upgrades exist, how a shop of three is rolled, and what each one does to
// the player's build. Prices and text live in config.js.
import { CONFIG } from './config.js';

// Roll three distinct upgrades the player does not already max out.
// Multishot and dash cap at 3 stacks; the rest can stack.
export function rollShop(rng, owned) {
  const pool = CONFIG.upgrades.filter((u) => {
    if (u.id === 'multishot' && (owned.multishot || 0) >= 2) return false;
    if (u.id === 'dash' && (owned.dash || 0) >= 2) return false;
    if (u.id === 'pierce' && (owned.pierce || 0) >= 2) return false;
    return true;
  });
  const picks = [];
  const bag = [...pool];
  while (picks.length < 3 && bag.length > 0) {
    const i = Math.floor(rng() * bag.length);
    picks.push(bag.splice(i, 1)[0]);
  }
  return picks;
}

// Apply an upgrade to the player's build. `owned` counts stacks per id.
export function applyUpgrade(build, owned, id) {
  owned[id] = (owned[id] || 0) + 1;
  switch (id) {
    case 'damage': build.damageMul *= 1.25; break;
    case 'rate': build.fireRateMul *= 1.2; break;
    case 'multishot': build.shots += 1; break;
    case 'hull':
      build.maxHull += 30;
      build.hull = Math.min(build.maxHull, build.hull + 30);
      break;
    case 'speed': build.speedMul *= 1.12; break;
    case 'dash': build.dashCharges = Math.min(CONFIG.player.dashMax, build.dashCharges + 1); break;
    case 'magnet': build.magnetMul *= 1.6; break;
    case 'pierce': build.pierce += 1; break;
    case 'combo': build.comboCap = 6; build.comboWindow += 1.5; break;
    case 'aegis': build.aegis = true; break;
    default: break;
  }
}

// A fresh level-1 build.
export function freshBuild() {
  return {
    damageMul: 1,
    fireRateMul: 1,
    shots: 1,
    maxHull: CONFIG.player.hull,
    hull: CONFIG.player.hull,
    speedMul: 1,
    dashCharges: CONFIG.player.dashCharges,
    magnetMul: 1,
    pierce: 0,
    comboCap: CONFIG.combo.cap,
    comboWindow: CONFIG.combo.window,
    aegis: false,
  };
}
