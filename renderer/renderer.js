/**
 * renderer.js – UI logic for the Solina Power Tracker renderer process.
 *
 * Communicates with the main process exclusively through window.solina
 * (defined in preload.js via contextBridge).
 */

// ── Palette (mirrors CSS variables for canvas drawing) ────────────────────────
const P = {
  bg:      '#1B4332',
  card:    '#2D6A4F',
  cardHi:  '#40916C',
  accent:  '#52B788',
  pale:    '#95D5B2',
  text:    '#D8F3DC',
  warn:    '#F4A261',
  danger:  '#E76F51',
};

// ── State ─────────────────────────────────────────────────────────────────────
let countdown  = 0;
let monitoring = true;
let settings   = {};
let lastBattInfo = null;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const $  = id => document.getElementById(id);

const clockLabel    = $('clock-label');
const dateLabel     = $('date-label');
const battCanvas    = $('batt-canvas');
const battPct       = $('batt-pct');
const battStatus    = $('batt-status');
const battTime      = $('batt-time');
const kwhValue      = $('kwh-value');
const kwhWh         = $('kwh-wh');
const co2Value      = $('co2-value');
const co2Intensity  = $('co2-intensity');
const chartCanvas   = $('chart-canvas');
const historyBody   = $('history-body');
const statusDot     = $('status-dot');
const statusText    = $('status-text');
const nextText      = $('next-text');
const btnToggle     = $('btn-toggle');
const btnNow        = $('btn-now');
const btnSettings   = $('btn-settings');
const modalOverlay  = $('modal-overlay');
const btnCancel     = $('btn-cancel');
const btnSave       = $('btn-save');

// ── Clock ─────────────────────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  clockLabel.textContent = now.toLocaleTimeString();
  dateLabel.textContent  = now.toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  if (monitoring && countdown > 0) {
    countdown--;
    nextText.textContent = `Next reading in ${countdown}s`;
  }
  setTimeout(updateClock, 1000);
}

// ── Battery card ──────────────────────────────────────────────────────────────
function updateBattCard(info) {
  lastBattInfo = info;
  if (!info) {
    battPct.textContent    = 'N/A';
    battStatus.textContent = 'No battery detected';
    battTime.textContent   = 'Running on AC / VM';
    battPct.style.color    = P.pale;
    drawBatteryCanvas(null);
    return;
  }

  const pct = info.percent;
  const color = pct > 60 ? P.accent : (pct > 20 ? P.warn : P.danger);
  battPct.textContent    = `${pct.toFixed(0)}%`;
  battPct.style.color    = color;
  battStatus.textContent = info.isPlugged ? '⚡ Charging' : '🔋 Discharging';
  battStatus.style.color = info.isPlugged ? P.warn : P.pale;

  if (info.secondsLeft) {
    const h = Math.floor(info.secondsLeft / 3600);
    const m = Math.floor((info.secondsLeft % 3600) / 60);
    battTime.textContent = `${h}h ${String(m).padStart(2,'0')}m remaining`;
  } else {
    battTime.textContent = info.isPlugged ? 'Plugged in' : '';
  }

  drawBatteryCanvas(info);
}

function drawBatteryCanvas(info) {
  const canvas = battCanvas;
  // Resize canvas to its CSS size
  canvas.width  = canvas.offsetWidth  || 200;
  canvas.height = canvas.offsetHeight || 48;
  const ctx = canvas.getContext('2d');
  const cw = canvas.width, ch = canvas.height;
  ctx.clearRect(0, 0, cw, ch);

  if (!info) {
    ctx.fillStyle = P.pale;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No battery', cw / 2, ch / 2 + 4);
    return;
  }

  const margin = 8, tipW = 8, tipH = Math.round(ch * 0.38);
  const bx1 = margin, by1 = 4;
  const bx2 = cw - margin - tipW - 3, by2 = ch - 4;
  const pct = info.percent;
  const fillColor = pct > 60 ? P.accent : (pct > 20 ? P.warn : P.danger);

  // Fill
  const innerW = bx2 - bx1 - 4;
  const fillW  = Math.max(0, innerW * pct / 100);
  ctx.fillStyle = fillColor;
  ctx.fillRect(bx1 + 2, by1 + 2, fillW, by2 - by1 - 4);

  // Outline
  ctx.strokeStyle = P.pale;
  ctx.lineWidth   = 2;
  ctx.strokeRect(bx1, by1, bx2 - bx1, by2 - by1);

  // Terminal nub
  const tipTop = ch / 2 - tipH / 2;
  ctx.fillStyle = P.pale;
  ctx.fillRect(bx2 + 2, tipTop, tipW, tipH);

  // Charging bolt
  if (info.isPlugged) {
    ctx.font      = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = P.warn;
    ctx.fillText('⚡', (bx1 + bx2) / 2, (by1 + by2) / 2 + 7);
  }
}

