// config.js — Konstanta + data level BENTENG SALJU (satu-satunya sumber data level).
// Koordinat: x timur, z selatan, origin di tengah halaman benteng. Satuan: meter.

export const CFG = {
  seed: 7,
  level: { halfX: 17, halfZ: 12 },
  player: {
    start: { x: 0, z: 10.5 },
    walkSpeed: 4.0,
    sneakSpeed: 2.6,
    runSpeed: 5.4,
    radius: 0.45,
    collectRadius: 1.7,
  },
  guard: {
    patrolSpeed: 2.1,
    chaseSpeed: 3.0,
    searchSpeed: 1.6,
    radius: 0.5,
    viewRange: 7.0,
    viewHalfAngle: 0.61, // ~35 derajat
    catchRadius: 0.8,
    fillRate: 35, // per detik saat terlihat penuh
    drainRate: 40,
    suspiciousAt: 55,
    alertAt: 100,
    loseSightSeconds: 2.0,
    searchSeconds: 4.0,
  },
  wolf: {
    patrolSpeed: 3.4,
    chaseSpeed: 4.6,
    radius: 0.45,
    viewRange: 4.6,
    viewHalfAngle: 0.7,
    catchRadius: 0.9,
  },
  storm: { calmSeconds: 20, warnSeconds: 2, stormSeconds: 6, rangeFactor: 0.5, fillFactor: 0.5 },
  footprints: { everySeconds: 0.32, lifeSeconds: 12, freshSeconds: 8, followRadius: 1.6 },
  snowballs: 3,
  exit: { x: 0, z: 11.8, radius: 1.3 },
  grade: { sTime: 115, aTime: 145, bTime: 190 },
};

// Dinding: AABB {x1,z1,x2,z2,h} — menghalangi gerak + line-of-sight.
export const WALLS = [
  // Perimeter utara / barat / timur
  { x1: -17, z1: -12.4, x2: 17, z2: -12, h: 3.2 },
  { x1: -17.4, z1: -12, x2: -17, z2: 12, h: 3.2 },
  { x1: 17, z1: -12, x2: 17.4, z2: 12, h: 3.2 },
  // Perimeter selatan, celah gerbang EXIT di x -2.5..2.5
  { x1: -17, z1: 12, x2: -2.5, z2: 12.4, h: 3.2 },
  { x1: 2.5, z1: 12, x2: 17, z2: 12.4, h: 3.2 },
  // Menara Fajar (barat laut): dinding timur menara
  { x1: -8, z1: -12, x2: -6, z2: -7, h: 3.0 },
  // Menara Senja (timur laut): dinding barat menara
  { x1: 6, z1: -12, x2: 8, z2: -7, h: 3.0 },
  // Menara Tengah Malam (tengah utara): kotak dengan pintu di sisi selatan
  { x1: -3, z1: -9, x2: 3, z2: -8, h: 3.0 },
  { x1: -3, z1: -9, x2: -2, z2: -3, h: 3.0 },
  { x1: 2, z1: -9, x2: 3, z2: -3, h: 3.0 },
  { x1: -3, z1: -4, x2: -1, z2: -3, h: 3.0 },
  { x1: 1, z1: -4, x2: 3, z2: -3, h: 3.0 },
  // Dinding rendah halaman selatan (cover tinggi, menghalangi LOS)
  { x1: -13, z1: 2, x2: -6, z2: 3, h: 1.6 },
  { x1: 6, z1: 2, x2: 13, z2: 3, h: 1.6 },
  { x1: -13, z1: 3, x2: -12, z2: 7, h: 1.6 },
  { x1: 12, z1: 3, x2: 13, z2: 7, h: 1.6 },
];

