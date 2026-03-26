/**
 * ═══════════════════════════════════════════════════
 * MINYAKITA Sampling Calculator — CORE LOGIC
 * Validated against Table 2, Table 3 (Interpolation), Table 4, and x/y Formula
 * ═══════════════════════════════════════════════════
 */

'use strict';

/* ── STATE GLOBAL ── */
const S = {
  step: 1,
  kondisi: null,
  lapisan: null,
  nKarton: null,
  nPerKarton: null,
  jenisPrimer: 'botol',
  lastResult: null,
};

function fmt(num) {
  return new Intl.NumberFormat('id-ID').format(num);
}

/* ── FUNGSI MATEMATIKA SNI ── */

/** TABEL 2: Hitung Sampel Dus yang DITARIK */
function hitungKarton(n) {
  if (!n || n < 1) return null;

  if (n > 1000) {
    let k = Math.ceil(n / 1000); 
    let base = Math.floor(n / k);
    let rem = n % k;
    
    let totalCount = 0;
    let subLots = [];

    for (let i = 0; i < k; i++) {
      let size = base + (i < rem ? 1 : 0);
      let sqrtVal = Math.ceil(Math.sqrt(size));
      
      let sCount = Math.min(sqrtVal, 30);
      let isCapped = sqrtVal > 30;
      let interval = Math.floor(size / sCount);
      
      totalCount += sCount;
      subLots.push(`Sub-lot ${i+1}: ${size} ➔ $\\sqrt{${size}}$ = ${isCapped ? '<b>30 (Max)</b>' : sCount} <br><span style="color:var(--muted); font-size:11px;">&nbsp;&nbsp;&nbsp;↳ Jeda Tarik: ${size}/${sCount} = Tiap kelipatan <b>${interval}</b></span>`);
    }

    return {
      count: totalCount,
      isSubLot: true,
      k: k,
      subLotsHtml: subLots.join('<br>')
    };
  }

  if (n <= 10)  return { count: n, interval: 1 };
  if (n <= 25)  return { count: 5, interval: Math.floor(n/5) };
  if (n <= 50)  return { count: 7, interval: Math.floor(n/7) };
  if (n <= 100) return { count: 10, interval: Math.floor(n/10) };

  const sqrt = Math.ceil(Math.sqrt(n));
  const finalCount = Math.min(sqrt, 30);
  const interval = Math.floor(n / finalCount);
  
  return {
    count: finalCount,
    interval: interval,
    sqrtExact: Math.sqrt(n)
  };
}