// ── kWh / CO₂ cards ───────────────────────────────────────────────────────────
async function refreshKwhCo2() {
  const kwh = await window.solina.getDailyKwh();
  const cfg = settings;
  const co2 = Math.max(0, kwh * (cfg.co2GramsPerKwh || 233));

  kwhValue.textContent   = kwh.toFixed(3);
  kwhWh.textContent      = `${(kwh * 1000).toFixed(2)} Wh`;
  co2Value.textContent   = co2.toFixed(1);
  co2Intensity.textContent = `@ ${(cfg.co2GramsPerKwh || 233).toFixed(0)} g/kWh grid intensity`;
}

// ── Hourly chart ──────────────────────────────────────────────────────────────
async function refreshChart() {
  const data = await window.solina.getHourlyBreakdown();
  drawChart(data);
}

function drawChart(data) {
  const canvas = chartCanvas;
  canvas.width  = canvas.offsetWidth  || 600;
  canvas.height = canvas.offsetHeight || 120;
  const ctx = canvas.getContext('2d');
  const cw = canvas.width, ch = canvas.height;
  ctx.clearRect(0, 0, cw, ch);

  const PAD = { l: 52, r: 8, t: 10, b: 26 };
  const plotW = cw - PAD.l - PAD.r;
  const plotH = ch - PAD.t - PAD.b;

  // Grid lines
  ctx.strokeStyle = P.cardHi;
  ctx.setLineDash([2, 4]);
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const gy = PAD.t + (plotH * i / 4);
    ctx.beginPath(); ctx.moveTo(PAD.l, gy); ctx.lineTo(cw - PAD.r, gy); ctx.stroke();
  }
  ctx.setLineDash([]);

  if (!data || !data.length) {
    ctx.fillStyle = P.pale;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No readings yet today', cw / 2, ch / 2);
    return;
  }

  const hourMap = {};
  let maxKwh = 0;
  data.forEach(d => { hourMap[d.hour] = d.kwh; if (d.kwh > maxKwh) maxKwh = d.kwh; });
  if (maxKwh === 0) maxKwh = 0.001;

  const slotW = plotW / 24;
  const barW  = Math.max(4, slotW - 2);

  for (let hour = 0; hour < 24; hour++) {
    const kwh = hourMap[hour] || 0;
    if (kwh <= 0) continue;
    const bx = PAD.l + hour * slotW + (slotW - barW) / 2;
    const bh = (kwh / maxKwh) * plotH * 0.92;
    const by = PAD.t + plotH - bh;

    ctx.fillStyle   = P.accent;
    ctx.strokeStyle = P.pale;
    ctx.lineWidth   = 0.8;
    ctx.beginPath();
    ctx.roundRect(bx, by, barW, bh, 2);
    ctx.fill(); ctx.stroke();

    if (bh > 14) {
      ctx.fillStyle = P.text;
      ctx.font = '6px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(kwh.toFixed(3), bx + barW / 2, by - 3);
    }
  }

  // X-axis labels (every 3 h)
  ctx.fillStyle = P.pale;
  ctx.font = '8px sans-serif';
  ctx.textAlign = 'center';
  for (let h = 0; h < 24; h += 3) {
    const lx = PAD.l + h * slotW + slotW / 2;
    ctx.fillText(`${String(h).padStart(2,'0')}h`, lx, PAD.t + plotH + 16);
  }

  // Y-axis
  ctx.textAlign = 'right';
  ctx.fillText(maxKwh.toFixed(3), PAD.l - 4, PAD.t + 6);
  ctx.fillText('0.000',            PAD.l - 4, PAD.t + plotH);
  ctx.save();
  ctx.translate(10, PAD.t + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('kWh', 0, 0);
  ctx.restore();
}

