// Lumen Drift — tuning and palette. One file, one job: every number the
// game balances on lives here, so tuning never means hunting through logic.
export const CONFIG = {
  canvas: { width: 960, height: 600 },
  arena: { x: 480, y: 312, radius: 262 },
  hud: { top: 44 },

  player: {
    radius: 11,
    accel: 2600,
    maxSpeed: 265,
    damping: 6.5,
    hull: 100,
    fireRate: 7, // shots per second
    boltSpeed: 640,
    boltDamage: 1,
    boltRadius: 4,
    dashSpeed: 3.2, // multiplier while dashing
    dashTime: 0.16,
    dashCooldown: 2.2,
    dashCharges: 1,
    dashMax: 3,
    invulnAfterHit: 0.9,
    magnetRadius: 70,
  },

  combo: { window: 3.0, perKill: 0.1, cap: 5 },

  // Enemy catalogue: cost is the wave-budget price, score is the base
  // score before the combo multiplier, embers is the drop.
  enemies: {
    mote: { hp: 1, speed: 150, radius: 10, cost: 1, score: 50, embers: 1, damage: 12, color: '#ff5d73' },
    wisp: { hp: 2, speed: 115, radius: 12, cost: 2, score: 100, embers: 2, damage: 10, color: '#c77dff' },
    shard: { hp: 3, speed: 62, radius: 17, cost: 3, score: 150, embers: 2, damage: 16, color: '#ffb703' },
    lance: { hp: 2, speed: 95, radius: 12, cost: 3, score: 150, embers: 3, damage: 14, color: '#ff7b00' },
    boss: { hp: 70, speed: 55, radius: 42, cost: 15, score: 2000, embers: 25, damage: 25, color: '#ff2e88' },
  },

  // Wave N spawns a budget of points; the mix shifts as waves climb.
  waves: {
    budgetBase: 6,
    budgetPerWave: 4,
    spawnInterval: 0.9, // seconds between spawns at wave 1
    spawnIntervalMin: 0.28,
    hpScalePerWave: 0.08,
    speedScalePerWave: 0.02,
    clearBonus: 100, // x wave number
  },

  orbs: { speed: 170, radius: 6, damage: 14 },

  ember: { radius: 6, magnetSpeed: 340, life: 14 },

  // Between-wave upgrades: id, name, description, cost in embers.
  upgrades: [
    { id: 'damage', name: 'Overclock Rounds', desc: '+25% bolt damage', cost: 8 },
    { id: 'rate', name: 'Rapid Cycler', desc: '+20% fire rate', cost: 8 },
    { id: 'multishot', name: 'Twin Barrels', desc: '+1 bolt per shot', cost: 14 },
    { id: 'hull', name: 'Reinforced Hull', desc: '+30 max hull, heal 30', cost: 10 },
    { id: 'speed', name: 'Ion Thrusters', desc: '+12% move speed', cost: 6 },
    { id: 'dash', name: 'Dash Capacitor', desc: '+1 dash charge', cost: 9 },
    { id: 'magnet', name: 'Ember Magnet', desc: '+60% pickup radius', cost: 5 },
    { id: 'pierce', name: 'Piercing Light', desc: 'Bolts pierce +1 enemy', cost: 12 },
    { id: 'combo', name: 'Combo Lens', desc: 'Combo lasts longer, cap x6', cost: 7 },
    { id: 'aegis', name: 'Aegis Field', desc: 'Shield after every hit', cost: 11 },
  ],

  palette: {
    bg: '#070b1d',
    bgDeep: '#04061a',
    grid: 'rgba(90,140,255,0.07)',
    ring: '#2de2ff',
    ringDim: 'rgba(45,226,255,0.35)',
    player: '#2de2ff',
    playerCore: '#e8feff',
    bolt: '#7df9ff',
    ember: '#ffd166',
    heart: '#ff5d8f',
    text: '#eaf6ff',
    textDim: '#8fa8c8',
    danger: '#ff5d73',
    gold: '#ffd166',
    violet: '#c77dff',
  },
};
