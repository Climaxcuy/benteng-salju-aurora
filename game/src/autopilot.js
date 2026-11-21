// autopilot.js — Memainkan aturan asli dari state segar: ikuti rute waypoint,
// menyelinap selalu, berhenti & menunggu bila meter deteksi tinggi DAN tersembunyi,
// lari bila terlihat/dikejar, ambil kristal (E), lalu capai EXIT.
// Bila terjepit di sudut dinding/cover: mode sidestep (geser tegak lurus 1,5 dtk,
// bergantian sisi) agar tidak macet. Kemenangan autopilot adalah kemenangan MURNI.
import { CFG, AUTOPILOT_ROUTE } from './config.js';
import { dist2 } from './rng.js';

export class Autopilot {
  constructor() {
    this.enabled = false;
    this.wpIndex = 0;
    this.waitT = 0;
    this.stuckT = 0;
    this.lastX = 0;
    this.lastZ = 0;
    this.done = false;
    this.sideSign = 1;
    this.sideTime = 0;
    this.sidestepping = false;
  }

  start(player) {
    this.enabled = true;
    this.wpIndex = 0;
    this.waitT = 0;
    this.stuckT = 0;
    this.lastX = player.x;
    this.lastZ = player.z;
    this.done = false;
    this.sidestepping = false;
    this.sideTime = 0;
  }

  stop() {
    this.enabled = false;
  }

  update(dt, game) {
    if (!this.enabled || this.done) return;
    const p = game.player;
    const guards = game.guardManager;
    const meter = guards.maxMeter();

    // Dikejar: lari MENJAUH dari pengejar terdekat (bukan menelusuri rute yang
    // bisa berbalik ke arahnya); bila pengejar sudah jauh, lanjutkan rute.
    if (guards.anyAlert()) {
      const alertGuards = guards.guards.filter((g) => g.state === 'alert');
      let nearest = null;
      let nearestD = Infinity;
      for (const g of alertGuards) {
        const d = dist2(g.x, g.z, p.x, p.z);
        if (d < nearestD) {
          nearestD = d;
          nearest = g;
        }
      }
      if (nearest && nearestD < 9) {
        const dx = p.x - nearest.x;
        const dz = p.z - nearest.z;
        const d = Math.hypot(dx, dz) || 1;
        p.moveDir(dt, dx / d, dz / d, CFG.player.runSpeed, game.footprints, game.audio);
        const near = p.nearestCrystal();
        if (near) game.tryCollect();
        return;
      }
      this.advance(dt, game, CFG.player.runSpeed);
      return;
    }
    // Penjaga curiga/mencari di dekatmu: jangan menyelinap pelan — bergerak cepat
    // agar ia tertinggal dan kehilangan jejak.
    const nearThreat = guards.guards.some(
      (g) => g.state !== 'patrol' && dist2(g.x, g.z, p.x, p.z) < 7,
    );
    if (nearThreat) {
      this.advance(dt, game, CFG.player.walkSpeed);
      return;
    }
    // Nyaris ketahuan TAPI terlihat: jangan diam di tempat terbuka — terus bergerak.
    // Nyaris ketahuan DAN tersembunyi: berhenti & tunggu meter turun.
    if (meter > 55) {
      if (guards.anySees(p, game.storm)) {
        this.advance(dt, game, CFG.player.walkSpeed);
        return;
      }
      this.waitT += dt;
      p.moving = false;
      p.sneaking = true;
      p.group.position.set(p.x, 0, p.z);
      if (meter < 30) this.waitT = 0;
      return;
    }
    this.waitT = 0;
    this.advance(dt, game, CFG.player.sneakSpeed);
  }

  // Satu langkah menuju waypoint berikut (atau sidestep bila sedang terjepit).
  advance(dt, game, speed) {
    const p = game.player;
    const target = AUTOPILOT_ROUTE[this.wpIndex];
    if (!target) {
      this.done = true;
      return;
    }
    if (this.sidestepping) {
      // Geser tegak lurus arah target selama 1,5 detik, lalu coba lurus lagi.
      const dx = target[0] - p.x;
      const dz = target[1] - p.z;
      const d = Math.hypot(dx, dz) || 1;
      const mx = -dz / d * this.sideSign;
      const mz = dx / d * this.sideSign;
      p.moveDir(dt, mx, mz, speed, game.footprints, game.audio);
      this.sideTime += dt;
      if (this.sideTime > 1.5) {
        this.sidestepping = false;
        this.stuckT = 0;
        this.lastX = p.x;
        this.lastZ = p.z;
      }
    } else {
      const arrived = p.moveTo(dt, target[0], target[1], speed, game.footprints, game.audio);
      if (arrived) this.wpIndex += 1;
      this.trackStuck(dt, p);
      if (this.stuckT > 0.5) {
        // Terjepit: masuk mode sidestep, sisi bergantian tiap masuk.
        this.sidestepping = true;
        this.sideTime = 0;
        this.sideSign *= -1;
      }
    }
    // Ambil kristal bila dekat (aturan asli: tombol E).
    const near = p.nearestCrystal();
    if (near) game.tryCollect();
    if (this.wpIndex >= AUTOPILOT_ROUTE.length) this.done = true;
  }

  trackStuck(dt, p) {
    // Macet (terjepit): lompat ke waypoint berikut setelah 4 detik tanpa kemajuan.
    const moved = dist2(p.x, p.z, this.lastX, this.lastZ);
    if (moved < 0.02 * dt * 60) {
      this.stuckT += dt;
      if (this.stuckT > 4) {
        this.stuckT = 0;
        this.wpIndex += 1;
      }
    } else {
      this.stuckT = 0;
    }
    this.lastX = p.x;
    this.lastZ = p.z;
  }
}