// ── History table ─────────────────────────────────────────────────────────────
async function refreshHistory() {
  const rows = await window.solina.getRecentReadings(20);
  historyBody.innerHTML = rows.map(r => {
    const ts     = r.timestamp.replace('T', ' ').slice(0, 19);
    const pct    = `${parseFloat(r.batteryPercent).toFixed(1)}%`;
    const status = r.isPlugged ? '⚡ Charging' : '🔋 Discharging';
    const wh     = parseFloat(r.energyDeltaWh).toFixed(3);
    return `<tr><td>${ts}</td><td>${pct}</td><td>${status}</td><td>${wh}</td></tr>`;
  }).join('');
}

// ── Full refresh ──────────────────────────────────────────────────────────────
async function refreshAll() {
  await Promise.all([refreshKwhCo2(), refreshChart(), refreshHistory()]);
}

// ── Event listeners ───────────────────────────────────────────────────────────
window.solina.onReadingTaken(async ({ info }) => {
  updateBattCard(info);
  await refreshAll();
  const cfg = settings || {};
  countdown = cfg.pollIntervalSeconds || 300;
});

window.solina.onMonitoringStatus(({ monitoring: m }) => {
  monitoring = m;
  statusDot.style.color    = m ? P.accent : P.warn;
  statusText.textContent   = m ? 'Monitoring active' : 'Monitoring paused';
  btnToggle.textContent    = m ? '⏸ Pause' : '▶ Resume';
  if (!m) nextText.textContent = '';
});

btnToggle.addEventListener('click', () => window.solina.toggleMonitoring());

btnNow.addEventListener('click', async () => {
  btnNow.disabled = true;
  btnNow.textContent = 'Reading…';
  await window.solina.takeReadingNow();
  btnNow.textContent = 'Read Now';
  btnNow.disabled = false;
});

btnSettings.addEventListener('click', async () => {
  const cfg = await window.solina.getSettings();
  $('s-device').value   = cfg.deviceName         || '';
  $('s-capacity').value = cfg.batteryCapacityWh   || 50;
  $('s-interval').value = cfg.pollIntervalSeconds || 300;
  $('s-co2').value      = cfg.co2GramsPerKwh      || 233;
  modalOverlay.classList.add('open');
});

btnCancel.addEventListener('click', () => modalOverlay.classList.remove('open'));

btnSave.addEventListener('click', async () => {
  const deviceName         = $('s-device').value.trim();
  const batteryCapacityWh  = parseFloat($('s-capacity').value);
  const pollIntervalSeconds= parseInt($('s-interval').value, 10);
  const co2GramsPerKwh     = parseFloat($('s-co2').value);

  if (!deviceName || isNaN(batteryCapacityWh) || isNaN(pollIntervalSeconds) || isNaN(co2GramsPerKwh)) {
    alert('Please fill all fields with valid values.');
    return;
  }
  if (batteryCapacityWh <= 0 || pollIntervalSeconds < 10 || co2GramsPerKwh < 0) {
    alert('Please enter positive values (poll interval ≥ 10 s).');
    return;
  }

  settings = { deviceName, batteryCapacityWh, pollIntervalSeconds, co2GramsPerKwh };
  await window.solina.saveSettings(settings);
  countdown = pollIntervalSeconds;
  co2Intensity.textContent = `@ ${co2GramsPerKwh.toFixed(0)} g/kWh grid intensity`;
  modalOverlay.classList.remove('open');
  await refreshKwhCo2();
});

// Close modal on overlay click
modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) modalOverlay.classList.remove('open');
});

// Redraw on resize
window.addEventListener('resize', () => {
  drawBatteryCanvas(lastBattInfo);
  refreshChart();
});

// ── Init ──────────────────────────────────────────────────────────────────────
(async () => {
  settings  = await window.solina.getSettings();
  countdown = settings.pollIntervalSeconds || 300;

  updateClock();
  await refreshAll();

  // Trigger an initial battery read so the card populates immediately
  const { info } = await window.solina.takeReadingNow();
  updateBattCard(info);
  await refreshAll();
})();
