// footprints.js — Jejak kaki di salju: titik putih yang memudar; penjaga mengikuti jejak segar.
import { CFG } from './config.js';
import { warmZoneAt } from './level.js';

export class Footprints {
  constructor() {
    this.list = []; // {x, z, age, life}
    this.max = 240;
  }

  add(x, z) {
    this.list.push({ x, z, age: 0, life: CFG.footprints.lifeSeconds });
    if (this.list.length > this.max) this.list.shift();
  }

  update(dt) {
    for (const f of this.list) {
      const warm = warmZoneAt(f.x, f.z);
      f.age += dt * (warm ? 3 : 1); // obor melelehkan jejak 3x lebih cepat
    }
    this.list = this.list.filter((f) => f.age < f.life);
  }

  // Jejak segar terdekat dari (x,z) dalam radius r; null bila tidak ada.
  freshNear(x, z, r) {
    let best = null;
    let bestAge = Infinity;
    for (const f of this.list) {
      if (f.age > CFG.footprints.freshSeconds) continue;
      const dx = f.x - x;
      const dz = f.z - z;
      const d = Math.hypot(dx, dz);
      if (d < r && f.age < bestAge) {
        best = f;
        bestAge = f.age;
      }
    }
    return best;
  }

  // Jejak paling baru secara global (untuk diikuti penjaga).
  newest() {
    let best = null;
    for (const f of this.list) {
      if (f.age > CFG.footprints.freshSeconds) continue;
      if (!best || f.age < best.age) best = f;
    }
    return best;
  }

  clear() {
    this.list = [];
  }
}