/** TABEL 3 & 4: Hitung x, y, dan Dus yang DIBUKA (x/y) */
function hitungPrimer(totalPopulasiPrimer, jumlahKartonDitarik, isiPerKarton) {
  
  // 1. CARI TARGET TABEL 3 (Menghasilkan Nilai x)
  const pts = [
    { n: 10000, x: 200 },
    { n: 20000, x: 250 },
    { n: 40000, x: 300 },
    { n: 60000, x: 350 }
  ];

  let x = 0; // Target Primer
  let interpolasiHtml = '';

  if (totalPopulasiPrimer <= 10000) {
    x = 200;
    interpolasiHtml = `Populasi ≤ 10.000 ➔ <b>200</b> (Batas bawah Tabel 3)`;
  } else if (totalPopulasiPrimer > 60000) {
    x = 400; 
    interpolasiHtml = `Populasi > 60.000 ➔ <b>400</b> (Batas atas Tabel 3)`;
  } else {
    for (let i = 0; i < pts.length - 1; i++) {
      let p1 = pts[i], p2 = pts[i+1];
      
      if (totalPopulasiPrimer === p1.n) {
        x = p1.x;
        interpolasiHtml = `Titik eksak Tabel 3 ➔ <b>${p1.x}</b>`;
        break;
      }
      if (totalPopulasiPrimer === p2.n) {
        x = p2.x;
        interpolasiHtml = `Titik eksak Tabel 3 ➔ <b>${p2.x}</b>`;
        break;
      }
      
      if (totalPopulasiPrimer > p1.n && totalPopulasiPrimer < p2.n) {
        let exact = p1.x + ((totalPopulasiPrimer - p1.n) / (p2.n - p1.n)) * (p2.x - p1.x);
        x = Math.ceil(exact); 
        
        interpolasiHtml = `
          <div style="margin-bottom:6px">Interpolasi dari rentang ${fmt(p1.n)} dan ${fmt(p2.n)}:</div>
          <div class="frac-box" style="background:#fff; padding:6px 10px; border-radius:6px; border:1px solid #e2e8f0; color:#1e293b; font-size:11px;">
            <span>${p1.x} + </span>
            <span class="frac-col">
              <span class="frac-top">${fmt(totalPopulasiPrimer)} - ${fmt(p1.n)}</span>
              <span class="frac-bot">${fmt(p2.n)} - ${fmt(p1.n)}</span>
            </span>
            <span> × (${p2.x} - ${p1.x})</span>
            <span style="margin-left:8px;"> = <b>${exact.toFixed(2)}</b> ➔ <b>${x}</b></span>
          </div>
        `;
        break;
      }
    }
  }

  // 2. LIMITASI TABEL 4 (Menghasilkan Nilai y)
  let y = isiPerKarton; 
  if (isiPerKarton < 12) y = isiPerKarton;
  else if (isiPerKarton >= 12 && isiPerKarton <= 24) y = 10;
  else if (isiPerKarton > 24) y = 16;

  // 3. RUMUS DUS DIBUKA (x / y)
  let exactBuka = x / y;
  let dusDibuka = Math.ceil(exactBuka);
  
  // Notifikasi jika dus yang harus dibuka melebihi dus yang ditarik dari tabel 2
  let warningHtml = '';
  if (dusDibuka > jumlahKartonDitarik) {
    warningHtml = `<div style="color:#dc2626; font-weight:700; margin-top:8px; background:#fef2f2; padding:8px; border-radius:6px; border:1px solid #fecaca;">⚠️ Peringatan: Dus yang harus dibuka (${dusDibuka}) melebihi dus sampel yang ditarik (${jumlahKartonDitarik}). Anda harus menarik tambahan ${dusDibuka - jumlahKartonDitarik} dus dari lot.</div>`;
  }

  let finalHtml = `
    <div style="margin-bottom:6px;">${interpolasiHtml}</div>
    <div style="margin-top:12px; border-top:1px dashed #cbd5e1; padding-top:12px;">
      <div style="margin-bottom:6px; font-weight:700; color:#b45309;">Integrasi Eksekusi x/y:</div>
      <ul style="padding-left:16px; margin-bottom:0;">
        <li><b>Nilai x</b> (Target Primer) = <b>${x}</b>.</li>
        <li><b>Nilai y</b> (Batas Tabel 4) = <b>${y}</b>.</li>
        <li style="margin-top:6px; color:#1d4ed8; font-weight:700;">Dus Dibuka (x/y) = ${x} / ${y} = ${exactBuka.toFixed(2)} ➔ ${dusDibuka} Dus.</li>
      </ul>
      ${warningHtml}
    </div>
  `;

  return {
    x: x,
    y: y,
    dusDibuka: dusDibuka,
    calcHtml: finalHtml
  };
}

/* ── UI ENGINE ── */
function render() {
  const root = document.getElementById('app-root');
  root.innerHTML = '';
  const w = document.createElement('div');
  w.className = 'wizard-card';

  let indHTML = `<div class="step-indicator">`;
  for(let i=0; i<3; i++){
    indHTML += `<div class="step-dot ${S.step >= i+1 ? 'active' : ''}">${i+1}</div>`;
    if(i<2) indHTML += `<div class="step-line"></div>`;
  }
  indHTML += `</div>`;
  w.innerHTML = indHTML;

  const content = document.createElement('div');
  if (S.step === 1) content.appendChild(renderStep1());
  if (S.step === 2) content.appendChild(renderStep2());
  if (S.step === 3) content.appendChild(renderStep3());
  w.appendChild(content);

  root.appendChild(w);
}

