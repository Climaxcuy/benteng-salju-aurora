# BENTENG SALJU — Curi 3 Kristal Aurora di Tengah Badai

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/Climaxcuy/benteng-salju-aurora/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/Climaxcuy/benteng-salju-aurora/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

Game stealth 3D (Three.js) di benteng salju di bawah aurora. Curi **Kristal Fajar**,
**Kristal Senja**, dan **Kristal Tengah Malam** dari menara benteng, lalu capai gerbang
**EXIT** di selatan — tanpa tertangkap 4 prajurit salju dan **Fenrir**, serigala putih
yang cepat.

## Mekanik khas

- **Badai salju berkala** — tiap ~25 detik badai datang beberapa detik: cone pandang
  semua penjaga memendek dan laju deteksi turun. Saatnya bergerak!
- **Jejak kaki di salju** — jejakmu tertinggal dan memudar perlahan; penjaga yang
  menemukan jejak segar akan mengikutinya. Berdiri di dekat **obor pemanas** (cincin
  oranye) untuk melelehkan jejak 3x lebih cepat dan menurunkan meter deteksi.
- **Lempar bola salju (Q, 3x)** — pengalih: penjaga terdekat menyelidiki titik
  pendaratannya.

## Sistem stealth

Patroli → curiga (?) → kejar (!) → cari → patroli. Cone visi bervolume: kuning saat
patroli, oranye saat curiga, merah saat mengejar. Meter deteksi terisi saat kau
terlihat di dalam cone; sembunyi di balik tumpukan salju, patung es, dan kereta
luncur untuk memulihkannya. Ketahuan 0 kali + waktu cepat = Grade S.

## Kontrol

| Tombol | Aksi |
|---|---|
| WASD / panah | Gerak |
| Shift | Menyelinap (lambat, sunyi) |
| E | Ambil kristal |
| Q | Lempar bola salju (pengalih) |
| R | Ulang |
| M | Suara hidup/mati |
| Enter | Mulai / main lagi |

## Cara jalan

Buka `game/index.html` di browser (butuh server HTTP statis lokal karena modul ES,
mis. `python3 -m http.server` dari folder repo, lalu buka
`http://localhost:8000/game/index.html`). Semua suara disintesis WebAudio — tanpa
file audio eksternal. Three.js di-vendor di `game/vendor/three.min.js`.

## Screenshot deterministik

`game/index.html?shot=start` (judul), `?shot=play` (tengah permainan),
`?shot=climax` (badai + pengejaran), `?shot=end` (autopilot memainkan aturan asli
dari state segar sampai menang — Grade S, 44,9 detik, 0 ketahuan).

## Lisensi

MIT — lihat `LICENSE`.
