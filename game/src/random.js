// Lumen Drift — seeded randomness. One file, one job: every random choice
// in the game flows through here, so a screenshot pose or a replay can be
// rebuilt exactly from one seed.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function range(rng, min, max) {
  return min + rng() * (max - min);
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

export function chance(rng, p) {
  return rng() < p;
}

// A point on the arena rim, for spawning enemies at the edge.
export function rimPoint(rng, arena) {
  const a = rng() * Math.PI * 2;
  return { x: arena.x + Math.cos(a) * (arena.radius - 6), y: arena.y + Math.sin(a) * (arena.radius - 6) };
}
