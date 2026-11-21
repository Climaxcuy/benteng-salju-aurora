// player.js — Pemain: gerak WASD (Shift menyelinap, lari saat tidak menyelinap? tidak —
// lari = gerak normal, menyelinap = lambat + sunyi), jejak kaki, lempar bola salju, ambil kristal.
import { CFG, CRYSTALS } from './config.js';
import { moveCircle, inWarmZone } from './level.js';
import { dist2 } from './rng.js';

export class Player {
  constructor(world) {
    this.world = world;
    this.group = world.makePlayer();
    this.reset();
    this.footTimer = 0;
    this.stepTimer = 0;
    this.snowball = null; // {x,z,tx,tz,t,fromX,fromZ} bola salju yang sedang terbang
    this.snowballs = CFG.snowballs;
    this.facing = Math.PI; // menghadap selatan (ke arah kamera) saat mulai
  }

  reset() {
    this.x = CFG.player.start.x;
    this.z = CFG.player.start.z;
    this.facing = Math.PI;
    this.sneaking = false;
    this.running = false;
    this.moving = false;
    this.inWarmZone = false;
    this.collected = new Set();
    this.snowballs = CFG.snowballs;
    this.snowball = null;
    this.footTimer = 0;
    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.y = this.facing;
  }

  // Input manual: axis {x,z} dari keyboard.
  update(dt, axis, sneak, footprints, audio) {
    this.sneaking = sneak;
    this.running = !sneak;
    const speed = sneak ? CFG.player.sneakSpeed : CFG.player.walkSpeed;
    this.moving = axis.x !== 0 || axis.z !== 0;
    if (this.moving) {
      const res = moveCircle(this.x, this.z, CFG.player.radius, axis.x * speed * dt, axis.z * speed * dt);
      this.x = res.x;
      this.z = res.z;
      this.facing = Math.atan2(axis.x, axis.z);
      this.group.rotation.y = this.facing;
      // Jejak kaki + suara langkah.
      this.footTimer -= dt;
      if (this.footTimer <= 0) {
        this.footTimer = CFG.footprints.everySeconds;
        const side = Math.random() < 0.5 ? -1 : 1;
        const px = -Math.cos(this.facing) * 0.14 * side;
        const pz = Math.sin(this.facing) * 0.14 * side;
        footprints.add(this.x + px, this.z + pz);
      }
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = sneak ? 0.55 : 0.38;
        if (audio) audio.step(sneak);
      }
    }
    this.inWarmZone = inWarmZone(this.x, this.z);
    this.group.position.set(this.x, 0, this.z);
    this.updateSnowball(dt);
  }

  // Gerak terprogram (autopilot): menuju titik target dengan kecepatan tertentu.
  moveTo(dt, tx, tz, speed, footprints, audio) {
    const dx = tx - this.x;
    const dz = tz - this.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.05) {
      this.moving = false;
      return true;
    }
    this.moveDir(dt, dx / d, dz / d, speed, footprints, audio);
    return d < 0.5;
  }

  // Gerak terprogram sepanjang arah (mx,mz) — dipakai sidestep autopilot.
  moveDir(dt, mx, mz, speed, footprints, audio) {
    this.sneaking = speed <= CFG.player.sneakSpeed + 0.01;
    this.running = !this.sneaking;
    this.moving = true;
    const res = moveCircle(this.x, this.z, CFG.player.radius, mx * speed * dt, mz * speed * dt);
    this.x = res.x;
    this.z = res.z;
    this.facing = Math.atan2(mx, mz);
    this.group.rotation.y = this.facing;
    this.footTimer -= dt;
    if (this.footTimer <= 0) {
      this.footTimer = CFG.footprints.everySeconds;
      footprints.add(this.x, this.z);
    }
    this.inWarmZone = inWarmZone(this.x, this.z);
    this.group.position.set(this.x, 0, this.z);
    this.updateSnowball(dt);
  }

  nearestCrystal() {
    for (const c of CRYSTALS) {
      if (this.collected.has(c.id)) continue;
      if (dist2(this.x, this.z, c.x, c.z) < CFG.player.collectRadius) return c;
    }
    return null;
  }

  collect(c) {
    this.collected.add(c.id);
  }

  get hasAllCrystals() {
    return this.collected.size >= CRYSTALS.length;
  }

  get nearExit() {
    return this.hasAllCrystals && dist2(this.x, this.z, CFG.exit.x, CFG.exit.z) < CFG.exit.radius;
  }

  throwSnowball() {
    if (this.snowballs <= 0 || this.snowball) return false;
    this.snowballs -= 1;
    const tx = this.x + Math.sin(this.facing) * 6;
    const tz = this.z + Math.cos(this.facing) * 6;
    this.snowball = { x: this.x, z: this.z, tx, tz, t: 0, dur: 0.55 };
    return true;
  }

  updateSnowball(dt) {
    if (!this.snowball) return;
    const b = this.snowball;
    b.t += dt / b.dur;
    if (b.t >= 1) {
      this.lastLanding = { x: b.tx, z: b.tz };
      this.snowball = null;
      this.world.snowball.visible = false;
      return;
    }
    const x = b.x + (b.tx - b.x) * b.t;
    const z = b.z + (b.tz - b.z) * b.t;
    const y = 0.5 + Math.sin(b.t * Math.PI) * 1.2;
    this.world.snowball.position.set(x, y, z);
    this.world.snowball.visible = true;
  }

  // Ambil + hapus titik pendaratan bola salju (sekali pakai per lemparan).
  consumeLanding() {
    const l = this.lastLanding || null;
    this.lastLanding = null;
    return l;
  }

  // Titik pendaratan bola salju terakhir (untuk pengalih perhatian penjaga).
  get snowballLanding() {
    return this.snowball && this.snowball.t >= 1 ? null : null;
  }
}
