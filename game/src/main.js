// main.js — Bootstrap + state machine: title -> playing -> won/lost.
// Semua statistik layar akhir berasal dari permainan asli (autopilot atau manual).
import * as THREE from 'three';
import { CFG, CRYSTALS } from './config.js';
import { World } from './world.js';
import { Player } from './player.js';
import { GuardManager } from './guards.js';
import { Footprints } from './footprints.js';
import { Storm } from './storm.js';
import { AudioSys } from './audio.js';
import { Input } from './input.js';
import { Hud } from './hud.js';
import { Minimap } from './minimap.js';
import { Autopilot } from './autopilot.js';
import { setupShot } from './shots.js';

export class Game {
  constructor() {
    window.__game = this; // untuk inspeksi headless
    window.__errors = [];
    window.addEventListener('error', (e) => {
      window.__errors.push(String(e.message || e.error));
      const el = document.getElementById('err');
      if (el) el.textContent = window.__errors.join(' | ');
    });
    const container = document.getElementById('game');
    this.world = new World(container);
    this.audio = new AudioSys();
    this.input = new Input();
    this.hud = new Hud();
    this.minimap = new Minimap(document.getElementById('minimap'));
    this.storm = new Storm(this.world.scene, CFG.seed);
    this.footprints = new Footprints();
    this.player = new Player(this.world);
    this.guardManager = new GuardManager(this.world);
    this.autopilot = new Autopilot();
    this.state = 'title';
    this.time = 0;
    this.visualT = 0;
    this.spotted = 0;
    this.frozen = false; // shot statis: logika diam, visual jalan
    this.shot = new URLSearchParams(location.search).get('shot') || '';
    this.endSimDone = false;

    this.events = {
      spotted: (g) => {
        this.spotted += 1;
        this.audio.alert();
        this.hud.banner(`TERLIHAT! ${g.name} mengejarmu!`, 2600);
      },
      suspicious: (g) => {
        this.audio.suspicious();
        this.hud.banner(`${g.name} curiga… sembunyi!`, 2200);
      },
      track: (g) => {
        this.hud.banner(`${g.name} menemukan jejak kakimu!`, 2400);
      },
      caught: (g) => {
        if (this.state === 'playing') this.lose(`${g.name} menangkapmu di tengah salju.`);
      },
    };

    document.getElementById('btn-start').addEventListener('click', () => this.startGame(false));
    document.getElementById('btn-again').addEventListener('click', () => this.startGame(false));
    document.getElementById('btn-retry').addEventListener('click', () => this.startGame(false));
    document.getElementById('btn-mute').addEventListener('click', () => {
      this.audio.ensure();
      const m = this.audio.toggleMute();
      document.getElementById('btn-mute').textContent = m ? '🔇 Suara: Mati (M)' : '🔊 Suara: Hidup (M)';
    });

    this.resetWorld();
    setupShot(this);
    this.lastT = performance.now();
    const loop = (now) => {
      const dt = Math.min((now - this.lastT) / 1000, 0.05);
      this.lastT = now;
      this.frame(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  resetWorld() {
    this.player.reset();
    this.guardManager.reset();
    this.footprints.clear();
    this.storm.reset();
    this.world.scene.fog.near = 14;
    this.world.scene.fog.far = 46;
    this.time = 0;
    this.spotted = 0;
    this.autopilot.stop();
    this.world.setExitOpen(false);
    this.world.updateCrystals(0, this.player.collected);
    this.world.updateFootprints([]);
    this.world.snowball.visible = false;
  }

  startGame(auto) {
    this.audio.ensure();
    this.resetWorld();
    this.state = 'playing';
    this.hud.hideScreens();
    if (auto) this.autopilot.start(this.player);
    this.hud.banner('Curi 3 Kristal Aurora, lalu capai EXIT!', 3000);
  }

  grade() {
    if (this.spotted === 0 && this.time < CFG.grade.sTime) return 'S';
    if (this.spotted <= 1 && this.time < CFG.grade.aTime) return 'A';
    if (this.time < CFG.grade.bTime) return 'B';
    return 'C';
  }

  win() {
    if (this.state !== 'playing') return;
    this.state = 'won';
    this.autopilot.stop();
    this.audio.win();
    this.hud.showWin(this.grade(), {
      time: this.time,
      spotted: this.spotted,
      crystals: this.player.collected.size,
      snowballs: this.player.snowballs,
    });
  }

  lose(reason) {
    if (this.state !== 'playing') return;
    this.state = 'lost';
    this.autopilot.stop();
    this.audio.lose();
    this.hud.showLose(reason);
  }

  tryCollect() {
    const near = this.player.nearestCrystal();
    if (!near) return false;
    this.player.collect(near);
    this.audio.pickup();
    this.hud.banner(`${near.name} didapat! (${this.player.collected.size}/3)`, 2400);
    this.world.setExitOpen(this.player.hasAllCrystals);
    if (this.player.hasAllCrystals) this.hud.banner('Semua kristal didapat — ke gerbang EXIT!', 3000);
    return true;
  }

  // Satu langkah logika (dt detik). Dipakai loop rAF dan simulasi cepat shot=end.
  step(dt) {
    if (this.state !== 'playing') return;
    this.time += dt;
    this.storm.update(dt, this.world.scene, (phase) => {
      if (phase === 'warn') this.hud.banner('⚠ Badai salju datang — cone penjaga memendek!', 2000);
      if (phase === 'storm') {
        this.audio.setStorm(true);
        this.hud.banner('❄ BADAI SALJU! Bergeraklah sekarang!', 2200);
      }
      if (phase === 'calm') this.audio.setStorm(false);
    });

    if (this.autopilot.enabled) {
      this.autopilot.update(dt, this);
    } else {
      const axis = this.input.axis();
      this.player.update(dt, axis, this.input.sneak, this.footprints, this.audio);
      if (this.input.consume('e')) this.tryCollect();
      if (this.input.consume('q')) {
        if (this.player.throwSnowball()) {
          this.audio.throwBall();
          this.hud.banner('Bola salju dilempar — penjaga menyelidiki!', 1800);
        }
      }
    }

    // Pendaratan bola salju: penjaga terdekat menyelidiki titik itu.
    const landing = this.player.consumeLanding();
    if (landing) {
      const n = this.guardManager.investigatePoint(landing.x, landing.z, 9);
      if (n > 0) this.hud.banner(`${n} penjaga menyelidiki suara itu…`, 2000);
    }

    this.guardManager.update(dt, this.player, this.storm, this.footprints, this.events);
    this.footprints.update(dt);
    this.world.updateFootprints(this.footprints.list);

    if (this.player.nearExit) this.win();
  }

  frame(dt) {
    this.visualT += dt;
    // Tombol global.
    if (this.input.consume('m')) {
      this.audio.ensure();
      const m = this.audio.toggleMute();
      document.getElementById('btn-mute').textContent = m ? '🔇 Suara: Mati (M)' : '🔊 Suara: Hidup (M)';
    }
    if (this.state === 'title' && (this.input.consume('enter') || this.input.consume(' '))) {
      this.startGame(false);
    } else if ((this.state === 'won' || this.state === 'lost') && (this.input.consume('r') || this.input.consume('enter'))) {
      this.startGame(false);
    } else if (this.state === 'playing' && this.input.consume('r') && !this.autopilot.enabled) {
      this.startGame(false);
    }

    if (this.shot === 'end' && !this.endSimDone && this.state === 'playing') {
      // Simulasi cepat: mainkan aturan asli tanpa render tiap langkah.
      this.endSimDone = true;
      let steps = 0;
      while (this.state === 'playing' && steps < 20000) {
        this.step(1 / 60);
        steps += 1;
      }
      window.__endSim = { steps, state: this.state, time: this.time, spotted: this.spotted };
    } else if (!this.frozen) {
      this.step(dt);
    } else {
      // Shot statis: hanya visual (salju + kristal), logika diam.
      this.storm.updateVisual(dt);
    }

    this.world.updateCrystals(this.visualT, this.player.collected);
    document.getElementById('storm-veil').style.opacity = this.storm.active ? 0.13 : 0;
    this.hud.update(this);
    this.hud.tickBanner(dt);
    this.minimap.draw(this);
    this.input.endFrame();
    this.world.render();
  }
}

new Game();
