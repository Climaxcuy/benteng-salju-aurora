// guards.js — AI penjaga: patrol -> suspicious (?) -> alert/chase (!) -> search -> patrol.
// Penjaga TIDAK menembus dinding: gerak memakai moveCircle + waypoint di ruang terbuka.
// Penjaga juga mengikuti jejak kaki segar yang ditemukannya saat patroli.
import { CFG, GUARDS } from './config.js';
import { moveCircle, losBlocked } from './level.js';
import { dist2, angleDiff, clamp } from './rng.js';

export class Guard {
  constructor(def, world) {
    this.def = def;
    this.name = def.name;
    this.kind = def.kind;
    this.isWolf = def.kind === 'wolf';
    const g = this.isWolf ? CFG.wolf : CFG.guard;
    this.viewRange = g.viewRange;
    this.viewHalf = g.viewHalfAngle;
    this.patrolSpeed = g.patrolSpeed;
    this.chaseSpeed = g.chaseSpeed;
    this.radius = g.radius;
    this.waypoints = def.waypoints;
    this.wpIndex = 0;
    this.x = def.start.x;
    this.z = def.start.z;
    this.heading = 0;
    this.state = 'patrol'; // patrol | suspicious | alert | search
    this.meter = 0; // meter deteksi 0..100 (milik penjaga ini terhadap pemain)
    this.loseSightT = 0;
    this.searchT = 0;
    this.investigate = null; // {x,z} titik yang diselidiki
    this.investigateT = 0;
    this.group = world.makeGuard(def);
    this.world = world;
    this.stuckT = 0;
    this.lastX = this.x;
    this.lastZ = this.z;
  }

  get speed() {
    if (this.state === 'alert') return this.chaseSpeed;
    if (this.state === 'search') return CFG.guard.searchSpeed;
    return this.patrolSpeed;
  }

  canSee(px, pz, storm) {
    const range = this.viewRange * storm.rangeFactor;
    const d = dist2(this.x, this.z, px, pz);
    if (d > range) return { seen: false, d, range };
    const ang = Math.atan2(px - this.x, pz - this.z);
    if (angleDiff(ang, this.heading) > this.viewHalf) return { seen: false, d, range };
    if (losBlocked(this.x, this.z, px, pz)) return { seen: false, d, range };
    return { seen: true, d, range };
  }

