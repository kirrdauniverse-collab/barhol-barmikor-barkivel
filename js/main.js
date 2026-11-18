'use strict';
/* ============================================================
   Bárhol Bármikor Bárkivel — játékmotor (canvas + UI + hang)
   A szimulációs mag a js/sim.js (window.SIM).
   ============================================================ */
(function () {
  const S = window.SIM;
  const TILE = 24;
  const CW = 48, CH = 34; // csempék

  /* ---------- DOM ---------- */
  const vaszon = document.getElementById('vaszon');
  const ctx = vaszon.getContext('2d');
  const el = id => document.getElementById(id);
  const statNap = el('stat-nap'), statInsp = el('stat-inspiracio'), statFesz = el('stat-feszultseg'), statLakos = el('stat-lakos');
  const kronikaLista = el('kronika-lista'), lakokLista = el('lakok-lista');
  const kartya = el('kartya'), toastek = el('toastek');
  const epitesLista = el('epites-lista'), epitesTippek = el('epites-tippek');
  const fekete = el('fekete-fedeles'), feketeSzoveg = el('fekete-szoveg');
  const cimKepernyo = el('cim-kepernyo');
  const moddalReteg = el('moddal-reteg');

  /* ---------- állapot ---------- */
  let vilag = null;
  let elinditva = false;
  let sebesseg = 1;
  let kamera = { x: 0, y: 0, z: 1.15 };
  let kovetesId = null;
  let kijeloltId = null;
  let epitesiTipus = null;
  let egervilag = { x: 20 * TILE, y: 15 * TILE };
  let terulet = null; // offscreen terep
  let utolsoIdo = performance.now();
  let felhalmozott = 0;
  const LEPES = 0.1;
  let reszecskek = []; // {x,y,szoveg,elet}
  let szivek = [];
  let kronikaHossz = 0;
  let feketeIdozito = null;
  let aktivPointerek = new Map();
  let utsoPinchTav = 0;
  let huzas = false, huzasKezd = null, huzasCam = null;
  let utolsoHUD = {};

  /* ---------- színek ---------- */
  const RUHAK = ['#c96f6f', '#6f8fc9', '#c9a34f', '#7bb26e', '#a678c8', '#d98e5f', '#5fa8a0', '#c95f8e'];
  const BOROK = ['#f2cfae', '#e0b08e', '#c98f66', '#9c6b4a'];
  const HAJAK = ['#2f2a26', '#5a3b23', '#8a5a2b', '#c9a15a', '#3d3d45', '#7a2f2f'];
  const TETO = { lakohaz: '#a0522d', kut: '#7a8a99', tanchaz: '#b0413e', furdo: '#4a7ba6' };
  function lakoSzinek(l) {
    const h = (l.id * 2654435761) >>> 0;
    return {
      ruha: RUHAK[h % RUHAK.length],
      bor: BOROK[(h >> 3) % BOROK.length],
      haj: HAJAK[(h >> 6) % HAJAK.length],
    };
  }

  /* ---------- hang ---------- */
  const Hang = {
    ctx: null, bekapcsolva: true, idozito: null, lepes: 0,
    indit() {
      if (!this.bekapcsolva) return;
      try {
        if (!this.ctx) {
          this.ctx = new (window.AudioContext || window.webkitAudioContext)();
          this.mester = this.ctx.createGain();
          this.mester.gain.value = 0.35;
          this.mester.connect(this.ctx.destination);
          this.padG = this.ctx.createGain(); this.padG.gain.value = 0.05;
          this.padG.connect(this.mester);
          for (const f of [110, 164.8]) {
            const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
            const g = this.ctx.createGain(); g.gain.value = 0.5;
            o.connect(g); g.connect(this.padG); o.start();
          }
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
        if (!this.idozito) this.idozito = setInterval(() => this.hangjegy(), 1900);
      } catch (e) { this.bekapcsolva = false; }
    },
    leall() { if (this.idozito) { clearInterval(this.idozito); this.idozito = null; } },
    hangjegy() {
      if (!this.ctx || !this.bekapcsolva || !vilag) return;
      const ej = S.ejVan(vilag.ora);
      const skala = ej ? [220, 261.6, 311.1, 329.6, 392] : [261.6, 293.7, 329.6, 392, 440];
      this.lepes++;
      if (this.lepes % 3 === 0) return; // ritkán szól
      const f = skala[Math.floor(Math.random() * skala.length)];
      const o = this.ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.07, this.ctx.currentTime + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.4);
      o.connect(g); g.connect(this.mester);
      o.start(); o.stop(this.ctx.currentTime + 1.5);
    },
    csengo() {
      if (!this.ctx || !this.bekapcsolva) return;
      const most = this.ctx.currentTime;
      [880, 1318.5].forEach((f, i) => {
        const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, most + i * 0.09);
        g.gain.exponentialRampToValueAtTime(0.09, most + i * 0.09 + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, most + i * 0.09 + 0.9);
        o.connect(g); g.connect(this.mester);
        o.start(most + i * 0.09); o.stop(most + i * 0.09 + 1);
      });
    },
  };

  /* ---------- terep elő-renderelés ---------- */
  function terepKeszites() {
    terulet = document.createElement('canvas');
    terulet.width = CW * TILE; terulet.height = CH * TILE;
    const t = terulet.getContext('2d');
    const rng = S.mulberry32(vilag.mag + 777);
    for (let y = 0; y < CH; y++) {
      for (let x = 0; x < CW; x++) {
        const nu = 0.88 + rng() * 0.12;
        t.fillStyle = 'rgb(' + Math.round(116 * nu) + ',' + Math.round(166 * nu) + ',' + Math.round(88 * nu) + ')';
        t.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
    // ösvények: kereszt a kút körül
    t.fillStyle = '#b39a6b';
    t.fillRect(0, 17 * TILE + TILE / 2 - 6, CW * TILE, 12);
    t.fillRect(22 * TILE + TILE / 2 - 6, 8 * TILE, 12, 18 * TILE);
    // tó
    const to = vilag.to;
    t.fillStyle = '#4f7f96';
    t.beginPath();
    t.ellipse((to.x + to.szel / 2) * TILE, (to.y + to.mag / 2) * TILE, to.szel * TILE * 0.62, to.mag * TILE * 0.62, 0, 0, Math.PI * 2);
    t.fill();
    t.fillStyle = '#6da0b5';
    t.beginPath();
    t.ellipse((to.x + to.szel / 2) * TILE, (to.y + to.mag / 2) * TILE, to.szel * TILE * 0.45, to.mag * TILE * 0.42, 0, 0, Math.PI * 2);
    t.fill();
    // dekoráció
    for (const d of vilag.dekoracio) {
      const px = d.x * TILE, py = d.y * TILE;
      if (d.tipus === 'fa') {
        t.fillStyle = 'rgba(0,0,0,0.18)'; t.beginPath(); t.ellipse(px + 4, py + 18, 9, 3.5, 0, 0, Math.PI * 2); t.fill();
        t.fillStyle = '#6b4a2f'; t.fillRect(px + 2, py + 6, 4, 12);
        t.fillStyle = '#3e7a3a'; t.beginPath(); t.arc(px + 4, py + 2, 10, 0, Math.PI * 2); t.fill();
        t.fillStyle = '#4e9448'; t.beginPath(); t.arc(px - 1, py - 2, 7, 0, Math.PI * 2); t.fill();
      } else if (d.tipus === 'bo') {
        t.fillStyle = '#4e8a4a'; t.beginPath(); t.arc(px, py, 5, 0, Math.PI * 2); t.fill();
        t.fillStyle = '#5f9e58'; t.beginPath(); t.arc(px + 5, py + 2, 4, 0, Math.PI * 2); t.fill();
      } else {
        t.fillStyle = ['#e3c34f', '#d97ba0', '#e8e8e8'][Math.floor(rng() * 3)];
        t.beginPath(); t.arc(px, py, 2.2, 0, Math.PI * 2); t.fill();
      }
    }
  }

  /* ---------- koordináták ---------- */
  function vilagKepzony(wx, wy) { return { x: (wx - kamera.x) * kamera.z, y: (wy - kamera.y) * kamera.z }; }
  function kepzonyVilag(sx, sy) { return { x: sx / kamera.z + kamera.x, y: sy / kamera.z + kamera.y }; }
  function kameraSzorit() {
    const vw = vaszon.width / (window.devicePixelRatio || 1), vh = vaszon.height / (window.devicePixelRatio || 1);
    const m = 60;
    kamera.x = Math.max(-m, Math.min(CW * TILE - vw / kamera.z + m, kamera.x));
    kamera.y = Math.max(-m, Math.min(CH * TILE - vh / kamera.z + m, kamera.y));
  }

  /* ---------- átméretezés ---------- */
  function atmeretez() {
    const dpr = window.devicePixelRatio || 1;
    vaszon.width = window.innerWidth * dpr;
    vaszon.height = window.innerHeight * dpr;
    vaszon.style.width = window.innerWidth + 'px';
    vaszon.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', atmeretez);
  atmeretez();

  /* ---------- rajzolás ---------- */
  function epuletRajz(e) {
    const t = S.EPULETEK[e.tipus];
    const x = e.x * TILE, y = e.y * TILE, w = e.szel * TILE, h = e.mag * TILE;
    if (!e.epitve) {
      ctx.fillStyle = 'rgba(120,90,50,0.25)'; ctx.fillRect(x, y, w, h);
      ctx.setLineDash([6, 4]); ctx.strokeStyle = '#e8d9a0'; ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, w - 4, h - 4); ctx.setLineDash([]);
      const arany = 1 - Math.max(0, e.epitHatralevo) / 3;
      ctx.fillStyle = '#e8d9a0'; ctx.fillRect(x + 4, y + h - 8, (w - 8) * arany, 4);
      ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('🔨', x + w / 2, y + h / 2 + 2);
      return;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(x + 4, y + h - 4, w, 6);
    ctx.fillStyle = '#d9c69a'; ctx.fillRect(x + 3, y + h * 0.35, w - 6, h * 0.65 - 2);
    ctx.fillStyle = TETO[e.tipus] || '#a0522d';
    ctx.beginPath();
    ctx.moveTo(x + 1, y + h * 0.42); ctx.lineTo(x + w / 2, y + 2); ctx.lineTo(x + w - 1, y + h * 0.42);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.moveTo(x + 1, y + h * 0.42); ctx.lineTo(x + w / 2, y + 2); ctx.lineTo(x + w / 2, y + h * 0.42);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5b4632'; ctx.fillRect(x + w / 2 - 4, y + h - 12, 8, 10);
    if (kamera.z > 0.8) {
      ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(20,26,34,0.85)';
      const nev = t.ikon + ' ' + t.nev;
      const wpx = ctx.measureText(nev).width + 10;
      ctx.fillRect(x + w / 2 - wpx / 2, y - 17, wpx, 15);
      ctx.fillStyle = '#f2e9d8'; ctx.fillText(nev, x + w / 2, y - 5);
    }
  }

  const ALLAPOT_IKON = { kut: '🪣', furdo: '🛁', tanc: '🎵', beszelgetes: '💬', munka: '🔨', udvarlas: '😊', intimitas: '❤️' };

  function lakoRajz(l, ido) {
    const sz = lakoSzinek(l);
    const gy = l.eletkor === 'gyerek';
    const sk = gy ? 0.72 : 1;
    const px = l.pos.x * TILE, py = l.pos.y * TILE;
    const mozog = l.allapot === 'ut';
    const lep = mozog ? Math.sin(ido * 9 + l.id) * 1.6 : 0;
    // árnyék
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(px, py + 2, 6 * sk, 2.5 * sk, 0, 0, Math.PI * 2); ctx.fill();
    // lábak
    ctx.fillStyle = '#4a3a2a';
    ctx.fillRect(px - 3.5 * sk, py - 5 * sk, 2.4 * sk, (5 + lep) * sk);
    ctx.fillRect(px + 1.1 * sk, py - 5 * sk, 2.4 * sk, (5 - lep) * sk);
    // test
    ctx.fillStyle = sz.ruha;
    ctx.beginPath();
    const tY = py - 12 * sk;
    if (ctx.roundRect) { ctx.roundRect(px - 4.5 * sk, tY, 9 * sk, 9 * sk, 3 * sk); }
    else { ctx.rect(px - 4.5 * sk, tY, 9 * sk, 9 * sk); }
    ctx.fill();
    // fej
    ctx.fillStyle = sz.bor;
    ctx.beginPath(); ctx.arc(px, tY - 3 * sk, 4 * sk, 0, Math.PI * 2); ctx.fill();
    // haj
    ctx.fillStyle = sz.haj;
    ctx.beginPath(); ctx.arc(px, tY - 3.6 * sk, 4 * sk, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
    // euforia izzás
    if (l.euforiaOra > 0) {
      ctx.strokeStyle = 'rgba(255,220,120,0.7)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(px, py - 6 * sk, 10 * sk, 0, Math.PI * 2); ctx.stroke();
    }
    // kijelölés
    if (l.id === kijeloltId || l.id === kovetesId) {
      ctx.strokeStyle = '#ffd76e'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, py - 6 * sk, 12 * sk, 0, Math.PI * 2); ctx.stroke();
    }
    // állapot ikon
    let ikon = null;
    if (l.allapot === 'alvas') ikon = '💤';
    else if (l.allapot === 'intimitas') ikon = '❤️';
    else if (l.allapot === 'varakozas') ikon = '⏳';
    else if (l.allapot === 'tevekenyseg' && l.tevekenyseg) ikon = ALLAPOT_IKON[l.tevekenyseg.tipus] || null;
    else if (l.allapot === 'tevekenyseg' && l.tevekenyseg && l.tevekenyseg.tipus === 'udvarlas') ikon = '😊';
    if (l.allapot === 'tevekenyseg' && l.tevekenyseg && l.tevekenyseg.tipus === 'udvarlas') ikon = '😊';
    if (ikon) {
      ctx.font = Math.round(12 * Math.max(0.8, kamera.z)) + 'px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(ikon, px, tY - 12 * sk + Math.sin(ido * 3 + l.id) * 1.5);
    }
    // név
    if (kamera.z > 1.25 && (l.id === kijeloltId || l.id === kovetesId)) {
      ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = '#fff'; ctx.fillText(l.nev, px, py + 14);
    }
  }

  function ejArnyek(ora) {
    if (ora >= 21) return Math.min(0.5, (ora - 21) / 2.5 * 0.5);
    if (ora < 5) return 0.5;
    if (ora < 6.5) return 0.5 * (1 - (ora - 5) / 1.5);
    if (ora > 19.5) return 0.5 * Math.min(1, (ora - 19.5) / 1.5) * 0.6;
    return 0;
  }

  function rajzol(ido) {
    const vw = vaszon.width / (window.devicePixelRatio || 1), vh = vaszon.height / (window.devicePixelRatio || 1);
    ctx.fillStyle = '#101820'; ctx.fillRect(0, 0, vw, vh);
    if (!vilag) return;
    ctx.save();
    ctx.translate(-kamera.x * kamera.z, -kamera.y * kamera.z);
    ctx.scale(kamera.z, kamera.z);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(terulet, 0, 0);
    // épületek
    for (const e of vilag.epuletek) epuletRajz(e);
    // éjjeli lámpafény
    const arnyek = ejArnyek(vilag.ora);
    if (arnyek > 0.15) {
      for (const e of vilag.epuletek) {
        if (e.tipus !== 'tanchaz' && e.tipus !== 'furdo') continue;
        const k = S.hazKozep(e);
        const g = ctx.createRadialGradient(k.x * TILE, k.y * TILE, 4, k.x * TILE, k.y * TILE, 70);
        g.addColorStop(0, 'rgba(255,190,90,' + (0.30 * arnyek) + ')');
        g.addColorStop(1, 'rgba(255,190,90,0)');
        ctx.fillStyle = g;
        ctx.fillRect(k.x * TILE - 70, k.y * TILE - 70, 140, 140);
      }
    }
    // lakók (y szerint rendezve)
    const rendezett = vilag.lakok.slice().sort((a, b) => a.pos.y - b.pos.y);
    for (const l of rendezett) lakoRajz(l, ido);
    // szív-partikulák
    for (const szv of szivek) {
      ctx.font = '16px sans-serif'; ctx.textAlign = 'center';
      ctx.globalAlpha = Math.min(1, szv.elet / 1.5);
      ctx.fillText('❤️', szv.x * TILE, szv.y * TILE - (3 - szv.elet) * 22);
      ctx.globalAlpha = 1;
    }
    // +✨ lebegők
    ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
    for (const r of reszecskek) {
      ctx.globalAlpha = Math.min(1, r.elet / 1.2);
      ctx.fillStyle = '#ffe6a0';
      ctx.fillText(r.szoveg, r.x * TILE, r.y * TILE - (1.8 - r.elet) * 26);
      ctx.globalAlpha = 1;
    }
    // éj-sötétítés
    if (arnyek > 0) { ctx.fillStyle = 'rgba(14,20,44,' + arnyek + ')'; ctx.fillRect(kamera.x - 50, kamera.y - 50, vw / kamera.z + 100, vh / kamera.z + 100); }
    // építés szelleme
    if (epitesiTipus) {
      const t = S.EPULETEK[epitesiTipus];
      const gx = Math.floor(egervilag.x / TILE), gy = Math.floor(egervilag.y / TILE);
      const ok = S.elhelyezheto(vilag, epitesiTipus, gx, gy);
      ctx.fillStyle = ok ? 'rgba(120,220,140,0.5)' : 'rgba(230,90,90,0.5)';
      ctx.fillRect(gx * TILE, gy * TILE, t.szel * TILE, t.mag * TILE);
      ctx.strokeStyle = ok ? '#7ee0a3' : '#e66a6a'; ctx.lineWidth = 2;
      ctx.strokeRect(gx * TILE, gy * TILE, t.szel * TILE, t.mag * TILE);
    }
    ctx.restore();
  }

  /* ---------- HUD ---------- */
  function szovegHaMasik(elem, uj) { if (elem.textContent !== uj) elem.textContent = uj; }

  function hudFrissites() {
    if (!vilag) return;
    szovegHaMasik(statNap, '📅 ' + vilag.nap + '. nap ' + String(Math.floor(vilag.ora)).padStart(2, '0') + ':00');
    szovegHaMasik(statInsp, '✨ ' + Math.floor(vilag.inspiracio));
    szovegHaMasik(statFesz, '⚠️ ' + Math.round(vilag.feszultseg) + '/100');
    szovegHaMasik(statLakos, '👥 ' + vilag.lakok.length);
    if (vilag.chronika.length !== kronikaHossz) {
      for (let i = kronikaHossz; i < vilag.chronika.length; i++) {
        const c = vilag.chronika[i];
        const div = document.createElement('div');
        div.className = 'kronika-sor kronika-' + c.tipus;
        div.textContent = c.nap + '. nap — ' + c.szoveg;
        kronikaLista.prepend(div);
      }
      while (kronikaLista.children.length > 80) kronikaLista.removeChild(kronikaLista.lastChild);
      kronikaHossz = vilag.chronika.length;
    }
  }

  function allapotSzoveg(l) {
    switch (l.allapot) {
      case 'alvas': return 'Alszik 💤';
      case 'intimitas': return 'Intimitás 🌙';
      case 'varakozas': return 'Várakozik ⏳';
      case 'ut': return 'Úton van 🚶';
      case 'tevekenyseg':
        if (!l.tevekenyseg) return 'Tevékenykedik';
        return { kut: 'A kútnál 🪣', furdo: 'Fürdik 🛁', tanc: 'Táncol 🎵', beszelgetes: 'Beszélget 💬', munka: 'Munkálkodik 🔨', udvarlas: 'Udvarol 😊' }[l.tevekenyseg.tipus] || 'Tevékenykedik';
      default: return 'Pihen';
    }
  }

  function kartyaFrissites() {
    const l = S.lakoIdSzerint(vilag, kijeloltId);
    if (!l) { kartya.classList.add('rejtett'); return; }
    kartya.classList.remove('rejtett');
    const igenyNev = { eletero: 'Életerő', higienia: 'Higiénia', kapcsolodas: 'Kapcsolódás', intimitas: 'Intimitás' };
    const sorok = Object.keys(igenyNev).map(k => {
      const v = Math.round(l.igenyek[k]);
      const szin = v > 60 ? '#7ee0a3' : v > 30 ? '#ffd76e' : '#e66a6a';
      return '<div class="igeny-sor"><span>' + igenyNev[k] + '</span><div class="igeny-bar"><div style="width:' + v + '%;background:' + szin + '"></div></div><b>' + v + '</b></div>';
    }).join('');
    const partner = l.partnerId != null ? S.lakoIdSzerint(vilag, l.partnerId) : null;
    const randi = l.randival != null ? S.lakoIdSzerint(vilag, l.randival) : null;
    const kulonc = l.eletkor === 'gyerek' ? ' 👶 gyerek (' + (l.gyerekNap || 0) + '/12 nap)' : '';
    const extra = [];
    if (l.terhes) extra.push('🤰 várandós!');
    if (l.euforiaOra > 0) extra.push('✨ eufória (' + Math.ceil(l.euforiaOra) + ' ó)');
    const vKovet = kovetesId === l.id ? '📍 Követés leállítása' : '📍 Követés';
    kartya.innerHTML =
      '<div class="kartya-fej"><b>' + l.nev + kulonc + '</b><button data-mukodes="zar">&times;</button></div>' +
      '<div class="cimkek"><span class="cimke">' + (l.no ? '👩 nő' : '👨 férfi') + '</span><span class="cimke">' + l.trait + '</span><span class="cimke">' + l.erdekessegek.join(', ') + '</span></div>' +
      sorok +
      '<div class="kartya-statusz">' + allapotSzoveg(l) + (extra.length ? ' · ' + extra.join(' · ') : '') +
      (partner ? '<br>💕 Pár: ' + partner.nev : randi ? '<br>🌙 Randija: ' + randi.nev : '') + '</div>' +
      '<div class="kartya-gombok"><button data-mukodes="kovet">' + vKovet + '</button></div>';
  }

  function lakokListaFrissites() {
    if (!vilag) return;
    const ikonok = { alvas: '💤', intimitas: '❤️', varakozas: '⏳', ut: '🚶', ures: '•' };
    const html = vilag.lakok.slice().sort((a, b) => a.nev.localeCompare(b.nev, 'hu')).map(l => {
      const ik = l.allapot === 'tevekenyseg' && l.tevekenyseg ? (ALLAPOT_IKON[l.tevekenyseg.tipus] || '•') : (ikonok[l.allapot] || '•');
      return '<div class="lako-sor' + (l.id === kijeloltId ? ' kijelolt' : '') + '" data-lako="' + l.id + '">' + ik + ' ' + l.nev + (l.eletkor === 'gyerek' ? ' 👶' : '') + (l.euforiaOra > 0 ? ' ✨' : '') + '</div>';
    }).join('');
    if (utolsoHUD.lakok !== html) { lakokLista.innerHTML = html; utolsoHUD.lakok = html; }
  }

  function epitesPanelFrissites() {
    if (!vilag) return;
    let html = '';
    for (const kulcs of Object.keys(S.EPULETEK)) {
      const t = S.EPULETEK[kulcs];
      const db = vilag.epuletek.filter(e => e.tipus === kulcs).length;
      const tele = db >= t.max;
      const none = vilag.inspiracio < t.koltseg;
      html += '<button class="epites-g" data-epulet="' + kulcs + '" ' + (tele ? 'disabled' : '') + ' title="' + t.leiras + '">' +
        t.ikon + ' ' + t.nev + ' <span class="koltseg">✨' + t.koltseg + '</span> <span class="darab">' + db + '/' + t.max + '</span></button>';
    }
    if (utolsoHUD.epites !== html) {
      epitesLista.innerHTML = html;
      utolsoHUD.epites = html;
    }
  }

  /* ---------- toast + fade ---------- */
  function toast(ikon, szoveg) {
    const div = document.createElement('div');
    div.className = 'toast';
    div.innerHTML = '<span>' + ikon + '</span> ' + szoveg;
    toastek.appendChild(div);
    setTimeout(() => div.classList.add('elhal'), 3800);
    setTimeout(() => div.remove(), 4500);
    while (toastek.children.length > 4) toastek.firstChild.remove();
  }

  function fenekesSzoveg(szoveg, poz) {
    feketeSzoveg.textContent = szoveg;
    fekete.classList.add('lathato');
    if (feketeIdozito) clearTimeout(feketeIdozito);
    feketeIdozito = setTimeout(() => fekete.classList.remove('lathato'), 2600);
    if (poz) for (let i = 0; i < 8; i++) {
      szivek.push({ x: poz.x + (Math.random() * 2 - 1), y: poz.y + (Math.random() * 1.5 - 0.75), elet: 3 - i * 0.12 });
    }
    Hang.csengo();
  }

  /* ---------- kimenetek feldolgozása ---------- */
  function kimenetFeldolgoz() {
    if (!vilag || !vilag.kimenet.length) return;
    for (const ev of vilag.kimenet) {
      if (ev.tipus === 'toast') toast(ev.ikon || 'ℹ️', ev.szoveg);
      else if (ev.tipus === 'intimitas') fenekesSzoveg('🌙 ' + ev.szoveg, ev.poz);
      else if (ev.tipus === 'fenyess') reszecskek.push({ x: ev.poz.x, y: ev.poz.y, szoveg: ev.szoveg, elet: 1.8 });
    }
    vilag.kimenet.length = 0;
  }

  /* ---------- kamera ---------- */
  function kovetesLepes() {
    if (kovetesId == null) return;
    const l = S.lakoIdSzerint(vilag, kovetesId);
    if (!l) { kovetesId = null; return; }
    const vw = vaszon.width / (window.devicePixelRatio || 1), vh = vaszon.height / (window.devicePixelRatio || 1);
    const celX = l.pos.x * TILE - vw / (2 * kamera.z);
    const celY = l.pos.y * TILE - vh / (2 * kamera.z);
    kamera.x += (celX - kamera.x) * 0.12;
    kamera.y += (celY - kamera.y) * 0.12;
    kameraSzorit();
  }

  /* ---------- bemenet ---------- */
  function atvesz(vpx, vpy) {
    const r = vaszon.getBoundingClientRect();
    return { x: (vpx - r.left) * (vaszon.width / (window.devicePixelRatio || 1)) / r.width, y: (vpy - r.top) * (vaszon.height / (window.devicePixelRatio || 1)) / r.height };
  }

  vaszon.addEventListener('pointerdown', ev => {
    const p = atvesz(ev.clientX, ev.clientY);
    aktivPointerek.set(ev.pointerId, p);
    if (aktivPointerek.size === 1) { huzas = false; huzasKezd = p; huzasCam = { x: kamera.x, y: kamera.y }; }
    if (aktivPointerek.size === 2) {
      const t = [...aktivPointerek.values()];
      utsoPinchTav = Math.hypot(t[0].x - t[1].x, t[0].y - t[1].y);
    }
    try { vaszon.setPointerCapture(ev.pointerId); } catch (e) { /* szintetikus esemény */ }
  });

  vaszon.addEventListener('pointermove', ev => {
    const p = atvesz(ev.clientX, ev.clientY);
    const w = kepzonyVilag(p.x, p.y);
    egervilag = w;
    if (!aktivPointerek.has(ev.pointerId)) return;
    aktivPointerek.set(ev.pointerId, p);
    if (aktivPointerek.size === 2) {
      const t = [...aktivPointerek.values()];
      const tav = Math.hypot(t[0].x - t[1].x, t[0].y - t[1].y);
      if (utsoPinchTav > 0) zoomAt(p, kamera.z * (tav / utsoPinchTav));
      utsoPinchTav = tav;
      huzas = true;
      return;
    }
    if (huzasKezd && !epitesiTipus) {
      const dx = p.x - huzasKezd.x, dy = p.y - huzasKezd.y;
      if (Math.hypot(dx, dy) > 5) {
        huzas = true;
        kovetesId = null;
        kamera.x = huzasCam.x - dx / kamera.z;
        kamera.y = huzasCam.y - dy / kamera.z;
        kameraSzorit();
      }
    }
  });

  vaszon.addEventListener('pointerup', ev => {
    const p = atvesz(ev.clientX, ev.clientY);
    aktivPointerek.delete(ev.pointerId);
    if (aktivPointerek.size === 0 && !huzas && huzasKezd) {
      if (epitesiTipus) {
        const w = kepzonyVilag(p.x, p.y);
        const gx = Math.floor(w.x / TILE), gy = Math.floor(w.y / TILE);
        const ered = S.epuletEpites(vilag, epitesiTipus, gx, gy);
        if (ered.ok) { epitesiTipus = null; epitesTippek.classList.add('rejtett'); }
        else toast('🚫', ered.hiba);
      } else {
        kattintas(p);
      }
    }
    if (aktivPointerek.size === 0) { huzas = false; huzasKezd = null; }
  });
  vaszon.addEventListener('pointercancel', ev => { aktivPointerek.delete(ev.pointerId); huzas = false; huzasKezd = null; });

  function kattintas(p) {
    const w = kepzonyVilag(p.x, p.y);
    let legjobb = null, legjobbD = 1.7;
    for (const l of vilag.lakok) {
      const d = Math.hypot(l.pos.x - w.x, (l.pos.y - 0.5) - w.y);
      if (d < legjobbD) { legjobbD = d; legjobb = l; }
    }
    if (legjobb) { kijeloltId = legjobb.id; kartyaFrissites(); return; }
    for (const e of vilag.epuletek) {
      if (w.x >= e.x && w.x < e.x + e.szel && w.y >= e.y && w.y < e.y + e.mag) {
        const t = S.EPULETEK[e.tipus];
        toast(t.ikon, t.nev + (e.epitve ? ' — ' + t.leiras : ' — építés alatt…'));
        return;
      }
    }
    kijeloltId = null;
  }

  function zoomAt(kep, ujZ) {
    const w = kepzonyVilag(kep.x, kep.y);
    kamera.z = Math.max(0.5, Math.min(2.8, ujZ));
    kamera.x = w.x - kep.x / kamera.z;
    kamera.y = w.y - kep.y / kamera.z;
    kameraSzorit();
  }

  vaszon.addEventListener('wheel', ev => {
    ev.preventDefault();
    const p = atvesz(ev.clientX, ev.clientY);
    zoomAt(p, kamera.z * Math.exp(-ev.deltaY * 0.0012));
  }, { passive: false });

  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') { epitesiTipus = null; epitesTippek.classList.add('rejtett'); moddalReteg.classList.add('rejtett'); }
    if (ev.key === ' ') { ev.preventDefault(); sebessegBeallit(sebesseg === 0 ? 1 : 0); }
    if (ev.key === '+' || ev.key === '=') zoomAt({ x: window.innerWidth / 2, y: window.innerHeight / 2 }, kamera.z * 1.25);
    if (ev.key === '-') zoomAt({ x: window.innerWidth / 2, y: window.innerHeight / 2 }, kamera.z / 1.25);
  });

  /* ---------- gombok ---------- */
  function sebessegBeallit(s) {
    sebesseg = s;
    document.querySelectorAll('#sebesseg button').forEach(b => b.classList.toggle('aktiv', Number(b.dataset.s) === s));
  }
  document.querySelectorAll('#sebesseg button').forEach(b => b.addEventListener('click', () => sebessegBeallit(Number(b.dataset.s))));

  epitesLista.addEventListener('click', ev => {
    const gomb = ev.target.closest('[data-epulet]');
    if (!gomb || gomb.disabled) return;
    epitesiTipus = gomb.dataset.epulet;
    epitesTippek.textContent = '🏗️ ' + S.EPULETEK[epitesiTipus].nev + ' elhelyezése: kattints a térképre! (ESC = mégse)';
    epitesTippek.classList.remove('rejtett');
  });

  kartya.addEventListener('click', ev => {
    const b = ev.target.closest('[data-mukodes]');
    if (!b) return;
    if (b.dataset.mukodes === 'zar') { kijeloltId = null; kovetesId = null; }
    if (b.dataset.mukodes === 'kovet') { kovetesId = kovetesId === kijeloltId ? null : kijeloltId; }
    kartyaFrissites();
  });

  lakokLista.addEventListener('click', ev => {
    const sor = ev.target.closest('[data-lako]');
    if (!sor) return;
    kijeloltId = Number(sor.dataset.lako);
    kovetesId = kijeloltId;
    kartyaFrissites();
  });

  document.querySelectorAll('.fulek button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.fulek button').forEach(x => x.classList.remove('aktiv'));
    b.classList.add('aktiv');
    kronikaLista.classList.toggle('rejtett', b.dataset.ful !== 'kronika');
    lakokLista.classList.toggle('rejtett', b.dataset.ful !== 'lakok');
    if (b.dataset.ful === 'lakok') lakokListaFrissites();
  }));

  el('g-tech').addEventListener('click', () => { techModalFrissites(); moddalReteg.classList.remove('rejtett'); el('tech-moddal').classList.remove('rejtett'); });
  el('g-beallitasok').addEventListener('click', () => { moddalReteg.classList.remove('rejtett'); el('beallitas-moddal').classList.remove('rejtett'); });
  el('g-segites').addEventListener('click', () => { moddalReteg.classList.remove('rejtett'); el('segits-moddal').classList.remove('rejtett'); });
  moddalReteg.addEventListener('click', ev => { if (ev.target === moddalReteg) moddalReteg.classList.add('rejtett'); });
  document.querySelectorAll('[data-zar]').forEach(b => b.addEventListener('click', () => { moddalReteg.classList.add('rejtett'); document.querySelectorAll('.moddal').forEach(m => m.classList.add('rejtett')); }));

  function techModalFrissites() {
    const lista = el('tech-lista');
    lista.innerHTML = Object.keys(S.TECHNOLOGIAK).map(k => {
      const t = S.TECHNOLOGIAK[k];
      const megvan = vilag.techek[k];
      return '<div class="tech-sor"><div><b>' + t.nev + '</b><p>' + t.leiras + '</p></div>' +
        (megvan ? '<span class="tech-kesz">✔ kész</span>' : '<button data-tech="' + k + '" ' + (vilag.inspiracio < t.koltseg ? 'disabled' : '') + '>✨' + t.koltseg + '</button>') + '</div>';
    }).join('');
  }
  el('tech-lista').addEventListener('click', ev => {
    const g = ev.target.closest('[data-tech]');
    if (!g) return;
    const ered = S.techVasarlas(vilag, g.dataset.tech);
    if (ered.ok) { toast('🔬', 'Kifejlesztve!'); epitesPanelFrissites(); fesztivalGomb(); }
    else toast('🚫', ered.hiba);
    techModalFrissites();
  });

  function fesztivalGomb() {
    const g = el('g-fesztival');
    const lehet = vilag && vilag.techek.nepszokasok;
    g.disabled = !lehet || vilag.inspiracio < 20;
    g.title = lehet ? 'Fesztivál rendezése (✨20)' : 'A „Népszokások" technológia kell hozzá';
  }
  el('g-fesztival').addEventListener('click', () => {
    if (!vilag.techek.nepszokasok || vilag.inspiracio < 20) return;
    vilag.inspiracio -= 20;
    S.fesztival(vilag);
    fesztivalGomb();
  });

  // beállítások
  document.querySelectorAll('input[name="tartalom"]').forEach(r => r.addEventListener('change', () => {
    if (vilag) vilag.beallitasok.tartalom = r.value;
  }));
  el('set-nemzedek').addEventListener('change', e => { if (vilag) vilag.beallitasok.nemzedek = e.target.checked; });
  el('set-hang').addEventListener('change', e => {
    Hang.bekapcsolva = e.target.checked;
    if (Hang.bekapcsolva) Hang.indit(); else Hang.leall();
  });

  el('g-inditas').addEventListener('click', () => {
    cimKepernyo.classList.add('rejtett');
    elinditva = true;
    Hang.indit();
    toast('🌅', 'Üdv a faluban! Válassz lakót, építs, és kövesd a krónikát.');
  });

  /* ---------- fő ciklus ---------- */
  function kor(ido) {
    requestAnimationFrame(kor);
    const dt = Math.min(0.1, (ido - utolsoIdo) / 1000);
    utolsoIdo = ido;
    if (vilag && elinditva && sebesseg > 0) {
      felhalmozott += dt / 1.5 * sebesseg; // 1 óra = 1.5 mp (1×)
      let vedelem = 0;
      while (felhalmozott >= LEPES && vedelem < 40) {
        S.vilagTick(vilag, LEPES);
        felhalmozott -= LEPES;
        vedelem++;
      }
    }
    kimenetFeldolgoz();
    kovetesLepes();
    // partikulák
    for (const r of reszecskek) r.elet -= dt;
    reszecskek = reszecskek.filter(r => r.elet > 0);
    for (const szv of szivek) szv.elet -= dt;
    szivek = szivek.filter(r => r.elet > 0);
    rajzol(ido / 1000);
    hudFrissites();
    if (elinditva) {
      epitesPanelFrissites();
      fesztivalGomb();
      const lakokFulAktiv = document.querySelector('.fulek button[data-ful="lakok"]').classList.contains('aktiv');
      if (lakokFulAktiv) lakokListaFrissites();
      kartyaFrissites();
    }
  }

  /* ---------- indítás ---------- */
  vilag = S.inditFalut(20261118, { tartalom: 'romantikus', nemzedek: true });
  terepKeszites();
  epitesPanelFrissites();
  fesztivalGomb();
  // kezdő kamera a falu közepére
  const vw = vaszon.width / (window.devicePixelRatio || 1), vh = vaszon.height / (window.devicePixelRatio || 1);
  kamera.x = 24 * TILE - vw / (2 * kamera.z);
  kamera.y = 17 * TILE - vh / (2 * kamera.z);
  kameraSzorit();
  requestAnimationFrame(kor);

  /* modder / teszt horog */
  window.__BBB = {
    verzio: S.VERZIO,
    vilag() { return vilag; },
    kamera() { return kamera; },
    epites(tipus, x, y) { return S.epuletEpites(vilag, tipus, x, y); },
  };
})();