// Cover rendah: tumpukan salju / patung es / kereta luncur. Menghalangi LOS + gerak.
export const COVERS = [
  { kind: 'snow', x: -10, z: 0, w: 2.6, d: 1.7, h: 1.1 },
  { kind: 'snow', x: 10, z: 0, w: 2.6, d: 1.7, h: 1.1 },
  { kind: 'snow', x: -9.5, z: 5.5, w: 2.4, d: 1.6, h: 1.0 },
  { kind: 'snow', x: 9.5, z: 5.5, w: 2.4, d: 1.6, h: 1.0 },
  { kind: 'snow', x: -3, z: 7.5, w: 2.2, d: 1.5, h: 1.0 },
  { kind: 'snow', x: 3, z: 7.5, w: 2.2, d: 1.5, h: 1.0 },
  { kind: 'statue', x: -6.5, z: -3.5, w: 1.5, d: 1.5, h: 2.4 },
  { kind: 'statue', x: 6.5, z: -3.5, w: 1.5, d: 1.5, h: 2.4 },
  { kind: 'statue', x: -15, z: -6, w: 1.5, d: 1.5, h: 2.4 },
  { kind: 'statue', x: 15, z: -6, w: 1.5, d: 1.5, h: 2.4 },
  { kind: 'sled', x: -15.8, z: 6, w: 2.2, d: 1.2, h: 0.8 },
  { kind: 'sled', x: 15.8, z: 6, w: 2.2, d: 1.2, h: 0.8 },
  { kind: 'snow', x: -9, z: -8.5, w: 1.8, d: 1.4, h: 0.9 },
  { kind: 'snow', x: 9, z: -8.5, w: 1.8, d: 1.4, h: 0.9 },
];

// Zona hangat obor: jejak di dalamnya meleleh 3x lebih cepat, meter deteksi turun lebih cepat.
export const WARM_ZONES = [
  { x: -8, z: 4, r: 2.4 },
  { x: 8, z: 4, r: 2.4 },
  { x: 0, z: -1, r: 2.4 },
];

export const CRYSTALS = [
  { id: 'fajar', name: 'Kristal Fajar', x: -12, z: -9.5, color: 0x7dffd4, css: '#7dffd4' },
  { id: 'senja', name: 'Kristal Senja', x: 12, z: -9.5, color: 0xb78cff, css: '#b78cff' },
  { id: 'tengah', name: 'Kristal Tengah Malam', x: 0, z: -6, color: 0x59c2ff, css: '#59c2ff' },
];

export const GUARDS = [
  {
    id: 'borin', name: 'Borin', kind: 'soldier',
    waypoints: [[-15, -5.5], [15, -5.5]],
    start: { x: -15, z: -5.5 },
  },
  {
    id: 'sigrun', name: 'Sigrun', kind: 'soldier',
    waypoints: [[-14.5, -2], [-14.5, 2]],
    start: { x: -14.5, z: -2 },
  },
  {
    id: 'haldor', name: 'Haldor', kind: 'soldier',
    waypoints: [[14.5, -2], [14.5, 2]],
    start: { x: 14.5, z: -2 },
  },
  {
    id: 'yrsa', name: 'Yrsa', kind: 'soldier',
    waypoints: [[8, 8.5], [-8, 8.5]],
    start: { x: 8, z: 8.5 },
  },
  {
    id: 'fenrir', name: 'Fenrir', kind: 'wolf',
    waypoints: [[-5, 0], [5, 0], [5, 6], [-5, 6]],
    start: { x: -5, z: 0 },
  },
];

// Rute autopilot: jalur terbuka, menghindari dinding & cover. Dipakai shot=end.
// Rute autopilot: Tengah dulu (masuk menara head-on dari selatan), lalu Senja,
// lalu Fajar lewat penyeberangan tegak lurus jalur patroli (bukan sejajar).
// Jalur pulang tidak menelusuri jalur datang yang sama.
export const AUTOPILOT_ROUTE = [
  [0, 10.5], [0, 5], [0, 0], [0, -1], [0, -2.5], [0, -6],
  [0, -2.5], [0, 0], [0, 5], [0, 8.5], [10, 8.5], [13.5, 8], [14, 6], [14, 0],
  [13, -4], [12, -9.5], [13, -4], [10, -1], [4, -1], [0, -1], [-4, -1], [-9, -2],
  [-9, -5.5], [-10, -6.5], [-11.5, -8], [-12, -9.5],
  [-11.5, -8], [-10, -6.5], [-9, -5.5], [-9, -2], [-4, 0], [0, 2], [0, 5], [0, 8],
  [0, 10.5], [0, 11.8],
];
