// hud.js — HUD DOM: panel kristal/waktu, meter deteksi, strip status penjaga,
// banner tengah, layar TITLE / WIN / LOSE.
import { CRYSTALS } from './config.js';

export class Hud {
  constructor() {
    this.el = {
      stats: document.getElementById('hud-stats'),
      meter: document.getElementById('hud-meter'),
      meterBar: document.getElementById('meter-bar'),
      meterLabel: document.getElementById('meter-label'),
      guards: document.getElementById('hud-guards'),
      banner: document.getElementById('banner'),
      hint: document.getElementById('hud-hint'),
      title: document.getElementById('screen-title'),
      win: document.getElementById('screen-win'),
      lose: document.getElementById('screen-lose'),
      winStats: document.getElementById('win-stats'),
      winGrade: document.getElementById('win-grade'),
      loseReason: document.getElementById('lose-reason'),
    };
    this.bannerT = 0;
    this.lastBanner = '';
  }

  fmtTime(t) {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  update(game) {
    const p = game.player;
    const storm = game.storm;
    const crystalLine = CRYSTALS.map((c) =>
      p.collected.has(c.id) ? `◆ ${c.name.replace('Kristal ', '')}` : `◇ ${c.name.replace('Kristal ', '')}`,
    ).join(' · ');
    const stormTxt = storm.phase === 'storm'
      ? '❄ BADAI SALJU — cone memendek!'
      : storm.phase === 'warn'
        ? '⚠ Badai datang…'
        : `Badai dalam ${Math.ceil(storm.secondsToStorm)} dtk`;
    this.el.stats.innerHTML =
      `<div class="row"><b>◆ ${p.collected.size}/3 Kristal</b><span class="dim">${crystalLine}</span></div>` +
      `<div class="row"><span>⏱ ${this.fmtTime(game.time)}</span><span>● Bola salju: ${p.snowballs}</span></div>` +
      `<div class="row"><span>${stormTxt}</span><span>${p.inWarmZone ? '🔥 Zona hangat — jejak meleleh' : ''}</span></div>` +
      `<div class="row"><span>${p.hasAllCrystals ? '➡ Capai gerbang EXIT di selatan!' : 'Curi 3 kristal lalu ke EXIT'}</span></div>`;

    const meter = Math.round(game.guardManager.maxMeter());
    const label = meter >= 100 ? 'TERLIHAT!' : meter >= 55 ? 'CURIGA…' : meter >= 25 ? 'Waspada' : 'Aman';
    this.el.meterLabel.textContent = label;
    this.el.meterBar.style.width = `${meter}%`;
    this.el.meterBar.style.background = meter >= 100 ? '#ff3b30' : meter >= 55 ? '#ffb020' : '#35e08a';

    this.el.guards.innerHTML = game.guardManager.guards.map((g) => {
      const icon = g.state === 'alert' ? '!' : g.state === 'patrol' ? '○' : '?';
      const cls = g.state === 'alert' ? 'alert' : g.state === 'patrol' ? 'ok' : 'warn';
      return `<span class="${cls}">${g.name} ${icon}</span>`;
    }).join(' · ');

    const near = p.nearestCrystal();
    if (near) {
      this.el.hint.textContent = `Tekan E — ambil ${near.name}`;
      this.el.hint.classList.add('show');
    } else if (p.hasAllCrystals) {
      this.el.hint.textContent = 'Kristal lengkap! Capai gerbang EXIT (selatan).';
      this.el.hint.classList.add('show');
    } else {
      this.el.hint.classList.remove('show');
    }
  }

  banner(text, ms) {
    if (text === this.lastBanner && this.bannerT > 0) return;
    this.lastBanner = text;
    this.el.banner.textContent = text;
    this.el.banner.classList.add('show');
    this.bannerT = (ms || 2600) / 1000;
  }

  tickBanner(dt) {
    if (this.bannerT > 0) {
      this.bannerT -= dt;
      if (this.bannerT <= 0) this.el.banner.classList.remove('show');
    }
  }

  showTitle() {
    this.el.title.classList.add('show');
    this.el.win.classList.remove('show');
    this.el.lose.classList.remove('show');
  }

  hideScreens() {
    this.el.title.classList.remove('show');
    this.el.win.classList.remove('show');
    this.el.lose.classList.remove('show');
  }

  showWin(grade, stats) {
    this.el.winGrade.textContent = `GRADE ${grade}`;
    this.el.winGrade.className = `grade grade-${grade.toLowerCase()}`;
    this.el.winStats.innerHTML =
      `Waktu: <b>${this.fmtTime(stats.time)}</b> · Ketahuan: <b>${stats.spotted}x</b> · ` +
      `Kristal: <b>${stats.crystals}/3</b> · Bola salju tersisa: <b>${stats.snowballs}</b>`;
    this.el.win.classList.add('show');
    this.el.title.classList.remove('show');
    this.el.lose.classList.remove('show');
  }

  showLose(reason) {
    this.el.loseReason.textContent = reason;
    this.el.lose.classList.add('show');
    this.el.title.classList.remove('show');
    this.el.win.classList.remove('show');
  }
}
