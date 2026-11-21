// world.js — Membangun adegan Three.js: tanah salju, benteng, aurora, kristal, obor,
// gerbang EXIT, mesh pemain/penjaga + kerucut visi bervolume, dan jejak kaki.
import * as THREE from 'three';
import { CFG, WALLS, COVERS, WARM_ZONES, CRYSTALS } from './config.js';

const CONE_COLORS = { patrol: 0xffd34d, suspicious: 0xff9a1f, alert: 0xff3b30, search: 0xff9a1f };

export class World {
  constructor(container) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(1280, 800);
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a1428);
    this.scene.fog = new THREE.Fog(0x0a1428, 14, 46);

    this.camera = new THREE.PerspectiveCamera(48, 1280 / 800, 0.1, 120);
    this.camera.position.set(0, 25.5, 15.5);
    this.camera.lookAt(0, 0, 0.4);

    this.crystalMeshes = new Map();
    this.footprintPool = [];
    this.footprintIdx = 0;
    this.buildLights();
    this.buildGround();
    this.buildAurora();
    this.buildWalls();
    this.buildCovers();
    this.buildCrystals();
    this.buildTorches();
    this.buildExit();
    this.buildFootprintPool();
    this.buildSnowball();
  }

  buildLights() {
    const amb = new THREE.AmbientLight(0x8fa8cc, 0.55);
    this.scene.add(amb);
    const hemi = new THREE.HemisphereLight(0x9fd8a0, 0x1a2a4a, 0.7);
    this.scene.add(hemi);
    const moon = new THREE.DirectionalLight(0xcfe4ff, 1.5);
    moon.position.set(-12, 22, -8);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    moon.shadow.camera.left = -22;
    moon.shadow.camera.right = 22;
    moon.shadow.camera.top = 18;
    moon.shadow.camera.bottom = -18;
    moon.shadow.camera.far = 60;
    this.scene.add(moon);
    const auroraLight = new THREE.PointLight(0x54e0a0, 60, 40, 1.6);
    auroraLight.position.set(0, 10, -10);
    this.scene.add(auroraLight);
    const warm = new THREE.PointLight(0xffb347, 25, 18, 1.8);
    warm.position.set(0, 4, 6);
    this.scene.add(warm);
  }

  snowTexture() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#e8f1fb';
    g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        g.fillStyle = (x + y) % 2 ? '#dfeaf7' : '#eef4fc';
        g.fillRect(x * 32, y * 32, 32, 32);
      }
    }
    g.fillStyle = 'rgba(160,190,230,0.35)';
    for (let i = 0; i < 260; i++) {
      g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 4);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  buildGround() {
    const geo = new THREE.PlaneGeometry(36, 26);
    const mat = new THREE.MeshStandardMaterial({ map: this.snowTexture(), roughness: 0.95, metalness: 0 });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    // Pita jalan batu dari gerbang ke tengah halaman.
    const pathMat = new THREE.MeshStandardMaterial({ color: 0x9aa7bd, roughness: 0.9 });
    const path = new THREE.Mesh(new THREE.BoxGeometry(3, 0.08, 20), pathMat);
    path.position.set(0, 0.04, 1.5);
    path.receiveShadow = true;
    this.scene.add(path);
  }

  buildAurora() {
    // Pita aurora: tiga lembar melengkung di langit, hijau -> ungu, transparan aditif.
    const colors = [0x3dff9e, 0x59c2ff, 0xb78cff];
    colors.forEach((col, i) => {
      const geo = new THREE.PlaneGeometry(34, 5, 24, 1);
      const pos = geo.attributes.position;
      for (let v = 0; v < pos.count; v++) {
        const x = pos.getX(v);
        pos.setZ(v, Math.sin(x * 0.28 + i * 1.7) * 1.6);
      }
      geo.computeVertexNormals();
      const mat = new THREE.MeshBasicMaterial({
        color: col, transparent: true, opacity: 0.34, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      });
      const ribbon = new THREE.Mesh(geo, mat);
      ribbon.position.set(0, 8.5 + i * 1.8, -13 - i * 1.5);
      ribbon.rotation.x = -0.15;
      this.scene.add(ribbon);
    });
    // Bulan.
    const moon = new THREE.Mesh(
      new THREE.CircleGeometry(1.6, 32),
      new THREE.MeshBasicMaterial({ color: 0xf4f8ff, fog: false }),
    );
    moon.position.set(13, 9.5, -15);
    moon.lookAt(this.camera.position);
    this.scene.add(moon);
  }

  buildWalls() {
    const stone = new THREE.MeshStandardMaterial({ color: 0x7d94b8, roughness: 0.85 });
    const capMat = new THREE.MeshStandardMaterial({ color: 0xdfeaf7, roughness: 0.7 });
    const gateMat = new THREE.MeshStandardMaterial({ color: 0x5a7396, roughness: 0.8 });
    for (const w of WALLS) {
      const cx = (w.x1 + w.x2) / 2;
      const cz = (w.z1 + w.z2) / 2;
      const sx = w.x2 - w.x1;
      const sz = w.z2 - w.z1;
      const h = w.h;
      const box = new THREE.Mesh(new THREE.BoxGeometry(sx, h, sz), h > 2 ? stone : gateMat);
      box.position.set(cx, h / 2, cz);
      box.castShadow = true;
      box.receiveShadow = true;
      this.scene.add(box);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(sx + 0.15, 0.18, sz + 0.15), capMat);
      cap.position.set(cx, h + 0.09, cz);
      cap.castShadow = true;
      this.scene.add(cap);
    }
  }

  buildCovers() {
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xf4f9ff, roughness: 1 });
    const iceMat = new THREE.MeshStandardMaterial({
      color: 0x9fd8ef, roughness: 0.25, metalness: 0.1, emissive: 0x1a4a66, emissiveIntensity: 0.5,
    });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.9 });
    for (const c of COVERS) {
      if (c.kind === 'snow') {
        const pile = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), snowMat);
        pile.scale.set(c.w / 2, c.h, c.d / 2);
        pile.position.set(c.x, 0, c.z);
        pile.castShadow = true;
        pile.receiveShadow = true;
        this.scene.add(pile);
      } else if (c.kind === 'statue') {
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 0.5, 10), iceMat);
        base.position.set(c.x, 0.25, c.z);
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.5, 1.5, 10), iceMat);
        body.position.set(c.x, 1.2, c.z);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), iceMat);
        head.position.set(c.x, 2.15, c.z);
        for (const m of [base, body, head]) {
          m.castShadow = true;
          this.scene.add(m);
        }
      } else if (c.kind === 'sled') {
        const bed = new THREE.Mesh(new THREE.BoxGeometry(c.w, 0.25, c.d), woodMat);
        bed.position.set(c.x, 0.5, c.z);
        bed.castShadow = true;
        this.scene.add(bed);
        for (const s of [-0.4, 0.4]) {
          const runner = new THREE.Mesh(new THREE.BoxGeometry(c.w, 0.12, 0.12), woodMat);
          runner.position.set(c.x, 0.12, c.z + s);
          this.scene.add(runner);
        }
      }
    }
  }

  buildCrystals() {
    for (const cr of CRYSTALS) {
      const group = new THREE.Group();
      const ped = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.75, 0.9, 10),
        new THREE.MeshStandardMaterial({ color: 0x6a7ea0, roughness: 0.7 }),
      );
      ped.position.y = 0.45;
      ped.castShadow = true;
      group.add(ped);
      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.55, 0),
        new THREE.MeshStandardMaterial({
          color: cr.color, emissive: cr.color, emissiveIntensity: 1.4, roughness: 0.15, metalness: 0.2,
        }),
      );
      gem.position.y = 1.7;
      gem.castShadow = true;
      group.add(gem);
      const light = new THREE.PointLight(cr.color, 14, 9, 1.8);
      light.position.y = 1.8;
      group.add(light);
      group.position.set(cr.x, 0, cr.z);
      this.scene.add(group);
      this.crystalMeshes.set(cr.id, { group, gem, light });
    }
  }

  buildTorches() {
    for (const w of WARM_ZONES) {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.12, 1.6, 8),
        new THREE.MeshStandardMaterial({ color: 0x4a3826, roughness: 0.9 }),
      );
      pole.position.set(w.x, 0.8, w.z);
      pole.castShadow = true;
      this.scene.add(pole);
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.32, 0.8, 10),
        new THREE.MeshStandardMaterial({ color: 0xffa62b, emissive: 0xff7b00, emissiveIntensity: 2.2 }),
      );
      flame.position.set(w.x, 1.9, w.z);
      this.scene.add(flame);
      const light = new THREE.PointLight(0xff9a2b, 18, 10, 1.8);
      light.position.set(w.x, 2, w.z);
      this.scene.add(light);
      // Cincin zona hangat di salju.
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(w.r - 0.12, w.r, 40),
        new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(w.x, 0.06, w.z);
      this.scene.add(ring);
    }
  }

  buildExit() {
    const postMat = new THREE.MeshStandardMaterial({ color: 0x5a7396, roughness: 0.8 });
    for (const s of [-2.5, 2.5]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.7, 3.6, 0.7), postMat);
      post.position.set(s, 1.8, 12);
      post.castShadow = true;
      this.scene.add(post);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(5.7, 0.7, 0.7), postMat);
    beam.position.set(0, 3.6, 12);
    beam.castShadow = true;
    this.scene.add(beam);
    this.exitGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 3.2),
      new THREE.MeshBasicMaterial({ color: 0x35e08a, transparent: true, opacity: 0.22, side: THREE.DoubleSide }),
    );
    this.exitGlow.position.set(0, 1.7, 11.9);
    this.scene.add(this.exitGlow);
    this.exitLight = new THREE.PointLight(0x35e08a, 10, 8, 1.8);
    this.exitLight.position.set(0, 2, 11);
    this.scene.add(this.exitLight);
  }

  setExitOpen(open) {
    this.exitGlow.material.color.setHex(open ? 0x35e08a : 0x8a97a8);
    this.exitGlow.material.opacity = open ? 0.4 : 0.15;
    this.exitLight.intensity = open ? 22 : 6;
  }

  buildFootprintPool() {
    const geo = new THREE.CircleGeometry(0.11, 8);
    for (let i = 0; i < 240; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
      const m = new THREE.Mesh(geo, mat);
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.07;
      m.visible = false;
      this.scene.add(m);
      this.footprintPool.push(m);
    }
  }

  updateFootprints(list) {
    for (let i = 0; i < this.footprintPool.length; i++) {
      const mesh = this.footprintPool[i];
      const f = list[i];
      if (!f) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      mesh.position.x = f.x;
      mesh.position.z = f.z;
      mesh.material.opacity = Math.max(0, 0.85 * (1 - f.age / f.life));
    }
  }

  buildSnowball() {
    this.snowball = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }),
    );
    this.snowball.visible = false;
    this.snowball.castShadow = true;
    this.scene.add(this.snowball);
  }

  // --- Pemain: parka oranye terang + cincin hijau + panah di atas kepala ---
  makePlayer() {
    const g = new THREE.Group();
    const parka = new THREE.MeshStandardMaterial({ color: 0xff5a1f, roughness: 0.7 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.55, 4, 12), parka);
    body.position.y = 0.85;
    body.castShadow = true;
    g.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 14, 10),
      new THREE.MeshStandardMaterial({ color: 0xffc890, roughness: 0.7 }),
    );
    head.position.y = 1.55;
    head.castShadow = true;
    g.add(head);
    const hood = new THREE.Mesh(
      new THREE.TorusGeometry(0.27, 0.09, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xffe08a, roughness: 0.7 }),
    );
    hood.position.y = 1.55;
    hood.rotation.x = Math.PI / 2;
    g.add(hood);
    const pack = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.5, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x2b4a7f, roughness: 0.8 }),
    );
    pack.position.set(0, 0.95, -0.36);
    g.add(pack);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.68, 32),
      new THREE.MeshBasicMaterial({ color: 0x35e08a, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    g.add(ring);
    this.playerRing = ring;
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.4, 4),
      new THREE.MeshBasicMaterial({ color: 0x35e08a }),
    );
    arrow.position.y = 2.15;
    arrow.rotation.x = Math.PI;
    g.add(arrow);
    this.playerArrow = arrow;
    this.scene.add(g);
    return g;
  }

  // --- Penjaga: prajurit salju / serigala putih + kerucut visi bervolume ---
  makeGuard(def) {
    const g = new THREE.Group();
    if (def.kind === 'wolf') {
      const fur = new THREE.MeshStandardMaterial({ color: 0xf2f6ff, roughness: 0.9 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 1.25), fur);
      body.position.y = 0.55;
      body.castShadow = true;
      g.add(body);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.5), fur);
      head.position.set(0, 0.72, 0.75);
      head.castShadow = true;
      g.add(head);
      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.3), fur);
      snout.position.set(0, 0.62, 1.05);
      g.add(snout);
      for (const s of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.24, 4), fur);
        ear.position.set(s * 0.15, 1.0, 0.7);
        g.add(ear);
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.12), fur);
        leg.position.set(s * 0.2, 0.2, 0.45);
        g.add(leg);
        const leg2 = leg.clone();
        leg2.position.z = -0.45;
        g.add(leg2);
      }
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.6, 6), fur);
      tail.rotation.x = -Math.PI / 2.4;
      tail.position.set(0, 0.7, -0.8);
      g.add(tail);
    } else {
      const coat = new THREE.MeshStandardMaterial({ color: 0x2e4a6e, roughness: 0.8 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 1.1, 10), coat);
      body.position.y = 0.8;
      body.castShadow = true;
      g.add(body);
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0xe8c39a, roughness: 0.7 }),
      );
      head.position.y = 1.55;
      head.castShadow = true;
      g.add(head);
      const helm = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 0.4, 10),
        new THREE.MeshStandardMaterial({ color: 0x9aa7bd, roughness: 0.4, metalness: 0.6 }),
      );
      helm.position.y = 1.85;
      g.add(helm);
      const spear = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 1.9, 6),
        new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.9 }),
      );
      spear.position.set(0.42, 0.95, 0);
      spear.castShadow = true;
      g.add(spear);
    }
    // Tanda "?" / "!" melayang di atas kepala.
    const markCanvas = document.createElement('canvas');
    markCanvas.width = 64;
    markCanvas.height = 64;
    const markTex = new THREE.CanvasTexture(markCanvas);
    const mark = new THREE.Sprite(new THREE.SpriteMaterial({ map: markTex, transparent: true, depthTest: false }));
    mark.scale.set(0.9, 0.9, 1);
    mark.position.y = def.kind === 'wolf' ? 1.5 : 2.35;
    mark.visible = false;
    g.add(mark);
    g.userData.mark = { canvas: markCanvas, tex: markTex, sprite: mark };

    // Kerucut visi: kipas datar di tanah + kerucut 3D pipih di atasnya.
    const range = def.kind === 'wolf' ? CFG.wolf.viewRange : CFG.guard.viewRange;
    const half = def.kind === 'wolf' ? CFG.wolf.viewHalfAngle : CFG.guard.viewHalfAngle;
    const fanGeo = new THREE.CircleGeometry(range, 24, -half, half * 2);
    fanGeo.rotateX(-Math.PI / 2);
    fanGeo.rotateY(-Math.PI / 2); // pusatkan kipas ke +Z (arah hadap penjaga)
    const fanMat = new THREE.MeshBasicMaterial({
      color: CONE_COLORS.patrol, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false,
    });
    const fan = new THREE.Mesh(fanGeo, fanMat);
    fan.position.y = 0.09;
    g.add(fan);
    const coneGeo = new THREE.ConeGeometry(range * Math.sin(half), range, 20, 1, true);
    coneGeo.rotateX(-Math.PI / 2); // puncak kerucut ke -Z ...
    coneGeo.translate(0, 0.35, range / 2); // ...lalu geser agar puncak di penjaga, melebar ke +Z
    const coneMat = new THREE.MeshBasicMaterial({
      color: CONE_COLORS.patrol, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false,
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.scale.y = 0.45;
    g.add(cone);
    g.userData.cone = { fan, fanMat, cone, coneMat, range };
    this.scene.add(g);
    return g;
  }

  setGuardCone(group, state) {
    const c = group.userData.cone;
    const col = CONE_COLORS[state] || CONE_COLORS.patrol;
    c.fanMat.color.setHex(col);
    c.coneMat.color.setHex(col);
    c.fanMat.opacity = state === 'alert' ? 0.4 : 0.28;
    c.coneMat.opacity = state === 'alert' ? 0.2 : 0.13;
  }

  setGuardMark(group, symbol, color) {
    const m = group.userData.mark;
    if (!symbol) {
      m.sprite.visible = false;
      return;
    }
    const ctx = m.canvas.getContext('2d');
    ctx.clearRect(0, 0, 64, 64);
    ctx.font = 'bold 52px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#111';
    ctx.strokeText(symbol, 32, 34);
    ctx.fillStyle = color;
    ctx.fillText(symbol, 32, 34);
    m.tex.needsUpdate = true;
    m.sprite.visible = true;
  }

  updateCrystals(t, collected) {
    for (const [id, m] of this.crystalMeshes) {
      if (collected.has(id)) {
        m.group.visible = false;
        continue;
      }
      m.group.visible = true;
      m.gem.rotation.y = t * 1.2;
      m.gem.position.y = 1.7 + Math.sin(t * 2 + id.length) * 0.12;
      m.light.intensity = 12 + Math.sin(t * 3) * 3;
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