  // Gerak menuju (tx,tz) dengan tabrakan; kembalikan true bila tiba.
  moveToward(tx, tz, dt, speed) {
    const dx = tx - this.x;
    const dz = tz - this.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.15) return true;
    const step = Math.min(d, speed * dt);
    const nx = this.x + (dx / d) * step;
    const nz = this.z + (dz / d) * step;
    const res = moveCircle(this.x, this.z, this.radius, nx - this.x, nz - this.z);
    this.x = res.x;
    this.z = res.z;
    this.heading = Math.atan2(dx, dz);
    // Deteksi macet (terjepit dinding): bila tidak maju, putar arah patroli.
    const moved = Math.hypot(this.x - this.lastX, this.z - this.lastZ);
    if (moved < step * 0.25) {
      this.stuckT += dt;
      if (this.stuckT > 1.2) {
        this.stuckT = 0;
        this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
        return false;
      }
    } else {
      this.stuckT = 0;
    }
    this.lastX = this.x;
    this.lastZ = this.z;
    return d < 0.4;
  }

  update(dt, player, storm, footprints, events) {
    const vis = this.canSee(player.x, player.z, storm);
    const playerSpeedFactor = player.moving ? (player.sneaking ? 0.7 : player.running ? 1.5 : 1.0) : 0.9;
    if (vis.seen) {
      const closeness = 1 - (vis.d / vis.range) * 0.55;
      this.meter += CFG.guard.fillRate * closeness * playerSpeedFactor * storm.fillFactor * dt;
      this.loseSightT = 0;
    } else {
      const drain = player.inWarmZone ? CFG.guard.drainRate * 1.8 : CFG.guard.drainRate;
      this.meter -= drain * dt;
    }
    this.meter = clamp(this.meter, 0, 100);

    const prevState = this.state;
    if (this.meter >= CFG.guard.alertAt && this.state !== 'alert') {
      this.state = 'alert';
      events.spotted(this);
    } else if (this.state === 'alert' && !vis.seen) {
      this.loseSightT += dt;
      if (this.loseSightT > CFG.guard.loseSightSeconds) {
        this.state = 'search';
        this.searchT = 0;
        this.investigate = { x: player.x, z: player.z };
      }
    } else if (this.state === 'alert' && vis.seen) {
      this.loseSightT = 0;
    } else if (this.state !== 'alert' && this.meter >= CFG.guard.suspiciousAt) {
      if (this.state === 'patrol') {
        this.state = 'suspicious';
        this.investigate = { x: player.x, z: player.z };
        this.investigateT = 0;
        events.suspicious(this);
      }
    } else if (this.state === 'suspicious' && this.meter < 20) {
      this.state = 'patrol';
      this.investigate = null;
    }
    if (prevState !== this.state) this.world.setGuardCone(this.group, this.state);

    // Perilaku per state.
    if (this.state === 'patrol') {
      // Jejak segar: penjaga yang menemukannya akan mengikutinya.
      const fresh = footprints.freshNear(this.x, this.z, CFG.footprints.followRadius);
      if (fresh && !this.isWolf) {
        const newest = footprints.newest();
        if (newest) {
          this.state = 'suspicious';
          this.investigate = { x: newest.x, z: newest.z };
          this.world.setGuardCone(this.group, 'suspicious');
          events.track(this, newest);
        }
      } else {
        const wp = this.waypoints[this.wpIndex];
        if (this.moveToward(wp[0], wp[1], dt, this.patrolSpeed)) {
          this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
        }
      }
    } else if (this.state === 'suspicious') {
      if (this.investigate) {
        const arrived = this.moveToward(this.investigate.x, this.investigate.z, dt, this.patrolSpeed);
        if (arrived) {
          this.investigateT += dt;
          // Di titik jejak: cari jejak segar lain di sekitar, lalu kembali patroli.
          const fresh = footprints.freshNear(this.x, this.z, 3);
          if (fresh && this.investigateT < 1.5) {
            const newest = footprints.newest();
            if (newest) this.investigate = { x: newest.x, z: newest.z };
          } else if (this.investigateT > 2.5) {
            this.state = 'patrol';
            this.investigate = null;
            this.world.setGuardCone(this.group, 'patrol');
          }
        }
      }
    } else if (this.state === 'alert') {
      this.moveToward(player.x, player.z, dt, this.chaseSpeed);
      // Tertangkap!
      if (dist2(this.x, this.z, player.x, player.z) < (this.isWolf ? CFG.wolf.catchRadius : CFG.guard.catchRadius)) {
        events.caught(this);
      }
    } else if (this.state === 'search') {
      this.searchT += dt;
      if (this.investigate) {
        this.moveToward(this.investigate.x, this.investigate.z, dt, CFG.guard.searchSpeed);
      }
      if (this.searchT > CFG.guard.searchSeconds) {
        this.state = 'patrol';
        this.investigate = null;
        this.world.setGuardCone(this.group, 'patrol');
      }
    }

    // Sinkron mesh.
    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.y = this.heading;
    const mark = this.state === 'alert' ? ['!', '#ff3b30'] : this.state === 'suspicious' || this.state === 'search' ? ['?', '#ffb020'] : null;
    this.world.setGuardMark(this.group, mark ? mark[0] : null, mark ? mark[1] : null);
  }

  reset() {
    this.x = this.def.start.x;
    this.z = this.def.start.z;
    this.heading = 0;
    this.state = 'patrol';
    this.meter = 0;
    this.loseSightT = 0;
    this.searchT = 0;
    this.investigate = null;
    this.wpIndex = 0;
    this.stuckT = 0;
    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.y = 0;
    this.world.setGuardCone(this.group, 'patrol');
    this.world.setGuardMark(this.group, null);
  }
}

export class GuardManager {
  constructor(world) {
    this.guards = GUARDS.map((d) => new Guard(d, world));
  }

  update(dt, player, storm, footprints, events) {
    for (const g of this.guards) g.update(dt, player, storm, footprints, events);
  }

  maxMeter() {
    return Math.max(0, ...this.guards.map((g) => g.meter));
  }

  // Pengalih: semua penjaga patroli dalam radius r menyelidiki titik (x,z).
  investigatePoint(x, z, r) {
    let n = 0;
    for (const g of this.guards) {
      if (g.state !== 'patrol') continue;
      if (dist2(g.x, g.z, x, z) > r) continue;
      g.state = 'suspicious';
      g.investigate = { x, z };
      g.investigateT = 0;
      g.world.setGuardCone(g.group, 'suspicious');
      n += 1;
    }
    return n;
  }

  anyAlert() {
    return this.guards.some((g) => g.state === 'alert');
  }

  // Apakah ada penjaga yang sedang melihat pemain saat ini.
  anySees(player, storm) {
    return this.guards.some((g) => g.canSee(player.x, player.z, storm).seen);
  }

  reset() {
    for (const g of this.guards) g.reset();
  }
}
