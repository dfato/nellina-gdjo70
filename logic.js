(function (root) {
  'use strict';
  const DAY = 86400000;
  const pad = n => String(n).padStart(2, '0');
  const toNum = s => { const p = s.split('-').map(Number); return Math.round(Date.UTC(p[0], p[1] - 1, p[2]) / DAY); };
  const toStr = n => { const d = new Date(n * DAY); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); };
  const localToday = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const sd = a => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1)); };

  const VALID_MIN = 15, VALID_MAX = 60;

  // A "period" is a run of bleeding days (flow >= 2: light/medium/heavy).
  // Spotting (flow 1) does not start a period. A one-day gap inside a run is tolerated.
  function findPeriods(days) {
    const nums = Object.keys(days).filter(k => days[k].flow >= 2).map(toNum).sort((a, b) => a - b);
    const out = [];
    for (const n of nums) {
      const last = out[out.length - 1];
      if (last && n - last.end <= 2) last.end = n;
      else out.push({ start: n, end: n });
    }
    out.forEach(p => { p.len = p.end - p.start + 1; });
    return out;
  }

  function cycleLengths(periods) {
    const r = [];
    for (let i = 1; i < periods.length; i++) r.push(periods[i].start - periods[i - 1].start);
    return r;
  }

  const DEFAULT_LUTEAL = 13;
  const median = a => { const b = a.slice().sort((x, y) => x - y), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function summarize(periods, settings, todayN) {
    const all = cycleLengths(periods);
    let valid = all.filter(x => x >= VALID_MIN && x <= VALID_MAX).slice(-8);
    // Drop one-off outliers (illness, travel, a missed log) once there is enough history to tell.
    if (valid.length >= 4) { const md = median(valid); valid = valid.filter(x => Math.abs(x - md) <= 10); }
    // Ignore a period that may still be in progress when averaging period length.
    const plens = periods
      .filter(p => todayN === undefined || p.end < todayN - 2)
      .map(p => p.len).filter(x => x >= 1 && x <= 14).slice(-6);
    // Recent cycles count more than old ones.
    let cycleAvg = settings.cycleLen || 28;
    if (valid.length) {
      let w = 0, t = 0;
      valid.forEach((x, i) => { const wt = Math.pow(0.85, valid.length - 1 - i); w += wt; t += wt * x; });
      cycleAvg = t / w;
    }
    const spread = sd(valid);
    const periodAvg = plens.length ? mean(plens) : (settings.periodLen || 5);
    let confidence = 'low';
    if (valid.length >= 3) confidence = spread <= 2 ? 'high' : (spread <= 4 ? 'medium' : 'low');
    const irregular = valid.length >= 3 && spread > 4;
    return { all, valid, cycleAvg, spread, periodAvg, confidence, irregular, n: valid.length };
  }

  // Three-over-six rule on basal temperatures (values in any consistent unit; 0.2 assumes Celsius).
  function detectOvulation(temps) {
    for (let i = 6; i < temps.length - 2; i++) {
      const cover = Math.max.apply(null, temps.slice(i - 6, i).map(x => x.t));
      const a = temps[i], b = temps[i + 1], c = temps[i + 2];
      if (a.t > cover && b.t > cover && c.t >= cover + 0.2 && c.n - a.n <= 4) return a.n - 1;
    }
    return null;
  }

  // Best available evidence that ovulation happened in the cycle that begins at periods[ci].
  // Priority: LH test (most reliable), then temperature shift, then last egg-white mucus day.
  function ovEvidence(days, periods, ci) {
    const start = periods[ci].start;
    const end = ci + 1 < periods.length ? periods[ci + 1].start - 1 : start + 60;
    const keys = Object.keys(days).map(k => ({ k, n: toNum(k) })).filter(x => x.n >= start && x.n <= end).sort((a, b) => a.n - b.n);
    const lh = keys.filter(x => days[x.k].ovtest === 'Positive');
    if (lh.length) return { n: lh[0].n + 1, source: 'lh' };
    const temps = keys.filter(x => typeof days[x.k].bbt === 'number').map(x => ({ n: x.n, t: days[x.k].bbt }));
    const t = detectOvulation(temps);
    if (t !== null) return { n: t, source: 'temperature' };
    const mu = keys.filter(x => days[x.k].mucus === 'Egg white');
    if (mu.length) return { n: mu[mu.length - 1].n, source: 'mucus' };
    return null;
  }

  // Her own luteal phase length (ovulation to next period), learned from completed cycles that
  // have ovulation evidence. Shrunk toward the population default until there is enough data.
  function personalLuteal(days, periods) {
    const v = [];
    for (let ci = 0; ci + 1 < periods.length; ci++) {
      const ev = ovEvidence(days, periods, ci);
      if (!ev) continue;
      const lut = periods[ci + 1].start - ev.n;
      if (ev.n >= periods[ci].start + 6 && lut >= 8 && lut <= 20) v.push(lut);
    }
    const r = v.slice(-6), n = r.length;
    const lut = n ? (n * median(r) + 2 * DEFAULT_LUTEAL) / (n + 2) : DEFAULT_LUTEAL;
    const lutSd = n >= 3 ? clamp(sd(r), 1, 3.5) : 2;
    return { lut, lutSd, n };
  }

  // How well the same method would have predicted her own past periods.
  function track(periods, settings) {
    const errs = [];
    for (let k = 3; k < periods.length; k++) {
      const actual = periods[k].start - periods[k - 1].start;
      if (actual < VALID_MIN || actual > VALID_MAX) continue;
      const s = summarize(periods.slice(0, k), settings);
      errs.push(Math.round(s.cycleAvg) - actual);
    }
    errs.splice(0, Math.max(0, errs.length - 8));
    if (errs.length < 2) return null;
    const ab = errs.map(Math.abs);
    return { n: errs.length, meanAbs: mean(ab), within1: ab.filter(x => x <= 1).length / ab.length, within2: ab.filter(x => x <= 2).length / ab.length };
  }

  const WIDEN = 0.6;

  function predict(days, settings, todayN) {
    const periods = findPeriods(days);
    const sum = summarize(periods, settings, todayN);
    const res = { periods, sum, pregnant: !!settings.pregnant, hasData: periods.length > 0 };
    if (!periods.length || settings.pregnant) return res;
    const last = periods[periods.length - 1];
    const avg = Math.round(sum.cycleAvg);
    const spread = sum.n >= 2 ? sum.spread : 3;
    const range = sum.n >= 2 ? Math.max(1, Math.round(sum.spread)) : 3;
    const plen = Math.max(1, Math.round(sum.periodAvg));
    const pl = personalLuteal(days, periods), lut = Math.round(pl.lut);
    const temps = Object.keys(days)
      .filter(k => typeof days[k].bbt === 'number' && toNum(k) >= last.start)
      .map(k => ({ n: toNum(k), t: days[k].bbt }))
      .sort((a, b) => a.n - b.n);
    const bbtOv = detectOvulation(temps);
    let ev = ovEvidence(days, periods, periods.length - 1);
    // Ignore evidence that disagrees wildly with the cycle pattern (a stray positive test, a fever).
    if (ev && (ev.n < last.start + 6 || Math.abs(ev.n + lut - (last.start + avg)) > 12)) ev = null;
    const cycles = [];
    let startK = last.start;
    for (let k = 0; k < 4; k++) {
      let next = startK + avg, ov = next - lut, ovSource = 'estimate', rg = Math.round(range * Math.sqrt(k + 1));
      let unc = Math.sqrt(spread * spread * (k + 1) + pl.lutSd * pl.lutSd);
      if (k === 0 && ev) { ov = ev.n; ovSource = ev.source; next = ov + lut; rg = clamp(Math.round(pl.lutSd), 1, 3); unc = 0; }
      const extra = ovSource === 'estimate' ? clamp(Math.round(WIDEN * unc) - 2, 0, 5) : 0;
      cycles.push({
        k, start: startK, next, ov, ovSource, extra,
        fertileStart: ov - 5 - extra, fertileEnd: ov + 1 + extra,
        periodEnd: next + plen - 1, lo: next - rg, hi: next + rg
      });
      startK = next;
    }
    const c0 = cycles[0];
    const cd = todayN - last.start + 1;
    let phase = null;
    if (cd >= 1) {
      if (todayN <= last.end || cd <= plen) phase = 'menstrual';
      else if (todayN === c0.ov) phase = 'ovulation';
      else if (todayN >= c0.fertileStart && todayN <= c0.fertileEnd) phase = 'fertile';
      else if (todayN < c0.fertileStart) phase = 'follicular';
      else phase = 'luteal';
    }
    Object.assign(res, {
      last, cycleDay: cd, phase, avg, range: (c0.hi - c0.lo) >> 1, plen, cycles, bbtOv, ovEv: ev,
      lut: pl.lut, lutN: pl.n, track: track(periods, settings),
      nextStart: c0.next, daysUntil: c0.next - todayN,
      late: todayN > c0.next ? todayN - c0.next : 0
    });
    return res;
  }

  // Phase for any date from a prediction (used by reminders). Returns {phase, day, until} or null.
  function phaseOn(p, n, hormonal) {
    if (!p || !p.cycles) return null;
    for (const c of p.cycles) {
      if (n >= c.start && n < c.next) {
        const day = n - c.start + 1, until = c.next - n;
        let phase;
        if (day <= p.plen) phase = 'menstrual';
        else if (hormonal) phase = 'cycle';
        else if (n === c.ov) phase = 'ovulation';
        else if (n >= c.fertileStart && n <= c.fertileEnd) phase = 'fertile';
        else phase = n < c.fertileStart ? 'follicular' : 'luteal';
        return { phase, day, until, k: c.k };
      }
    }
    return null;
  }

  // What she herself logged around this point in her past cycles. Needs at least 2 past cycles
  // with logs near this day, and only reports things seen in at least half of them (and twice).
  function personalHints(days, periods, cycleDay, until, anchor) {
    const sym = {}, mood = {}, pain = [], en = [];
    let seen = 0;
    for (let ci = 0; ci + 1 < periods.length; ci++) {
      const start = periods[ci].start, next = periods[ci + 1].start;
      const center = anchor === 'end' ? next - until : start + cycleDay - 1;
      let any = false; const sc = {}, mc = {};
      for (let n = center - 1; n <= center + 1; n++) {
        if (n < start || n >= next) continue;
        const r = days[toStr(n)]; if (!r) continue;
        const sig = (r.symptoms && r.symptoms.length) || (r.mood && r.mood.length) || typeof r.pain === 'number' || typeof r.energy === 'number';
        if (!sig) continue;
        any = true;
        (r.symptoms || []).forEach(x => { sc[x] = 1; });
        (r.mood || []).forEach(x => { mc[x] = 1; });
        if (typeof r.pain === 'number') pain.push(r.pain);
        if (typeof r.energy === 'number') en.push(r.energy);
      }
      if (any) { seen++; Object.keys(sc).forEach(x => { sym[x] = (sym[x] || 0) + 1; }); Object.keys(mc).forEach(x => { mood[x] = (mood[x] || 0) + 1; }); }
    }
    if (seen < 2) return null;
    const need = Math.max(2, Math.ceil(seen / 2));
    const top = o => Object.keys(o).filter(x => o[x] >= need).sort((a, b) => o[b] - o[a]).slice(0, 3);
    const out = { cycles: seen, symptoms: top(sym), moods: top(mood), pain: pain.length >= 2 ? mean(pain) : null, energy: en.length >= 2 ? mean(en) : null };
    if (!out.symptoms.length && !out.moods.length && (out.pain === null || out.pain < 2) && (out.energy === null)) return null;
    return out;
  }

  function phaseFor(n, start, nextStart, plen, lut) {
    if (n < start) return null;
    if (n - start + 1 <= plen) return 'menstrual';
    const ov = nextStart - (lut || DEFAULT_LUTEAL);
    if (n >= ov - 5 && n <= ov + 1) return 'fertile';
    return n < ov - 5 ? 'follicular' : 'luteal';
  }

  function insights(days, periods, sum) {
    const phases = ['menstrual', 'follicular', 'fertile', 'luteal'];
    const daysBy = {}, symBy = {}, painBy = {}, enBy = {}, moodCount = {}, symTotal = {};
    phases.forEach(p => { daysBy[p] = 0; symBy[p] = {}; painBy[p] = []; enBy[p] = []; });
    const avg = Math.round(sum.cycleAvg), lut = Math.round(personalLuteal(days, periods).lut);
    for (const k of Object.keys(days)) {
      const r = days[k];
      const n = toNum(k);
      let ci = -1;
      for (let i = periods.length - 1; i >= 0; i--) { if (periods[i].start <= n) { ci = i; break; } }
      if (ci < 0) continue;
      const start = periods[ci].start;
      const nextStart = ci + 1 < periods.length ? periods[ci + 1].start : start + avg;
      if (n - start >= 60) continue;
      const hasSignal = (r.symptoms && r.symptoms.length) || (r.mood && r.mood.length) ||
        typeof r.pain === 'number' || typeof r.energy === 'number';
      if (!hasSignal) continue;
      const ph = phaseFor(n, start, nextStart, periods[ci].len, lut);
      if (!ph) continue;
      daysBy[ph]++;
      (r.symptoms || []).forEach(s => { symBy[ph][s] = (symBy[ph][s] || 0) + 1; symTotal[s] = (symTotal[s] || 0) + 1; });
      (r.mood || []).forEach(m => { moodCount[m] = (moodCount[m] || 0) + 1; });
      if (typeof r.pain === 'number') painBy[ph].push(r.pain);
      if (typeof r.energy === 'number') enBy[ph].push(r.energy);
    }
    const avgOrNull = a => a.length ? mean(a) : null;
    const painAvg = {}, energyAvg = {};
    phases.forEach(p => { painAvg[p] = avgOrNull(painBy[p]); energyAvg[p] = avgOrNull(enBy[p]); });
    return { phases, daysBy, symBy, symTotal, moodCount, painAvg, energyAvg };
  }

  const api = {
    DAY, toNum, toStr, localToday, mean, sd, findPeriods, cycleLengths, summarize,
    detectOvulation, ovEvidence, personalLuteal, track, predict, phaseOn, personalHints, phaseFor, insights, median
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Logic = api;
})(typeof window !== 'undefined' ? window : this);