function renderStep1() {
  const c = document.createElement('div');
  c.innerHTML = `
    <div class="step-title">Langkah 1: Kondisi Tumpukan</div>
    <div class="step-desc">Pilih kondisi tumpukan karton saat pemeriksaan.</div>
    <div class="option-grid">
      <div class="option-btn ${S.kondisi==='ideal'?'selected':''}" onclick="S.kondisi='ideal';S.lapisan=null;render()">
        <div class="opt-title">Akses Ideal (4 Sisi)</div>
        <div class="opt-desc">Dapat diakses dari semua sisi secara bebas.</div>
      </div>
      <div class="option-btn ${S.kondisi==='rapat'?'selected':''}" onclick="S.kondisi='rapat';render()">
        <div class="opt-title">Akses Terbatas</div>
        <div class="opt-desc">Merapat ke dinding / tumpukan di sampingnya.</div>
      </div>
    </div>
  `;
  if (S.kondisi === 'rapat') {
    c.innerHTML += `
      <div style="margin-top:20px;">
        <label>Berapa lapisan (layer) yang dapat diakses secara fisik?</label>
        <div class="option-grid">
          <div class="option-btn ${S.lapisan===1?'selected':''}" onclick="S.lapisan=1;render()">1 Lapisan</div>
          <div class="option-btn ${S.lapisan===2?'selected':''}" onclick="S.lapisan=2;render()">2 Lapisan</div>
          <div class="option-btn ${S.lapisan===3?'selected':''}" onclick="S.lapisan=3;render()">3 Lapisan</div>
          <div class="option-btn ${S.lapisan===4?'selected':''}" onclick="S.lapisan=4;render()">4 Lapisan</div>
        </div>
      </div>
    `;
  }
  if (S.kondisi === 'ideal' || (S.kondisi === 'rapat' && S.lapisan)) {
    c.innerHTML += `<button class="btn btn-primary" style="margin-top:24px" onclick="S.step=2;render()">Lanjut →</button>`;
  }
  return c;
}

function renderStep2() {
  const c = document.createElement('div');
  c.innerHTML = `
    <div class="step-title">Langkah 2: Ukuran Populasi (Lot)</div>
    <div class="step-desc">Masukkan jumlah total kemasan pada tumpukan.</div>
    <div class="form-group">
      <label>1. Total jumlah karton (kemasan sekunder) di lot/tanding:</label>
      <input type="number" id="inp-karton" placeholder="Contoh: 1500" value="${S.nKarton||''}">
    </div>
    <div class="form-group">
      <label>2. Jenis kemasan primer di dalam karton:</label>
      <select id="inp-jenis">
        <option value="botol" ${S.jenisPrimer==='botol'?'selected':''}>Botol</option>
        <option value="pouch" ${S.jenisPrimer==='pouch'?'selected':''}>Pouch (Bantal)</option>
        <option value="jerigen" ${S.jenisPrimer==='jerigen'?'selected':''}>Jerigen</option>
      </select>
    </div>
    <div class="form-group">
      <label>3. Jumlah kemasan primer di dalam 1 karton:</label>
      <input type="number" id="inp-perkarton" placeholder="Contoh: 12" value="${S.nPerKarton||''}">
    </div>
    <button class="btn btn-primary" onclick="processStep2()">Hitung Sampel Uji ✓</button>
    <button class="btn btn-secondary" onclick="S.step=1;render()">← Kembali</button>
  `;
  return c;
}

function processStep2() {
  const nk = parseInt(document.getElementById('inp-karton').value);
  const np = parseInt(document.getElementById('inp-perkarton').value);
  const jp = document.getElementById('inp-jenis').value;

  if (!nk || nk < 1 || !np || np < 1) {
    alert('Mohon masukkan angka yang valid (> 0).'); return;
  }
  S.nKarton = nk; S.nPerKarton = np; S.jenisPrimer = jp; S.step = 3;
  render();
}

