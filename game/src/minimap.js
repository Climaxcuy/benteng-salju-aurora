// minimap.js — Minimap 2D: dinding, cover, kristal, EXIT, penjaga + kerucut, pemain.
import { CFG, WALLS, COVERS, CRYSTALS } from './config.js';

export class Minimap {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = canvas.width;
    this.h = canvas.height;
  }

  project(x, z) {
    const px = ((x + CFG.level.halfX + 1) / (CFG.level.halfX * 2 + 2)) * this.w;
    const py = ((z + CFG.level.halfZ + 1) / (CFG.level.halfZ * 2 + 2)) * this.h;
    return [px, py];
  }

  draw(game) {
    const c = this.ctx;
    c.clearRect(0, 0, this.w, this.h);
    c.fillStyle = '#0d1a33';
    c.fillRect(0, 0, this.w, this.h);
    // Cover.
    c.fillStyle = '#3a5a8a';
    for (const cov of COVERS) {
      const [x, y] = this.project(cov.x - cov.w / 2, cov.z - cov.d / 2);
      const [x2, y2] = this.project(cov.x + cov.w / 2, cov.z + cov.d / 2);
      c.fillRect(x, y, x2 - x, y2 - y);
    }
    // Dinding.
    c.fillStyle = '#c8d6ee';
    for (const w of WALLS) {
      const [x, y] = this.project(w.x1, w.z1);
      const [x2, y2] = this.project(w.x2, w.z2);
      c.fillRect(x, y, Math.max(1.5, x2 - x), Math.max(1.5, y2 - y));
    }
    // Kristal.
    for (const cr of CRYSTALS) {
      if (game.player.collected.has(cr.id)) continue;
      const [x, y] = this.project(cr.x, cr.z);
      c.fillStyle = cr.css;
      c.beginPath();
      c.arc(x, y, 4, 0, Math.PI * 2);
      c.fill();
    }
    // EXIT.
    const [ex, ey] = this.project(CFG.exit.x, CFG.exit.z);
    c.fillStyle = game.player.hasAllCrystals ? '#35e08a' : '#8a97a8';
    c.fillRect(ex - 5, ey - 3, 10, 6);
    // Penjaga + kerucut.
    for (const g of game.guardManager.guards) {
      const [x, y] = this.project(g.x, g.z);
      const col = g.state === 'alert' ? '#ff3b30' : g.state === 'patrol' ? '#ffd34d' : '#ff9a1f';
      c.fillStyle = col;
      c.globalAlpha = 0.35;
      c.beginPath();
      c.moveTo(x, y);
      c.arc(x, y, g.viewRange * 5.4, Math.atan2(Math.cos(g.heading), Math.sin(g.heading)) - g.viewHalf, Math.atan2(Math.cos(g.heading), Math.sin(g.heading)) + g.viewHalf);
      c.closePath();
      c.fill();
      c.globalAlpha = 1;
      c.beginPath();
      c.arc(x, y, g.isWolf ? 3 : 3.5, 0, Math.PI * 2);
      c.fill();
    }
    // Pemain.
    const [px, py] = this.project(game.player.x, game.player.z);
    c.fillStyle = '#ff5a1f';
    c.strokeStyle = '#fff';
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(px, py, 4.5, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  }
}
