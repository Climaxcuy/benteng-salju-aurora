// level.js — Geometri level: tabrakan circle-vs-AABB, line-of-sight, zona hangat.
import { CFG, WALLS, COVERS, WARM_ZONES } from './config.js';

function allBlockers() {
  const out = [];
  for (const w of WALLS) out.push({ x1: w.x1, z1: w.z1, x2: w.x2, z2: w.z2 });
  for (const c of COVERS) {
    out.push({ x1: c.x - c.w / 2, z1: c.z - c.d / 2, x2: c.x + c.w / 2, z2: c.z + c.d / 2 });
  }
  return out;
}
export const BLOCKERS = allBlockers();

// Pindahkan lingkaran (x,z,r) sejauh (dx,dz) dengan geser di sepanjang AABB.
export function moveCircle(x, z, r, dx, dz) {
  let nx = x + dx;
  for (const b of BLOCKERS) {
    if (nx + r > b.x1 && nx - r < b.x2 && z + r > b.z1 && z - r < b.z2) {
      if (dx > 0) nx = b.x1 - r;
      else if (dx < 0) nx = b.x2 + r;
    }
  }
  let nz = z + dz;
  for (const b of BLOCKERS) {
    if (nx + r > b.x1 && nx - r < b.x2 && nz + r > b.z1 && nz - r < b.z2) {
      if (dz > 0) nz = b.z1 - r;
      else if (dz < 0) nz = b.z2 + r;
    }
  }
  // Jepit ke dalam halaman.
  nx = Math.max(-CFG.level.halfX + r, Math.min(CFG.level.halfX - r, nx));
  nz = Math.max(-CFG.level.halfZ + r, Math.min(CFG.level.halfZ - r, nz));
  return { x: nx, z: nz };
}

// Apakah segmen (ax,az)-(bx,bz) terhalang dinding/cover (uji 2D, cukup untuk LOS).
export function losBlocked(ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  for (const b of BLOCKERS) {
    // Liang: uji slab AABB.
    let tmin = 0;
    let tmax = 1;
    let ok = true;
    for (const [o, d, lo, hi] of [[ax, dx, b.x1, b.x2], [az, dz, b.z1, b.z2]]) {
      if (Math.abs(d) < 1e-9) {
        if (o < lo || o > hi) {
          ok = false;
          break;
        }
      } else {
        let t1 = (lo - o) / d;
        let t2 = (hi - o) / d;
        if (t1 > t2) {
          const t = t1;
          t1 = t2;
          t2 = t;
        }
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) {
          ok = false;
          break;
        }
      }
    }
    if (ok) return true;
  }
  return false;
}

export function inWarmZone(x, z) {
  for (const w of WARM_ZONES) {
    const dx = x - w.x;
    const dz = z - w.z;
    if (dx * dx + dz * dz < w.r * w.r) return true;
  }
  return false;
}

export function warmZoneAt(x, z) {
  for (const w of WARM_ZONES) {
    const dx = x - w.x;
    const dz = z - w.z;
    if (dx * dx + dz * dz < w.r * w.r) return w;
  }
  return null;
}