function renderStep3() {
  const nK = S.nKarton; const nP = S.nPerKarton; const jp = S.jenisPrimer;
  const rK = hitungKarton(nK);
  const totalPopulasiPrimer = nK * nP;
  const rP = hitungPrimer(totalPopulasiPrimer, rK.count, nP);

  let kartonHtml = '';
  if (rK.isSubLot) {
    kartonHtml = `
      <div class="pdf-math-row"><div class="pmr-key">Aturan (> 1000)</div><div class="pmr-val">Dibagi ${rK.k} Tanding/Sub-lot</div></div>
      <div class="pdf-math-row" style="background:#fff; padding:8px; border-radius:6px; align-items:flex-start;">
        <div style="text-align:left; line-height:1.6; font-family:monospace; width:100%;">${rK.subLotsHtml}</div>
      </div>
      <div class="pdf-math-row"><div class="pmr-key">Total Kardus DITARIK</div><div class="pmr-val" style="font-size:16px;"><b>${rK.count}</b></div></div>
    `;
  } else if (rK.sqrtExact !== undefined) {
    kartonHtml = `
      <div class="pdf-math-row"><div class="pmr-key">Aturan SNI</div><div class="pmr-val" style="text-align:right;">Akar Pangkat Dua ${rK.count === 30 ? '<br><span style="color:#d97706; font-size:10px;">(Dibatasi Maks 30)</span>' : ''}</div></div>
      <div class="pdf-math-row"><div class="pmr-key">Perhitungan</div><div class="pmr-val">√${fmt(nK)} = ${rK.sqrtExact.toFixed(2)} ➔ <b>${rK.count}</b></div></div>
      <div class="pdf-math-row"><div class="pmr-key">Interval Tarik</div><div class="pmr-val">${fmt(nK)} / ${rK.count} ➔ Ambil tiap kelipatan <b>${rK.interval}</b></div></div>
    `;
  } else {
    kartonHtml = `
      <div class="pdf-math-row"><div class="pmr-key">Aturan SNI</div><div class="pmr-val">Tabel 2 (Populasi Kecil)</div></div>
      <div class="pdf-math-row"><div class="pmr-key">Kardus DITARIK</div><div class="pmr-val"><b>${rK.count}</b></div></div>
      <div class="pdf-math-row"><div class="pmr-key">Interval Tarik</div><div class="pmr-val">${fmt(nK)} / ${rK.count} ➔ Ambil tiap kelipatan <b>${rK.interval}</b></div></div>
    `;
  }

  const c = document.createElement('div');
  c.innerHTML = `
    <div class="step-title">Langkah 3: Hasil Sampling & Eksekusi Lapangan</div>
    <div class="step-desc">Telah memisahkan secara jelas mana yang ditarik (Tabel 2) dan mana yang dibuka (x/y).</div>
    
    <div class="res-box">
      <div class="res-title">1. Tarik Dus dari Lot (Tabel 2)</div>
      <div class="res-val">${fmt(rK.count)} <span style="font-size:16px; font-weight:600; color:var(--muted)">kardus</span></div>
      <div class="res-sub">TARIK/PISAHKAN dari total tumpukan ${fmt(nK)} kardus secara acak.</div>
      <div class="calc-detail">${kartonHtml}</div>
    </div>

    <div class="res-box final">
      <div class="res-title">2. Kardus Dibuka & Eksekusi Primer (Rumus x/y)</div>
      <div class="res-val">${fmt(rP.dusDibuka)} <span style="font-size:16px; font-weight:600; color:#14532d">kardus dibuka</span></div>
      <div class="res-sub">Ambil <b>maksimal ${rP.y} ${jp}</b> dari setiap kardus yang dibuka hingga mencapai total sampel primer sejumlah <b>${fmt(rP.x)} ${jp}</b>.</div>
      <div class="calc-detail">
        <div class="pdf-math-row"><div class="pmr-key">Total Populasi Primer</div><div class="pmr-val">${fmt(totalPopulasiPrimer)} ${jp}</div></div>
        <div class="pdf-math-row" style="flex-direction: column; align-items:flex-start; margin-top:8px;">
          <div class="pmr-key" style="margin-bottom:8px;">Metode Perhitungan x/y:</div>
          <div class="pmr-val" style="text-align:left; font-size:11px; width:100%; font-family:inherit; font-weight:normal;">${rP.calcHtml}</div>
        </div>
      </div>
    </div>

    <div class="summary-text" style="background:#fefce8; border-color:#fef08a; color:#854d0e;">
      <b>Instruksi Operasional QC:</b><br>
      Tarik <strong>${rK.count} dus</strong> dari tumpukan sesuai interval. Dari kumpulan tersebut, <strong>buka ${rP.dusDibuka} dus</strong> di antaranya. Selanjutnya ambil tepat <strong>${rP.y} ${jp}</strong> per dus sampai terkumpul tepat <strong>${rP.x} ${jp}</strong> untuk pemeriksaan visual.
    </div>

    <div class="pdf-action-row" style="margin-top:24px;">
      <button class="btn btn-pdf" id="btn-pdf" onclick="exportPDF()">⬇ Unduh Laporan Audit (PDF)</button>
    </div>
    
    <button class="btn-reset" style="margin-top:16px" onclick="resetWizard()">← Hitung Ulang</button>
  `;

  S.lastResult = { nK, nP, jp, totalPopulasiPrimer, rK, rP };
  return c;
}

function resetWizard() {
  S.step = 1; S.kondisi = S.lapisan = S.nKarton = S.nPerKarton = S.lastResult = null;
  S.jenisPrimer = 'botol'; render();
}

function showRef(btn, id) {
  document.querySelectorAll('.rt-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.rt-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  btn.classList.add('active');
}

// Init App Load
render();
