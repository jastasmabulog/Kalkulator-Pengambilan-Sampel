/**
 * ═══════════════════════════════════════════════════
 * MINYAKITA Sampling Calculator — PDF EXPORT
 * Requires: html2canvas & jsPDF loaded in index.html
 * ═══════════════════════════════════════════════════
 */

'use strict';

function buildPDFTemplate(r) {
  const now = new Date();
  const tgl = now.toLocaleDateString('id-ID', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  const jam = now.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });

  let mathKarton = '';
  if (r.rK.isSubLot) {
     mathKarton = `
      <div class="pdf-math-row"><div class="pmr-key">Aturan SNI (> 1000 Karton)</div><div class="pmr-val">Dibagi merata menjadi ${r.rK.k} tanding</div></div>
      <div class="pdf-math-row" style="flex-direction:column; align-items:flex-end;">
        <div class="pmr-key" style="margin-bottom:4px; width:100%;">Detail Sub-lot:</div>
        <div class="pmr-val" style="font-size:10px; text-align:right;">${r.rK.subLotsHtml}</div>
      </div>
      <div class="pdf-math-row"><div class="pmr-key">Total Kardus Ditarik</div><div class="pmr-val">${r.rK.count} Kardus</div></div>
     `;
  } else if (r.rK.sqrtExact !== undefined) {
    mathKarton = `
      <div class="pdf-math-row"><div class="pmr-key">Aturan Tabel 2 (>100)</div><div class="pmr-val">Akar Pangkat Dua ${r.rK.count === 30 ? '(Limit 30)' : ''}</div></div>
      <div class="pdf-math-row"><div class="pmr-key">Perhitungan</div><div class="pmr-val">√${fmt(r.nK)} = ${r.rK.sqrtExact.toFixed(4)} ➔ ${r.rK.count}</div></div>
      <div class="pdf-math-row"><div class="pmr-key">Interval Acak Tarik</div><div class="pmr-val">${fmt(r.nK)} / ${r.rK.count} ➔ Ambil kelipatan ${r.rK.interval}</div></div>
    `;
  } else {
    mathKarton = `
      <div class="pdf-math-row"><div class="pmr-key">Aturan Tabel 2</div><div class="pmr-val">Sampel Eksak (Populasi Kecil)</div></div>
      <div class="pdf-math-row"><div class="pmr-key">Total Kardus Ditarik</div><div class="pmr-val">${r.rK.count} Kardus</div></div>
      <div class="pdf-math-row"><div class="pmr-key">Interval Acak Tarik</div><div class="pmr-val">${fmt(r.nK)} / ${r.rK.count} ➔ Ambil kelipatan ${r.rK.interval}</div></div>
    `;
  }

  return `
    <div class="pdf-page">
      <div class="pdf-header">
        <div>
          <div class="pdf-title">Laporan Kalkulasi Sampling</div>
          <div class="pdf-subtitle">Pemeriksaan Kemasan MINYAKITA berdasarkan SNI 19-0428-1998</div>
        </div>
        <div class="pdf-meta">Tanggal: ${tgl}<br>Jam: ${jam}</div>
      </div>

      <div class="pdf-section">
        <div class="pdf-stitle">A. Data Lot (Populasi)</div>
        <div class="pdf-grid">
          <div class="pdf-card">
            <div class="pdf-card-val">${fmt(r.nK)}</div><div class="pdf-card-lbl">Kardus (Kemasan Sekunder)</div>
          </div>
          <div class="pdf-card">
            <div class="pdf-card-val">${r.nP}</div><div class="pdf-card-lbl">${r.jp} per Kardus</div>
          </div>
        </div>
      </div>

      <div class="pdf-section">
        <div class="pdf-stitle">B. Sampel Sekunder (Dus Ditarik - Tabel 2)</div>
        <div class="pdf-card" style="margin-bottom:12px">
          <div class="pdf-card-val" style="color:#1d4ed8;">Tarik ${fmt(r.rK.count)} Kardus</div>
          <div class="pdf-card-lbl">Dipisahkan dari populasi mengikuti interval jeda secara acak</div>
        </div>
        <div class="pdf-card">${mathKarton}</div>
      </div>

      <div class="pdf-section">
        <div class="pdf-stitle">C. Sampel Primer (Dus Dibuka - Rumus x/y)</div>
        <div class="pdf-card" style="margin-bottom:12px; background:#f0fdf4; border-color:#86efac;">
          <div class="pdf-card-val" style="color:#166534;">Buka ${fmt(r.rP.dusDibuka)} Kardus</div>
          <div class="pdf-card-lbl">Diambil dari ${r.rK.count} kardus yang ditarik, untuk mendapatkan target <b>${fmt(r.rP.x)} ${r.jp}</b>.</div>
        </div>
        <div class="pdf-card">
          <div class="pdf-math-row"><div class="pmr-key">Populasi Primer Total</div><div class="pmr-val">${fmt(r.totalPopulasiPrimer)} ${r.jp}</div></div>
          <div class="pdf-math-row" style="flex-direction:column; align-items:flex-start; margin-top:8px;">
            <div class="pmr-key" style="margin-bottom:4px;">Metode Perhitungan x/y (Tabel 3 & 4):</div>
            <div class="pmr-val" style="font-size:10px; text-align:left; font-weight:normal;">${r.rP.calcHtml}</div>
          </div>
        </div>
      </div>

      <div class="pdf-summary" style="background:#fefce8; border-color:#fef08a; color:#854d0e;">
        <strong>Instruksi Eksekusi QC:</strong> Tarik <strong>${fmt(r.rK.count)} kardus</strong> dari tumpukan. Dari kumpulan tersebut, <strong>buka ${r.rP.dusDibuka} kardus</strong>. Selanjutnya ambil <strong>${r.rP.y} ${r.jp}</strong> dari dalam masing-masing kardus yang dibuka hingga memenuhi total target <strong>${fmt(r.rP.x)} ${r.jp}</strong> untuk pengujian.
      </div>
    </div>
  `;
}

async function exportPDF() {
  const btn = document.getElementById('btn-pdf');
  const oriText = btn.innerText;
  btn.innerText = '⏳ Membuat PDF...';
  btn.disabled = true;

  try {
    const r = S.lastResult;
    const templateContainer = document.getElementById('pdf-template');
    templateContainer.innerHTML = buildPDFTemplate(r);

    const element = templateContainer.firstElementChild;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      windowHeight: element.scrollHeight,
      height: element.scrollHeight,
    });

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const A4_W_MM = 210, A4_H_MM = 297;

    const imgWidthMM = A4_W_MM;
    const imgHeightMM = (canvas.height * imgWidthMM) / canvas.width;

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    // Selalu 1 halaman — scale down jika konten lebih tinggi dari A4
    doc.addImage(imgData, 'JPEG', 0, 0, imgWidthMM, Math.min(imgHeightMM, A4_H_MM));

    doc.save(`Audit_SNI0428_${fmt(r.nK)}_Kardus.pdf`);
  } catch (e) {
    console.error(e);
    alert('Gagal membuat PDF. Coba lagi.');
  } finally {
    btn.innerText = oriText;
    btn.disabled = false;
    document.getElementById('pdf-template').innerHTML = '';
  }
}
