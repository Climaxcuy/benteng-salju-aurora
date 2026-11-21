// storm.js — Siklus badai salju: tenang -> peringatan -> badai. Badai memangkas jarak
// pandang & laju deteksi semua pihak, dan menebalkan kabut + salju.
import * as THREE from 'three';
import { CFG } from './config.js';
import { mulberry32 } from './rng.js';

export class Storm {
  constructor(scene, rngSeed) {
    this.t = 0;
    this.phase = 'calm'; // calm | warn | storm
    this.phaseT = 0;
    this.active = false;
    const rng = mulberry32(rngSeed);
    const N = 900;
    this.count = N;
    const pos = new Float32Array(N * 3);
    this.vel = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (rng() - 0.5) * 44;
      pos[i * 3 + 1] = rng() * 14;
      pos[i * 3 + 2] = (rng() - 0.5) * 32;
      this.vel[i] = 1.2 + rng() * 1.8;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff, size: 0.14, transparent: true, opacity: 0.85, sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.baseFog = null;
  }

  get rangeFactor() {
    return this.active ? CFG.storm.rangeFactor : 1;
  }

  get fillFactor() {
    return this.active ? CFG.storm.fillFactor : 1;
  }

  get secondsToStorm() {
    if (this.phase === 'calm') return CFG.storm.calmSeconds - this.phaseT;
    if (this.phase === 'warn') return 0;
    return CFG.storm.stormSeconds - this.phaseT;
  }

  update(dt, scene, onPhase) {
    this.t += dt;
    this.phaseT += dt;
    let changed = false;
    if (this.phase === 'calm' && this.phaseT >= CFG.storm.calmSeconds) {
      this.phase = 'warn';
      this.phaseT = 0;
      changed = true;
    } else if (this.phase === 'warn' && this.phaseT >= CFG.storm.warnSeconds) {
      this.phase = 'storm';
      this.phaseT = 0;
      this.active = true;
      changed = true;
      if (scene.fog) scene.fog.near = 12;
      if (scene.fog) scene.fog.far = 48;
    } else if (this.phase === 'storm' && this.phaseT >= CFG.storm.stormSeconds) {
      this.phase = 'calm';
      this.phaseT = 0;
      this.active = false;
      changed = true;
      if (scene.fog) scene.fog.near = 14;
      if (scene.fog) scene.fog.far = 46;
    }
    if (changed && onPhase) onPhase(this.phase);

    this.updateVisual(dt);
  }

  // Visual saja (salju jatuh) tanpa memajukan fase — untuk shot statis.
  updateVisual(dt) {
    const speed = this.active ? 3.2 : 1.0;
    const drift = this.active ? 2.4 : 0.5;
    const pos = this.points.geometry.attributes.position.array;
    for (let i = 0; i < this.count; i++) {
      pos[i * 3 + 1] -= this.vel[i] * speed * dt;
      pos[i * 3] += Math.sin(this.t * 0.7 + i) * drift * dt;
      if (pos[i * 3 + 1] < 0) {
        pos[i * 3 + 1] = 12 + Math.random() * 2;
        pos[i * 3] = (Math.random() - 0.5) * 44;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 32;
      }
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.material.opacity = this.active ? 1 : 0.7;
  }

  reset() {
    this.t = 0;
    this.phase = 'calm';
    this.phaseT = 0;
    this.active = false;
  }
}
