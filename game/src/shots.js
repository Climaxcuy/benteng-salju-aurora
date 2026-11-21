// shots.js — Keadaan deterministik tiap ?shot= :
//   start   -> layar judul di atas adegan segar
//   play    -> tengah permainan: 1 kristal, pemain menyelinap di halaman, 1 penjaga curiga
//   climax  -> badai aktif, 2 kristal, pemain dekat Kristal Senja, 1 penjaga mengejar
//   end     -> autopilot memainkan aturan asli dari state segar sampai WIN (murni)
import { CRYSTALS } from './config.js';

function placePlayer(game, x, z, facing) {
  game.player.x = x;
  game.player.z = z;
  game.player.facing = facing;
  game.player.group.position.set(x, 0, z);
  game.player.group.rotation.y = facing;
}

function setGuard(game, name, x, z, heading, state, meter) {
  const g = game.guardManager.guards.find((gg) => gg.name === name);
  if (!g) return;
  g.x = x;
  g.z = z;
  g.heading = heading;
  g.state = state;
  g.meter = meter;
  g.group.position.set(x, 0, z);
  g.group.rotation.y = heading;
  game.world.setGuardCone(g.group, state);
  game.world.setGuardMark(g.group, state === 'alert' ? '!' : state === 'suspicious' ? '?' : null, state === 'alert' ? '#ff3b30' : '#ffb020');
}

function seedFootprints(game, points) {
  for (const [x, z] of points) game.footprints.add(x, z);
}

export function setupShot(game) {
  const shot = game.shot;
  if (!shot) {
    game.state = 'title';
    game.hud.showTitle();
    return;
  }
  if (shot === 'start') {
    game.state = 'title';
    game.frozen = true;
    game.hud.showTitle();
    return;
  }
  if (shot === 'play') {
    game.state = 'playing';
    game.frozen = true;
    game.time = 42;
    game.player.collected.add('fajar');
    game.player.snowballs = 2;
    placePlayer(game, -6, 4, Math.PI / 4);
    seedFootprints(game, [[-6, 5], [-6.2, 5.6], [-6.4, 6.2], [-6.6, 6.8], [-6.8, 7.4], [-7, 8]]);
    setGuard(game, 'Borin', -10, -5.5, Math.PI / 2, 'suspicious', 62);
    game.guardManager.guards.find((g) => g.name === 'Borin').investigate = { x: -6, z: 4 };
    game.world.setExitOpen(false);
    game.hud.hideScreens();
    game.hud.banner('Kristal Fajar didapat! (1/3)', 4000);
    game.hud.update(game);
    return;
  }
  if (shot === 'climax') {
    game.state = 'playing';
    game.frozen = true;
    game.time = 78;
    game.player.collected.add('fajar');
    game.player.collected.add('tengah');
    game.player.snowballs = 1;
    placePlayer(game, 10, -7.5, -Math.PI / 2);
    seedFootprints(game, [[10, -6], [10.2, -5.4], [10.4, -4.8], [9.8, -6.6], [9.6, -7.2]]);
    // Badai aktif: kabut menebal, cone memendek.
    game.storm.phase = 'storm';
    game.storm.phaseT = 2;
    game.storm.active = true;
    game.world.scene.fog.near = 12;
    game.world.scene.fog.far = 48;
    setGuard(game, 'Haldor', 13.5, -4.5, Math.atan2(10 - 13.5, -7.5 - -4.5), 'alert', 100);
    setGuard(game, 'Fenrir', 5, 2, Math.PI, 'suspicious', 70);
    game.world.setExitOpen(false);
    game.hud.hideScreens();
    game.hud.banner('❄ BADAI SALJU! Haldor mengejarmu!', 4000);
    game.hud.update(game);
    return;
  }
  if (shot === 'end') {
    game.startGame(true); // autopilot; simulasi cepat di frame pertama (main.js)
    return;
  }
  // Shot tak dikenal: kembali ke judul.
  game.state = 'title';
  game.hud.showTitle();
}
