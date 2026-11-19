(function () {
  'use strict';
  const L = window.Logic;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const IMG = (n, cls) => `<img ${cls ? `class="${cls}" ` : ''}src="img/${n}.png" alt="" draggable="false">`;

  // ---------- sprite maps ----------
  const MOOD_ICON = {
    Happy: 'happy1', Excited: 'wow1', Playful: 'wink', Calm: 'cute', Energetic: 'joy', Flirty: 'love1', Blushing: 'smitten3', Confident: 'smug',
    Sensitive: 'sad3', Sad: 'sad1', Low: 'downcast', Anxious: 'scared2', Stressed: 'worry2', Overwhelmed: 'shock1',
    Irritable: 'grumpy', Angry: 'angry3', 'Mood swings': 'spiral', Numb: 'blank2', Spacey: 'dizzy', Tired: 'sleepy2', Sleepy: 'sleepy3'
  };
  const MOODS = Object.keys(MOOD_ICON);
  const QUICK_MOODS = ['Happy', 'Calm', 'Tired', 'Sad', 'Anxious', 'Irritable'];
  const SYMPTOMS = ['Cramps', 'Headache', 'Bloating', 'Breast tenderness', 'Acne', 'Nausea', 'Fatigue', 'Back pain', 'Cravings', 'Low appetite', 'Insomnia', 'Dizziness', 'Sore throat', 'Cold / sneezing', 'Constipation', 'Diarrhea', 'Hot flashes', 'Joint pain'];
  const SYM_ICON = { Cramps: 'sym_stomach', Headache: 'sym_headache', Nausea: 'sym_nausea', Fatigue: 'sym_fatigue', 'Back pain': 'sym_zap', Bloating: 'sym_cramp', 'Low appetite': 'sym_appetite', 'Sore throat': 'sym_sorethroat', 'Cold / sneezing': 'sneeze1', Dizziness: 'dizzy', Insomnia: 'sleepy2' };
  const FLOW = ['None', 'Spotting', 'Light', 'Medium', 'Heavy'];
  const FLOW_ICON = [null, 'drop_light', 'drop_sweat', 'drop_heavy', 'drop_angry'];
  const MUCUS = ['Dry', 'Sticky', 'Creamy', 'Watery', 'Egg white'];
  const MUCUS_ICON = { Dry: 'drop_yellow', Sticky: 'drop_swirl', Creamy: 'drop_green', Watery: 'drop_blue', 'Egg white': 'deco_sparkle' };
  const PAIN_ICON = ['happy2', 'cute', 'downcast', 'sad3', 'sad1', 'scared3'];
  const ENERGY_ICON = { 1: 'sleepy3', 2: 'sleepy2', 3: 'cute', 4: 'happy1', 5: 'joy' };
  const PILLS = ['pill_pink', 'pill_red', 'pill_blue', 'pill_green', 'pill_purple', 'pill_pinkdots', 'pill_navy', 'pill_white'];
  const TESTS = ['Negative', 'Positive'];
  const PHASE_NAME = { cycle: 'Cycle', menstrual: 'Period', follicular: 'Follicular phase', fertile: 'Fertile window', ovulation: 'Estimated ovulation', luteal: 'Luteal phase' };
  const PHASE_ICON = { cycle: 'cute', menstrual: 'downcast', follicular: 'cute', fertile: 'love1', ovulation: 'smitten1', luteal: 'sleepy1' };
  const NUMERIC = { flow: 1, energy: 1, pain: 1 };

  // ---------- storage ----------
  const KEY = 'nellina.v1';
  function fresh() {
    return { v: 1, days: {}, settings: { goal: 'track', cycleLen: 28, periodLen: 5, lead: 2, pregnant: false, pregStart: '', unit: 'F', pinHash: null, pinSalt: null, pinLen: 4, blur: false, symptoms: [], meds: [], bc: null, hints: true, dommy: true, remind: { on: false, time: '09:00', made: '' }, onboarded: false } };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY) || localStorage.getItem('moon.v1');
      if (raw) {
        const o = JSON.parse(raw), f = fresh();
        return { v: 1, days: o.days && typeof o.days === 'object' ? o.days : {}, settings: Object.assign(f.settings, o.settings || {}) };
      }
    } catch (e) { /* fall through */ }
    return fresh();
  }
  let S = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { toast('Could not save. Storage may be full or blocked.'); }
  }
  const getDay = d => S.days[d] || {};
  function setDay(d, patch) {
    const cur = Object.assign({}, S.days[d] || {}, patch);
    Object.keys(cur).forEach(k => {
      const v = cur[k];
      if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length) || ((k === 'flow' || k === 'water') && !v)) delete cur[k];
    });
    if (Object.keys(cur).length) S.days[d] = cur; else delete S.days[d];
    save();
  }
  function toggleArr(d, field, val) {
    const arr = (getDay(d)[field] || []).slice();
    const i = arr.indexOf(val);
    if (i >= 0) arr.splice(i, 1); else arr.push(val);
    setDay(d, { [field]: arr });
  }

  // ---------- helpers ----------
  const fmt = (s, o) => { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString(undefined, o || { month: 'short', day: 'numeric' }); };
  const fmtN = (n, o) => fmt(L.toStr(n), o);
  const cToDisp = c => S.settings.unit === 'F' ? c * 9 / 5 + 32 : c;
  const dispToC = v => S.settings.unit === 'F' ? (v - 32) * 5 / 9 : v;
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  const medIcon = m => m.icon && PILLS.includes(m.icon) ? m.icon : 'pill_pink';
  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.innerHTML = IMG('deco_paw') + '<span>' + esc(msg) + '</span>'; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }
  const chip = (act, attrs, label, on) => `<button class="chip ${on ? 'on' : ''}" data-act="${act}" ${attrs}>${esc(label)}</button>`;
  const tile = (act, attrs, label, on, icon, num) => `<button class="tile ${on ? 'on' : ''}" data-act="${act}" ${attrs}>${icon ? IMG(icon) : ''}${num !== undefined ? `<span class="num">${num}</span>` : ''}<span>${esc(label)}</span></button>`;
  const tog = (act, on, label) => `<button class="tog ${on ? 'on' : ''}" data-act="${act}" role="switch" aria-checked="${on ? 'true' : 'false'}" aria-label="${esc(label)}"><span></span></button>`;
  const isHormonal = () => S.settings.bc === 'pill' || S.settings.bc === 'hormonal';
  const BC_OPTS = [['none', 'No hormonal birth control'], ['pill', 'The pill'], ['hormonal', 'Other hormonal method']];
  const BC_NOTE = {
    none: 'Fertile window and ovulation estimates are shown. Condoms, copper IUDs and other non-hormonal methods belong here.',
    pill: 'A daily pill reminder is added to the home screen. Hormonal birth control stops or changes ovulation, so fertile window and ovulation estimates are hidden.',
    hormonal: 'Patch, ring, implant, injection or hormonal IUD. These stop or change ovulation, so fertile window and ovulation estimates are hidden.'
  };
  const lastMood = d => { const m = getDay(d).mood; return m && m.length ? m[m.length - 1] : null; };

  // ---------- views ----------
  let view = 'home', calY, calM, sheet = null, obGoal = 'track', obBc = 'none', obKeep = { date: '', cl: '', pl: '' }, newPill = 'pill_pink', newMedName = '';
  const TABS = [['home', 'tab_today', 'Today'], ['cal', 'tab_cal', 'Calendar'], ['insights', 'tab_insights', 'Insights'], ['settings', 'tab_settings', 'Settings']];

  function tabbar() {
    return '<nav class="tabbar">' + TABS.map(x => `<button class="${view === x[0] ? 'on' : ''}" data-act="tab" data-v="${x[0]}">${IMG(x[1])}${x[2]}</button>`).join('') + '</nav>';
  }

  function render() {
    const y = window.scrollY;
    document.body.dataset.view = view;
    let body = '';
    if (view === 'home') body = homeView();
    else if (view === 'cal') body = calView();
    else if (view === 'insights') body = insightsView();
    else if (view === 'settings') body = settingsView();
    else if (view === 'report') body = reportView();
    $('#app').innerHTML = `<main class="${S.settings.blur && view === 'home' ? 'blurmode' : ''}">${body}</main>` + (view === 'report' ? '' : tabbar());
    window.scrollTo(0, y);
  }

  function waterRow(d, cls) {
    const n = getDay(d).water || 0;
    let b = '';
    for (let i = 1; i <= 8; i++) b += `<button class="${i <= n ? '' : 'off'}" data-act="water" data-v="${i}" aria-label="${i} glasses">${IMG(i <= n ? 'water8' : 'water1')}</button>`;
    return `<div class="water ${cls || ''}">${b}</div><div class="waterlbl">${n} of 8 glasses</div>`;
  }

  const HINT = {
    menstrual: 'Cramps, tiredness and low mood are common for some people on these days. Warmth, rest and water help many.',
    follicular: 'Energy and mood often lift as estrogen rises. Some people feel more social and motivated.',
    fertile: 'Some people notice more energy and libido, and clearer, stretchier discharge around now.',
    ovulation: 'Some people feel a brief twinge on one side or a bit more energy. Plenty feel nothing at all.',
    luteal: 'Some people notice cravings, bloating, sore breasts, lighter sleep or feeling more emotional or irritable, mostly in the last days before a period. Many notice little.',
    cycle: 'Hormonal birth control flattens most cycle patterns, so Nellina leans on your own history instead of phase guesses.'
  };
  function personalLine(h) {
    if (!h) return '';
    const bits = h.symptoms.concat(h.moods);
    let t = bits.length ? `Around this point in ${plural(h.cycles, 'past cycle')} you often logged: ${bits.join(', ')}.` : `Around this point in ${plural(h.cycles, 'past cycle')} you logged:`;
    if (h.energy !== null) t += ` Energy was usually ${h.energy.toFixed(1)} of 5.`;
    if (h.pain !== null && h.pain >= 1.5) t += ` Pain was usually ${h.pain.toFixed(1)} of 5.`;
    return t;
  }
  const DOMMY = {
    menstrual: ['Get a heating pad and a warm drink, then do absolutely nothing for a while. You have earned it.', 'Iron-rich food is a good idea after bleeding: beans, lentils, spinach or red meat, with a little citrus on the side.', 'A slow walk or some gentle stretching can ease cramps for some people. Only if it feels good.', 'Drink extra water today. Soup counts.', 'Early night tonight if you can. Resting is the whole plan.', 'Dark chocolate is on the menu today. It has some magnesium, and it is delicious.'],
    follicular: ['Energy tends to pick up around now. Good day to start something new or catch up with a friend.', 'If you feel up for it, a harder workout or a longer walk might feel great today.', 'Fresh, colourful food today: eggs, berries, greens, whatever looks good to you.', 'Maybe tackle that thing you have been putting off. Lots of people feel sharper right now.', 'Get some sunshine and fresh air today. It helps.'],
    fertile: ['Lots of people feel more social around now. Maybe plan something fun.', 'Good day for a workout or a dance in the kitchen.', 'Have some protein with your meals today. It keeps energy steady.', 'Do something today that makes you feel good about you.'],
    ovulation: ['You might feel extra energetic, or a little twingy on one side. Go with how you feel.', 'Water, snacks and a good stretch if anything feels off today.', 'Good day to do something you enjoy. Pick something just for you.'],
    lutealEarly: ['Steady meals help now: whole grains, protein and veg keep energy even.', 'Yoga, a walk or a light workout is plenty. No need to push.', 'Nuts, seeds or dark chocolate are nice snacks. They have magnesium.', 'Wind-down time tonight: a bath, a show, an early bedtime.'],
    lutealLate: ['Cravings are normal. Have the snack, add some protein, no guilt.', 'Be kind to yourself today. Feeling off is allowed, and I am around.', 'If your sleep feels off, try cutting back on caffeine and drinking more water.', 'Warm bath, comfy clothes, cozy movie. All valid plans for today.', 'A short walk can help your mood. Even ten minutes counts.'],
    cycle: ['Drink some water, eat something warm and take a breather today.', 'A short walk and some sunshine can do wonders.', 'Eat something you like and get a good night of sleep.', 'If you feel off today, be gentle with yourself. I have got you.']
  };
  const DOMMY_CATS = ['happy1', 'joy', 'wink', 'cute'];
  function dommyCard(p) {
    let key = p.phase;
    if (key === 'luteal') key = p.daysUntil <= 5 ? 'lutealLate' : 'lutealEarly';
    const pool = DOMMY[key];
    if (!pool) return '';
    const tn = L.toNum(L.localToday());
    return `<div class="dommy">${IMG(DOMMY_CATS[tn % DOMMY_CATS.length], 'dcat')}<div class="bubble"><b>Dommy says:</b> ${esc(pool[tn % pool.length])}</div></div>`;
  }
  function todayCard(p) {
    const ph = p.phase;
    if (!ph || !HINT[ph]) return '';
    const mine = personalLine(L.personalHints(S.days, p.periods, p.cycleDay, p.daysUntil, ph === 'luteal' || p.late > 0 ? 'end' : 'start'));
    return `<div class="card"><h3>${IMG(PHASE_ICON[ph] || 'cute')}What to expect</h3>${mine ? `<div class="mine">${esc(mine)}</div>` : ''}<div class="note" style="margin:${mine ? 8 : 0}px 0 0">${esc(HINT[ph])} Everyone is different.</div></div>`;
  }

  function homeView() {
    const s = S.settings, today = L.localToday(), tn = L.toNum(today);
    const p = L.predict(S.days, s, tn);
    const horm = isHormonal();
    if (horm && p.phase && p.phase !== 'menstrual') p.phase = 'cycle';
    let h = '<h1>Today</h1><div class="sub">' + esc(fmt(today, { weekday: 'long', month: 'long', day: 'numeric' })) + '</div>';
    const bn = [];
    if (p.hasData && !s.pregnant) {
      if (p.late > 0) bn.push({ t: `Period is ${plural(p.late, 'day')} past the predicted date. Cycles vary, so this can be normal.`, c: 'warn', i: 'worry2' });
      else if (p.daysUntil >= 0 && p.daysUntil <= s.lead) bn.push({ t: p.daysUntil === 0 ? 'Period expected today.' : `Period expected in ${plural(p.daysUntil, 'day')}.`, i: 'drop_light' });
      if (!horm && (p.phase === 'fertile' || p.phase === 'ovulation')) bn.push({ t: 'In the estimated fertile window.', i: 'love1' });
    }
    const dueMeds = s.meds.filter(m => m.daily && !(getDay(today).meds || []).includes(m.id));
    if (dueMeds.length) bn.push({ t: 'Not logged yet today: ' + dueMeds.map(m => m.name).join(', ') + '.', i: medIcon(dueMeds[0]) });
    h += bn.map(b => `<div class="banner ${b.c || ''}">${IMG(b.i)}<div>${esc(b.t)}</div></div>`).join('');

    const tm = lastMood(today);
    const deco = IMG('deco_sparkle', 'd d1') + IMG('deco_heart_s', 'd d2') + IMG('deco_star', 'd d3') + IMG('deco_sparkle', 'd d4');
    if (s.pregnant) {
      let wk = '';
      if (s.pregStart) { const w = Math.floor((tn - L.toNum(s.pregStart)) / 7); if (w >= 0 && w < 45) wk = `<div class="phase">Week ${w + 1} (counted from last period)</div>`; }
      h += `<div class="card hero">${deco}${IMG(MOOD_ICON[tm] || 'joy', 'mascot')}<div class="big" style="font-size:28px">Pregnancy mode</div>${wk}<div class="conf">Cycle predictions are paused. You can turn this off in Settings.</div></div>`;
    } else if (!p.hasData) {
      h += `<div class="card hero">${deco}${IMG(MOOD_ICON[tm] || 'wow1', 'mascot')}<div class="phase">No cycle data yet</div><div class="conf">Add your last period to start getting predictions.</div><button class="btn" data-act="onboard">Add last period</button></div>`;
    } else {
      let next;
      if (p.late > 0) next = `Expected ${fmtN(p.nextStart)}, now ${plural(p.late, 'day')} later`;
      else if (p.daysUntil === 0) next = 'Period expected today';
      else next = `Next period in ${plural(p.daysUntil, 'day')}`;
      const win = `Likely ${fmtN(p.nextStart - p.range)} to ${fmtN(p.nextStart + p.range)}`;
      const c0 = p.cycles[0];
      let fert = '';
      if (p.phase === 'fertile' || p.phase === 'ovulation') fert = `<div class="next">Fertile window until ${fmtN(c0.fertileEnd)}</div>`;
      else if (p.phase === 'follicular') fert = `<div class="next">Fertile window starts ${fmtN(c0.fertileStart)}</div>`;
      let conf;
      if (p.sum.n === 0) conf = 'Based on your typical cycle length. Predictions improve as you log.';
      else if (p.sum.irregular) conf = 'Your cycles vary a lot, so these dates are a wide estimate.';
      else conf = `Based on ${plural(p.sum.n, 'logged cycle')}. Confidence: ${p.sum.confidence}.`;
      if (horm) conf += ' Hormonal birth control can change bleeding patterns, so dates are rougher.';
      if (!horm && c0.ovSource === 'temperature') conf += ' Ovulation estimate uses your temperature log.';
      if (!horm && c0.ovSource === 'lh') conf += ' Ovulation estimate uses your ovulation test, and the next period date is based on it.';
      if (!horm && c0.ovSource === 'mucus') conf += ' Ovulation estimate uses your logged discharge.';
      const mascot = MOOD_ICON[tm] || (p.late > 0 ? 'worry2' : (PHASE_ICON[p.phase] || 'cute'));
      const pct = Math.min(96, Math.max(5, (Math.max(1, p.cycleDay) / Math.max(p.avg, 1)) * 100));
      h += `<div class="card hero secret" data-act="reveal">${deco}${IMG(mascot, 'mascot')}<div class="big">Day ${Math.max(1, p.cycleDay)}</div><div class="phase">${esc(PHASE_NAME[p.phase] || 'Cycle')}</div>
        <div class="prog"><div class="fill" style="width:${pct}%"></div><div class="thumb" style="left:${pct}%">${IMG('deco_paw')}</div></div>
        <div class="proglabel"><span>Day 1</span><span>about day ${p.avg}</span></div>
        <div class="next">${esc(next)}<br><span class="muted">${esc(win)}</span></div>${fert}<div class="conf">${esc(conf)}</div></div>`;
      if (s.dommy !== false) h += dommyCard(p);
      if (s.hints !== false) h += todayCard(p);
      if (s.goal === 'avoid') h += '<div class="note">Cycle predictions are estimates and are not a reliable form of birth control.</div>';
      if (s.goal === 'conceive' && (p.phase === 'fertile' || p.phase === 'ovulation')) h += '<div class="note">These are your most fertile days this cycle, based on estimates.</div>';
    }

    const t = getDay(today);
    h += `<div class="row"><button class="btn" data-act="logtoday">${IMG('deco_paw')}Log today</button><button class="btn ghost" data-act="startnow">${IMG('drop_heavy')}${t.flow >= 2 ? 'Period logged' : 'Period started'}</button></div>`;

    h += `<div class="card"><h3>${IMG('happy1')}How are you feeling?</h3><div class="tiles c6">${QUICK_MOODS.map(m => tile('qmood', `data-v="${esc(m)}"`, m, (t.mood || []).includes(m), MOOD_ICON[m])).join('')}</div></div>`;
    h += `<div class="card"><h3>${IMG('water8')}Water</h3>${waterRow(today)}</div>`;

    const daily = s.meds.filter(m => m.daily);
    if (daily.length) {
      const yest = L.toStr(tn - 1);
      h += `<div class="card"><h3>${IMG('med_bottle')}Daily medication</h3>` + daily.map(m => {
        const taken = (t.meds || []).includes(m.id);
        const missed = m.created && m.created <= yest && !(getDay(yest).meds || []).includes(m.id);
        return `<div class="setrow"><div class="lead">${IMG(medIcon(m))}<div>${esc(m.name)}${missed && !taken ? '<small>Not logged yesterday</small>' : ''}</div></div>${chip('medhome', `data-id="${esc(m.id)}"`, taken ? 'Taken ✓' : 'Mark taken', taken)}</div>`;
      }).join('') + '</div>';
    }
    return h;
  }

  function calView() {
    const s = S.settings, today = L.localToday(), tn = L.toNum(today);
    const p = L.predict(S.days, s, tn);
    const ppred = new Set(), fert = new Set(), ovu = new Set();
    if (p.cycles) p.cycles.forEach(c => {
      for (let n = c.next; n <= c.periodEnd; n++) ppred.add(n);
      if (!isHormonal()) { for (let n = c.fertileStart; n <= c.fertileEnd; n++) fert.add(n); ovu.add(c.ov); }
    });
    const first = new Date(calY, calM, 1), dim = new Date(calY, calM + 1, 0).getDate();
    let cells = '';
    for (let i = 0; i < first.getDay(); i++) cells += '<div class="cell empty"></div>';
    for (let d = 1; d <= dim; d++) {
      const str = calY + '-' + String(calM + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      const n = L.toNum(str), r = S.days[str];
      const cls = [];
      if (r && r.flow >= 2) cls.push('per'); else if (r && r.flow === 1) cls.push('spot');
      else if (ppred.has(n) && n >= tn) cls.push('ppred');
      if (fert.has(n) && !(r && r.flow >= 2)) cls.push('fert');
      if (str === today) cls.push('today');
      const mood = lastMood(str);
      const hasData = r && (r.symptoms || r.mood || r.notes || r.sex || r.mucus || r.bbt !== undefined || r.pain !== undefined || r.meds || r.water);
      let icon = '';
      if (mood && MOOD_ICON[mood]) icon = IMG(MOOD_ICON[mood], 'mood');
      else if (hasData) icon = IMG('deco_heart_s', 'dh');
      cells += `<button class="cell ${cls.join(' ')}" data-act="day" data-d="${str}"><b>${d}</b>${icon}${ovu.has(n) ? IMG('deco_sparkle', 'ovs') : ''}</button>`;
    }
    const title = new Date(calY, calM, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    return `<h1>Calendar</h1><div class="cal-head"><button data-act="calprev" aria-label="Previous month">‹</button><b>${esc(title)}</b><button data-act="calnext" aria-label="Next month">›</button></div>
      <div class="grid">${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(x => `<div class="dow">${x}</div>`).join('')}${cells}</div>
      <div class="legend"><span><i style="background:var(--period)"></i>Period</span><span><i style="border:2px dashed var(--period)"></i>Predicted</span>${isHormonal() ? '' : `<span><i style="background:rgba(70,179,196,.35)"></i>Fertile</span><span>${IMG('deco_sparkle')}Ovulation</span>`}<span>${IMG('happy1')}Mood</span><span>${IMG('deco_heart_s')}Logged</span></div>
      <button class="btn ghost" data-act="caltoday">Jump to today</button>
      <div class="note">Tap any day to log or edit it. Predictions are estimates.</div>`;
  }

  function bars(vals) {
    if (!vals.length) return '<div class="empty">Not enough data yet</div>';
    const w = 300, h = 110, step = (w - 20) / vals.length, bw = Math.min(26, step - 4), max = Math.max.apply(null, vals) * 1.15 || 1;
    return `<svg viewBox="0 0 ${w} ${h + 6}" class="chart"><line class="axis" x1="0" x2="${w}" y1="${h}" y2="${h}"/>` + vals.map((v, i) => {
      const bh = (v / max) * (h - 16), x = 10 + i * step + (step - bw) / 2, y = h - bh;
      return `<rect class="bar" x="${x}" y="${y}" width="${bw}" height="${bh}" rx="4"/><text class="lbl" x="${x + bw / 2}" y="${y - 4}" text-anchor="middle">${v}</text>`;
    }).join('') + '</svg>';
  }

  function tempChart(pts, ovDay) {
    if (pts.length < 2) return '<div class="empty">Log temperatures on a few days to see a chart.</div>';
    const w = 300, h = 120, pad = 14;
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    const y0 = Math.min.apply(null, ys) - 0.1, y1 = Math.max.apply(null, ys) + 0.1;
    const X = x => pad + (x1 === x0 ? 0 : (x - x0) / (x1 - x0)) * (w - 2 * pad);
    const Y = y => h - pad - (y - y0) / (y1 - y0) * (h - 2 * pad);
    let svg = `<svg viewBox="0 0 ${w} ${h + 10}" class="chart"><line class="axis" x1="0" x2="${w}" y1="${h - pad + 4}" y2="${h - pad + 4}"/>`;
    if (ovDay !== null && ovDay >= x0 && ovDay <= x1) svg += `<line class="ovl" x1="${X(ovDay)}" x2="${X(ovDay)}" y1="4" y2="${h - pad}"/>`;
    svg += `<polyline class="ln" points="${pts.map(p => X(p.x).toFixed(1) + ',' + Y(p.y).toFixed(1)).join(' ')}"/>`;
    svg += pts.map(p => `<circle class="pt" cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="3"/>`).join('');
    svg += `<text class="lbl" x="${pad}" y="${h + 8}">Day ${x0}</text><text class="lbl" x="${w - pad}" y="${h + 8}" text-anchor="end">Day ${x1}</text></svg>`;
    return svg;
  }

  function insightsView() {
    const tn = L.toNum(L.localToday());
    const p = L.predict(S.days, S.settings, tn);
    const periods = p.periods, sum = p.sum;
    if (!periods.length) return `<h1>Insights</h1><div class="card" style="text-align:center"><img src="img/cute.png" alt="" style="height:84px;width:auto"><div class="empty">Log a few periods and symptoms and insights will appear here.</div></div>`;
    const ins = L.insights(S.days, periods, sum);
    let reg = 'Need 3+ cycles', regIcon = 'wow1';
    if (sum.n >= 3) { if (sum.spread <= 2) { reg = 'Regular'; regIcon = 'happy1'; } else if (sum.spread <= 4) { reg = 'Fairly regular'; regIcon = 'cute'; } else { reg = 'Irregular'; regIcon = 'spiral'; } }
    let h = '<h1>Insights</h1>';
    h += `<div class="tilebox"><div class="stat">${IMG('drop_heavy')}<div><b>${Math.round(sum.cycleAvg)}</b><span>Avg cycle (days)</span></div></div>
      <div class="stat">${IMG('drop_light')}<div><b>${Math.round(sum.periodAvg * 10) / 10}</b><span>Avg period (days)</span></div></div>
      <div class="stat">${IMG('deco_paw')}<div><b>${periods.length}</b><span>Periods logged</span></div></div>
      <div class="stat">${IMG(regIcon)}<div><b style="font-size:16px">${esc(reg)}</b><span>Regularity</span></div></div></div>`;
    {
      const bits = [];
      if (p.track) bits.push(`When Nellina predicted your past periods the same way, it was off by ${p.track.meanAbs.toFixed(1)} days on average, and within 2 days ${Math.round(p.track.within2 * 100)}% of the time (${plural(p.track.n, 'cycle')} checked).`);
      else bits.push('Nellina needs about 4 logged periods before it can check its own accuracy on you.');
      if (!isHormonal()) bits.push(p.lutN >= 2 ? `Your luteal phase (ovulation to period) looks like about ${Math.round(p.lut)} days, learned from ${plural(p.lutN, 'cycle')} with an ovulation test, temperature shift or discharge peak. Nellina uses it for your dates.` : 'Nellina assumes about 13 days from ovulation to period until it has learned yours. Logging ovulation tests or daily temperature teaches it.');
      h += `<div class="sec">${IMG('deco_heart_s')}How accurate is Nellina for you?</div><div class="card">${bits.map(x => `<div class="note" style="margin:0 0 6px">${esc(x)}</div>`).join('')}</div>`;
    }
    h += '<div class="sec">Cycle length (days)</div><div class="card">' + bars(sum.all.slice(-12)) + '</div>';
    h += '<div class="sec">Period length (days)</div><div class="card">' + bars(periods.slice(-12).map(x => x.len)) + '</div>';

    const top = Object.keys(ins.symTotal).sort((a, b) => ins.symTotal[b] - ins.symTotal[a]).slice(0, 6);
    h += `<div class="sec">${isHormonal() ? 'Most logged symptoms' : 'Symptoms by phase'}</div><div class="card">`;
    if (!top.length) h += '<div class="empty">Log symptoms to see patterns.</div>';
    else if (isHormonal()) h += '<div class="chips">' + top.map(x => `<span class="chip static">${SYM_ICON[x] ? IMG(SYM_ICON[x]) : ''}${esc(x)} · ${ins.symTotal[x]}</span>`).join('') + '</div><div class="note">Phase breakdowns are hidden because hormonal birth control changes the natural cycle.</div>';
    else {
      h += '<table><tr><th></th>' + ins.phases.map(ph => `<th>${esc(PHASE_NAME[ph].replace(' phase', '').replace(' window', ''))}</th>`).join('') + '</tr>';
      top.forEach(sym => {
        h += `<tr><td>${SYM_ICON[sym] ? IMG(SYM_ICON[sym]) : ''}${esc(sym)}</td>` + ins.phases.map(ph => {
          const d = ins.daysBy[ph];
          return `<td class="pct">${d ? Math.round(100 * (ins.symBy[ph][sym] || 0) / d) + '%' : '-'}</td>`;
        }).join('') + '</tr>';
      });
      h += '</table><div class="note">Share of logged days in each phase with that symptom.</div>';
    }
    h += '</div>';

    const hasPE = !isHormonal() && ins.phases.some(ph => ins.painAvg[ph] !== null || ins.energyAvg[ph] !== null);
    if (hasPE) {
      const f = v => v === null ? '-' : (Math.round(v * 10) / 10);
      h += '<div class="sec">Pain and energy by phase</div><div class="card"><table><tr><th></th><th>Pain (0-5)</th><th>Energy (1-5)</th></tr>' +
        ins.phases.map(ph => `<tr><td>${esc(PHASE_NAME[ph])}</td><td>${f(ins.painAvg[ph])}</td><td>${f(ins.energyAvg[ph])}</td></tr>`).join('') + '</table></div>';
    }
    const moods = Object.keys(ins.moodCount).sort((a, b) => ins.moodCount[b] - ins.moodCount[a]).slice(0, 8);
    if (moods.length) h += '<div class="sec">Most logged moods</div><div class="card"><div class="chips">' + moods.map(m => `<span class="chip static">${MOOD_ICON[m] ? IMG(MOOD_ICON[m]) : ''}${esc(m)} · ${ins.moodCount[m]}</span>`).join('') + '</div></div>';

    if (p.last && !isHormonal()) {
      const pts = Object.keys(S.days).filter(k => typeof S.days[k].bbt === 'number' && L.toNum(k) >= p.last.start)
        .map(k => ({ x: L.toNum(k) - p.last.start + 1, y: cToDisp(S.days[k].bbt) })).sort((a, b) => a.x - b.x);
      h += `<div class="sec">Temperature this cycle (°${S.settings.unit})</div><div class="card">` + tempChart(pts, p.bbtOv !== null && p.bbtOv !== undefined ? p.bbtOv - p.last.start + 1 : null) +
        (p.bbtOv != null ? `<div class="note">A temperature shift suggests ovulation around ${esc(fmtN(p.bbtOv))}.</div>` : '<div class="note">Ovulation is detected after a sustained temperature rise (needs about 9+ readings).</div>') + '</div>';
    }
    return h;
  }

  function settingsView() {
    const s = S.settings;
    const goalChips = [['track', 'Track cycle'], ['conceive', 'Trying to conceive'], ['avoid', 'Avoiding pregnancy']].map(g => chip('goal', `data-v="${g[0]}"`, g[1], s.goal === g[0])).join('');
    let h = '<h1>Settings</h1>';
    h += `<div class="sec">${IMG('deco_heart_s')}Cycle</div><div class="card"><div class="chips">${goalChips}</div>
      <label>Typical cycle length (days)<input type="number" inputmode="numeric" min="15" max="60" value="${s.cycleLen}" data-change="cycleLen"></label>
      <label>Typical period length (days)<input type="number" inputmode="numeric" min="1" max="14" value="${s.periodLen}" data-change="periodLen"></label>
      <label>Home screen reminder: days before a period<input type="number" inputmode="numeric" min="0" max="7" value="${s.lead}" data-change="lead"></label>
      <div class="setrow"><div>Dommy says<small>Daily tip from a happy cat</small></div>${tog('dommytoggle', s.dommy !== false, 'Dommy says')}</div>
      <div class="setrow"><div>What to expect card<small>Daily note on the home screen</small></div>${tog('hintstoggle', s.hints !== false, 'What to expect card')}</div>
      <div class="setrow"><div>Pregnancy mode<small>Pauses cycle predictions</small></div>${tog('pregtoggle', s.pregnant, 'Pregnancy mode')}</div>
      ${s.pregnant ? `<label>First day of last period<input type="date" value="${esc(s.pregStart)}" data-change="pregStart"></label>` : ''}
      <div class="setrow"><div>Temperature unit</div><div class="chips">${chip('unit', 'data-v="F"', '°F', s.unit === 'F')}${chip('unit', 'data-v="C"', '°C', s.unit === 'C')}</div></div></div>`;

    h += `<div class="sec">${IMG('deco_heart_s')}Birth control</div><div class="card"><div class="chips">${BC_OPTS.map(o => chip('setbc', `data-v="${o[0]}"`, o[1], (s.bc || 'none') === o[0])).join('')}</div><div class="note">${esc(BC_NOTE[s.bc || 'none'])}</div></div>`;
    const rm = s.remind || { on: false, time: '09:00', made: '' };
    h += `<div class="sec">${IMG('deco_heart_s')}Daily reminders</div><div class="card">
      <div class="note" style="margin-top:0">Adds a short note to your iPhone Calendar for each of the next 60 days, with an alert, like "Day 22, Luteal phase". It is created on this phone and the app sends nothing anywhere.</div>
      <label>Alert time<input type="time" value="${esc(rm.time || '09:00')}" data-change="remindTime"></label>
      <button class="btn ghost" data-act="mkical">${IMG('share')}${rm.on ? 'Refresh reminders' : 'Create reminders'}</button>
      ${rm.on ? `<div class="note">Last created ${esc(rm.made ? fmt(rm.made, { month: 'short', day: 'numeric' }) : '')}. Predictions get better as you log, so refresh every month or two. A new alert time applies when you refresh.</div><button class="btn ghost" data-act="clearremind">Clear reminders</button>` : ''}
      <div class="note">When your phone asks, choose Add All. Tip: first add a calendar called Nellina (Calendar app, Calendars, Add Calendar) and pick it. Then you can remove every reminder at once by deleting that calendar.</div></div>`;
    h += `<div class="sec">${IMG('deco_heart_s')}Privacy</div><div class="card">
      <div class="setrow"><div>Passcode lock<small>${s.pinHash ? 'On. Locks whenever the app is left.' : 'Off'}</small></div><div class="chips">${chip('setpin', '', s.pinHash ? 'Change' : 'Set', false)}${s.pinHash ? chip('removepin', '', 'Remove', false) : ''}</div></div>
      <div class="setrow"><div>Blur home screen details<small>Tap the card to reveal</small></div>${tog('blurtoggle', s.blur, 'Blur home screen details')}</div>
      <div class="note">All data is stored only on this phone, in this app. There are no accounts, no servers and no analytics. This app makes no network requests. The passcode is a screen lock; your phone's own encryption protects the stored data. Forgetting the passcode means erasing the app data, so keep a backup.</div></div>`;

    h += `<div class="sec">${IMG('deco_heart_s')}Custom symptoms</div><div class="card">` +
      (s.symptoms.length ? '<div class="chips">' + s.symptoms.map(x => chip('delsym', `data-v="${esc(x)}"`, x + '  ✕', false)).join('') + '</div>' : '<div class="empty">None added. Add them from the daily log screen.</div>') + '</div>';

    h += `<div class="sec">${IMG('deco_heart_s')}Medication and supplements</div><div class="card">` +
      (s.meds.length ? s.meds.map(m => `<div class="setrow"><div class="lead">${IMG(medIcon(m))}<div>${esc(m.name)}<small>${m.bc ? 'Managed in Birth control above' : (m.daily ? 'Daily reminder on home screen' : 'As needed')}</small></div></div>${m.bc ? '' : chip('delmed', `data-id="${esc(m.id)}"`, 'Remove', false)}</div>`).join('') : '<div class="empty">None added.</div>') +
      `<div class="inline"><input type="text" id="newmed" placeholder="Name, for example Vitamin D" maxlength="40" value="${esc(newMedName)}"></div>
       <div class="pillpick">${PILLS.map(pl => `<button class="${newPill === pl ? 'on' : ''}" data-act="pickpill" data-v="${pl}" aria-label="Pill style">${IMG(pl)}</button>`).join('')}</div>
       <div class="row" style="margin-top:8px"><button class="btn ghost small" data-act="addmed" data-v="daily">Add as daily</button><button class="btn ghost small" data-act="addmed" data-v="prn">Add as needed</button></div></div>`;

    h += `<div class="sec">${IMG('deco_heart_s')}Backup and reports</div><div class="card">
      <button class="btn ghost" data-act="export">${IMG('share')}Export encrypted backup</button>
      <button class="btn ghost" data-act="import">Restore from backup</button>
      <button class="btn ghost" data-act="report">Doctor report (print or save PDF)</button>
      <div class="note">Backups are encrypted with a password you choose. Save the file somewhere safe, such as the Files app. Without the password it cannot be opened.</div></div>`;

    h += `<div class="sec">${IMG('deco_heart_s')}About</div><div class="card"><div class="note" style="margin:0">To install: open this page in Safari, tap Share, then Add to Home Screen. After that it works offline. Clearing Safari website data or deleting the app can erase your entries, so make backups. This app is not medical advice and its predictions are estimates. It is not a contraceptive.</div></div>
      <button class="btn danger" data-act="wipe">Erase all data</button>`;
    return h;
  }

  function reportView() {
    const tn = L.toNum(L.localToday());
    const p = L.predict(S.days, S.settings, tn);
    const periods = p.periods, sum = p.sum;
    const ins = L.insights(S.days, periods, sum);
    const rows = periods.slice(-12).map((pr, i, arr) => {
      const idx = periods.length - arr.length + i, nxt = periods[idx + 1];
      return `<tr><td>${esc(fmtN(pr.start, { year: 'numeric', month: 'short', day: 'numeric' }))}</td><td>${nxt ? nxt.start - pr.start : '-'}</td><td>${pr.len}</td></tr>`;
    }).join('');
    const top = Object.keys(ins.symTotal).sort((a, b) => ins.symTotal[b] - ins.symTotal[a]).slice(0, 8);
    return `<div class="noprint"><button class="btn ghost small" data-act="backreport">‹ Back</button> <button class="btn small" data-act="printreport">Print or save as PDF</button></div>
      <h1>Cycle summary</h1><div class="sub">Generated ${esc(fmt(L.localToday(), { year: 'numeric', month: 'long', day: 'numeric' }))} on this device</div>
      <div class="card"><b>Averages</b><br>Cycle length: ${periods.length > 1 ? Math.round(sum.cycleAvg) + ' days' : 'not enough data'}<br>Period length: ${periods.length ? (Math.round(sum.periodAvg * 10) / 10) + ' days' : 'no data'}<br>Periods logged: ${periods.length}</div>
      <div class="card"><b>Recent cycles</b>${rows ? `<table><tr><th>Start date</th><th>Cycle length</th><th>Period length</th></tr>${rows}</table>` : '<div class="empty">No periods logged.</div>'}</div>
      <div class="card"><b>Most logged symptoms</b><br>${top.length ? top.map(s => esc(s) + ' (' + ins.symTotal[s] + ' days)').join('<br>') : 'None logged'}</div>
      <div class="card"><b>Medication and supplements</b><br>${S.settings.meds.length ? S.settings.meds.map(m => esc(m.name)).join('<br>') : 'None listed'}</div>
      <div class="note">Self-tracked data. Predictions and averages are estimates.</div>`;
  }

  // ---------- sheets ----------
  function openSheet(kind, date) { sheet = { kind, date }; renderSheet(); $('#sheet').hidden = false; }
  function closeSheet() {
    if (sheet && sheet.kind === 'onboard' && !S.settings.onboarded) { S.settings.onboarded = true; save(); }
    sheet = null; $('#sheet').hidden = true; render();
  }
  function renderSheet() {
    if (!sheet) return;
    const el = document.querySelector('.sheet'), top = el.scrollTop;
    $('#sheetBody').innerHTML = sheet.kind === 'onboard' ? onboardHTML() : logHTML(sheet.date);
    el.scrollTop = top;
  }
  function onboardHTML() {
    const t = L.localToday();
    const goals = [['track', 'Track cycle'], ['conceive', 'Trying to conceive'], ['avoid', 'Avoiding pregnancy']].map(g => chip('obgoal', `data-v="${g[0]}"`, g[1], obGoal === g[0])).join('');
    return `<div class="sheet-head"><h2>Welcome</h2><button class="x" data-act="close">Skip</button></div>
      <div class="welcome">${IMG('happy1')}<p class="muted">Everything stays on this phone. Nothing is sent anywhere.</p></div>
      <label>First day of your last period<input type="date" id="ob-date" max="${t}" value="${esc(obKeep.date)}"></label>
      <label>Typical cycle length (days)<input type="number" inputmode="numeric" id="ob-cl" value="${esc(obKeep.cl || S.settings.cycleLen)}" min="15" max="60"></label>
      <label>Typical period length (days)<input type="number" inputmode="numeric" id="ob-pl" value="${esc(obKeep.pl || S.settings.periodLen)}" min="1" max="14"></label>
      <div class="sec">Goal</div><div class="chips">${goals}</div>
      <div class="sec">Birth control</div><div class="chips">${BC_OPTS.map(o => chip('obbc', `data-v="${o[0]}"`, o[1], obBc === o[0])).join('')}</div><div class="note">${esc(BC_NOTE[obBc])}</div>
      <button class="btn" data-act="onboardsave">Get started</button>
      <div class="note">The period days are filled in from your typical length. You can edit them on the calendar.</div>`;
  }
  function keepOb() { const g = id => (document.querySelector(id) || {}).value || ''; obKeep = { date: g('#ob-date'), cl: g('#ob-cl'), pl: g('#ob-pl') }; }
  function logHTML(d) {
    const r = getDay(d), s = S.settings;
    const syms = SYMPTOMS.concat(s.symptoms);
    const t1 = (f, vals, icons, labels, nums, cls) => `<div class="tiles ${cls || ''}">` + vals.map((v, i) => tile('set', `data-f="${f}" data-v="${esc(v)}"`, labels ? labels[i] : v, r[f] === v, icons ? icons[i] : null, nums ? v : undefined)).join('') + '</div>';
    const multi = (f, list, iconOf, cls) => `<div class="tiles ${cls || ''}">` + list.map(v => tile('tog', `data-f="${f}" data-v="${esc(v)}"`, v, (r[f] || []).includes(v), iconOf(v))).join('') + '</div>';
    const bbt = typeof r.bbt === 'number' ? (Math.round(cToDisp(r.bbt) * 100) / 100) : '';
    const chips1 = (f, vals, labels) => '<div class="chips">' + vals.map((v, i) => chip('set', `data-f="${f}" data-v="${v}"`, labels ? labels[i] : v, r[f] === v)).join('') + '</div>';
    return `<div class="sheet-head"><button data-act="daynav" data-v="-1" aria-label="Previous day">‹</button><h2>${esc(fmt(d, { weekday: 'short', month: 'short', day: 'numeric' }))}</h2><button data-act="daynav" data-v="1" aria-label="Next day">›</button><button class="x" data-act="close">Done</button></div>
      <div class="sec">${IMG('drop_heavy')}Period flow</div>${t1('flow', [1, 2, 3, 4], FLOW_ICON.slice(1), FLOW.slice(1))}
      <div class="sec">${IMG('happy1')}Mood</div>${multi('mood', MOODS, m => MOOD_ICON[m], 'big')}
      <div class="sec">${IMG('sym_stomach')}Symptoms</div>${multi('symptoms', syms, x => SYM_ICON[x] || 'deco_star', 'sm')}
      <div class="inline"><input type="text" id="newsym" placeholder="Add your own symptom" maxlength="30"><button class="btn small" data-act="addsym" style="margin:0">Add</button></div>
      <div class="sec">${IMG('joy')}Energy (1 low, 5 high)</div>${t1('energy', [1, 2, 3, 4, 5], [1, 2, 3, 4, 5].map(i => ENERGY_ICON[i]), null, true, 'c5')}
      <div class="sec">${IMG('sym_zap')}Pain (0 none, 5 severe)</div>${t1('pain', [0, 1, 2, 3, 4, 5], PAIN_ICON, null, true, 'c6')}
      <div class="sec">${IMG('drop_blue')}Discharge</div>${t1('mucus', MUCUS, MUCUS.map(m => MUCUS_ICON[m]), null, false, 'c5')}
      <div class="sec">${IMG('deco_heart_pair')}Intimacy</div>${chips1('sex', ['protected', 'unprotected'], ['Protected', 'Unprotected'])}
      <div class="sec">Tests</div>
      <div class="note" style="margin:0 0 4px">Ovulation test</div>${chips1('ovtest', TESTS)}
      <div class="note" style="margin:8px 0 4px">Pregnancy test</div>${chips1('pregtest', TESTS)}
      <div class="sec">${IMG('water8')}Water</div>${waterRow(d)}
      <div class="sec">Temperature and sleep</div>
      <label>Basal temperature (°${s.unit})<input type="number" inputmode="decimal" step="0.01" data-input="bbt" value="${bbt}"></label>
      <label>Sleep (hours)<input type="number" inputmode="decimal" step="0.5" min="0" max="24" data-input="sleep" value="${r.sleep === undefined ? '' : r.sleep}"></label>
      ${s.meds.length ? `<div class="sec">${IMG('med_bottle')}Medication and supplements</div><div class="tiles c3">` + s.meds.map(m => tile('tog', `data-f="meds" data-v="${esc(m.id)}"`, m.name, (r.meds || []).includes(m.id), medIcon(m))).join('') + '</div>' : ''}
      <div class="sec">Notes</div><textarea data-input="notes" placeholder="Anything else">${esc(r.notes || '')}</textarea>`;
  }

  // ---------- modal ----------
  function modal(o) {
    return new Promise(res => {
      const el = document.createElement('div'); el.className = 'modal';
      el.innerHTML = `<div class="box"><h3>${esc(o.title)}</h3>${o.msg ? `<p>${esc(o.msg)}</p>` : ''}${(o.inputs || []).map(i => `<input type="${i.type || 'text'}" placeholder="${esc(i.placeholder || '')}" ${i.inputmode ? `inputmode="${i.inputmode}"` : ''} autocomplete="off">`).join('')}<div class="row"><button class="btn ghost" data-m="0">${esc(o.cancel || 'Cancel')}</button><button class="btn ${o.danger ? 'danger' : ''}" data-m="1">${esc(o.ok || 'OK')}</button></div></div>`;
      document.body.appendChild(el);
      const f = el.querySelector('input'); if (f) f.focus();
      el.addEventListener('click', e => {
        const b = e.target.closest('[data-m]'); if (!b) return;
        const vals = Array.prototype.map.call(el.querySelectorAll('input'), i => i.value);
        el.remove(); res(b.dataset.m === '1' ? vals : null);
      });
    });
  }

  // ---------- lock ----------
  let locked = false, pinBuf = '', fails = 0, lockUntil = 0;
  async function hashPin(pin, salt) {
    const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pin));
    return Array.prototype.map.call(new Uint8Array(h), x => x.toString(16).padStart(2, '0')).join('');
  }
  function showLock(msg) {
    locked = true;
    const el = $('#lock'), len = S.settings.pinLen || 4;
    el.hidden = false;
    let dots = ''; for (let i = 0; i < len; i++) dots += IMG('deco_paw', i < pinBuf.length ? 'f' : '');
    const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(k => `<button data-act="key" data-v="${k}" ${k === '' ? 'disabled' : ''} aria-label="${k === '⌫' ? 'Delete' : k}">${k}</button>`).join('');
    el.innerHTML = `<div class="lock-in">${IMG('avatar', 'av')}<h2>Nellina</h2><p class="muted">${esc(msg || 'Enter passcode')}</p><div class="dots">${dots}</div><div class="pad">${keys}</div><button class="link" data-act="forgot">Forgot passcode?</button></div>`;
  }
  async function pressKey(k) {
    if (Date.now() < lockUntil) { showLock('Too many attempts. Wait a moment.'); return; }
    if (k === '⌫') pinBuf = pinBuf.slice(0, -1);
    else if (pinBuf.length < (S.settings.pinLen || 4)) pinBuf += k;
    if (pinBuf.length === (S.settings.pinLen || 4)) {
      const ok = (await hashPin(pinBuf, S.settings.pinSalt)) === S.settings.pinHash;
      pinBuf = '';
      if (ok) { fails = 0; locked = false; $('#lock').hidden = true; render(); return; }
      fails++;
      if (fails >= 5) { lockUntil = Date.now() + 30000; fails = 0; showLock('Too many attempts. Try again in 30 seconds.'); return; }
      showLock('Wrong passcode');
      return;
    }
    showLock();
  }

  // ---------- backup ----------
  const b64 = u => { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function deriveKey(pw, salt) {
    const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' }, k, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  // ---------- calendar reminders (.ics) ----------
  const icsEsc = x => String(x).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const icsFold = line => { const out = []; while (line.length > 60) { out.push(line.slice(0, 60)); line = ' ' + line.slice(60); } out.push(line); return out.join('\r\n'); };
  function buildIcs(p) {
    const s = S.settings, tn = L.toNum(L.localToday()), horm = isHormonal();
    const tm = (s.remind && /^\d\d:\d\d$/.test(s.remind.time)) ? s.remind.time : '09:00';
    const hh = tm.slice(0, 2), mm = tm.slice(3, 5), endMin = String((+mm + 15) % 60).padStart(2, '0'), endH = String(+mm + 15 >= 60 ? (+hh + 1) % 24 : +hh).padStart(2, '0');
    const now = new Date(), z = n => String(n).padStart(2, '0');
    const stamp = now.getUTCFullYear() + z(now.getUTCMonth() + 1) + z(now.getUTCDate()) + 'T' + z(now.getUTCHours()) + z(now.getUTCMinutes()) + z(now.getUTCSeconds()) + 'Z';
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nellina//Cycle reminders//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Nellina'];
    for (let n = tn; n < tn + 60; n++) {
      const q = L.phaseOn(p, n, horm);
      if (!q) continue;
      const ds = L.toStr(n).replace(/-/g, '');
      const expected = q.day === 1 && q.k > 0;
      const summary = expected ? 'Nellina: Period expected today (day 1)' : `Nellina: Day ${q.day}, ${PHASE_NAME[q.phase] || 'Cycle'}`;
      const mine = personalLine(L.personalHints(S.days, p.periods, q.day, q.until, q.phase === 'luteal' ? 'end' : 'start'));
      const desc = [mine, HINT[q.phase] || '', 'Estimates only. Everyone is different.'].filter(Boolean).join('\n');
      lines.push('BEGIN:VEVENT', 'UID:nellina-' + ds + '@nellina.local', 'DTSTAMP:' + stamp, `DTSTART:${ds}T${hh}${mm}00`, `DTEND:${ds}T${endH}${endMin}00`,
        icsFold('SUMMARY:' + icsEsc(summary)), icsFold('DESCRIPTION:' + icsEsc(desc)), 'TRANSP:TRANSPARENT',
        'BEGIN:VALARM', 'ACTION:DISPLAY', icsFold('DESCRIPTION:' + icsEsc(summary)), 'TRIGGER:PT0S', 'END:VALARM', 'END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return lines.join('\r\n') + '\r\n';
  }
  async function makeIcal() {
    const s = S.settings;
    if (s.pregnant) return toast('Turn off pregnancy mode first');
    const p = L.predict(S.days, s, L.toNum(L.localToday()));
    if (!p.hasData) return toast('Add a period first');
    const file = new File([buildIcs(p)], 'nellina-reminders.ics', { type: 'text/calendar' });
    let shared = false;
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Nellina reminders' }); shared = true; }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    if (!shared) {
      const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = 'nellina-reminders.ics';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
    s.remind = Object.assign({ time: '09:00' }, s.remind, { on: true, made: L.localToday() });
    save(); render();
    toast('Open the file and choose Add All');
  }
  async function doExport() {
    const r = await modal({ title: 'Backup password', msg: 'Choose a password. You will need it to restore. It cannot be recovered.', inputs: [{ type: 'password', placeholder: 'Password' }, { type: 'password', placeholder: 'Repeat password' }], ok: 'Export' });
    if (!r) return;
    if (r[0].length < 6) return toast('Use at least 6 characters');
    if (r[0] !== r[1]) return toast('Passwords do not match');
    try {
      const payload = { days: S.days, settings: Object.assign({}, S.settings, { pinHash: null, pinSalt: null }) };
      const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await deriveKey(r[0], salt);
      const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(payload)));
      const text = JSON.stringify({ app: 'nellina', v: 1, salt: b64(salt), iv: b64(iv), data: b64(new Uint8Array(ct)) });
      const name = 'nellina-backup-' + L.localToday() + '.json';
      const file = new File([text], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'Nellina backup' }); return; }
        catch (e) { if (e && e.name === 'AbortError') return; }
      }
      const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast('Backup saved');
    } catch (e) { toast('Export failed'); }
  }
  async function doImport(file) {
    try {
      const env = JSON.parse(await file.text());
      if ((env.app !== 'nellina' && env.app !== 'moon') || !env.data) return toast('Not a Nellina backup file');
      const r = await modal({ title: 'Backup password', inputs: [{ type: 'password', placeholder: 'Password' }], ok: 'Restore' });
      if (!r) return;
      let obj;
      try {
        const key = await deriveKey(r[0], unb64(env.salt));
        const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(env.iv) }, key, unb64(env.data));
        obj = JSON.parse(new TextDecoder().decode(pt));
      } catch (e) { return toast('Wrong password or damaged file'); }
      if (!obj || typeof obj.days !== 'object' || obj.days === null) return toast('Backup content is invalid');
      const ok = await modal({ title: 'Replace current data?', msg: 'This replaces everything in the app with the backup.', ok: 'Replace', danger: true });
      if (!ok) return;
      const keep = { pinHash: S.settings.pinHash, pinSalt: S.settings.pinSalt, pinLen: S.settings.pinLen };
      S = { v: 1, days: obj.days, settings: Object.assign(fresh().settings, obj.settings || {}, keep, { onboarded: true }) };
      save(); render(); toast('Backup restored');
    } catch (e) { toast('Could not read that file'); }
  }

  // ---------- actions ----------
  function clamp(v, a, b, d) { v = parseInt(v, 10); return isNaN(v) ? d : Math.min(b, Math.max(a, v)); }
  const nid = () => 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  function setWater(d, n) { setDay(d, { water: (getDay(d).water || 0) === n ? n - 1 : n }); }
  function purgeBc() {
    const ids = S.settings.meds.filter(m => m.bc).map(m => m.id);
    S.settings.meds = S.settings.meds.filter(m => !m.bc);
    if (ids.length) Object.keys(S.days).forEach(k => { if (S.days[k].meds) setDay(k, { meds: S.days[k].meds.filter(x => !ids.includes(x)) }); });
  }
  function applyBc(v) {
    S.settings.bc = v;
    if (v !== 'pill') purgeBc();
    else if (!S.settings.meds.some(m => m.bc)) S.settings.meds.push({ id: nid(), name: 'Birth control pill', daily: true, created: L.localToday(), icon: 'pill_pink', bc: true });
    save();
  }
  const A = {
    tab: d => { view = d.v; window.scrollTo(0, 0); render(); },
    reveal: (d, t) => { t.classList.toggle('show'); },
    calprev: () => { calM--; if (calM < 0) { calM = 11; calY--; } render(); },
    calnext: () => { calM++; if (calM > 11) { calM = 0; calY++; } render(); },
    caltoday: () => { const n = new Date(); calY = n.getFullYear(); calM = n.getMonth(); render(); },
    day: d => openSheet('log', d.d),
    close: () => closeSheet(),
    daynav: d => { sheet.date = L.toStr(L.toNum(sheet.date) + Number(d.v)); renderSheet(); render(); },
    set: d => {
      const v = NUMERIC[d.f] ? Number(d.v) : d.v;
      setDay(sheet.date, { [d.f]: getDay(sheet.date)[d.f] === v ? null : v });
      renderSheet(); render();
    },
    tog: d => { toggleArr(sheet.date, d.f, d.v); renderSheet(); render(); },
    qmood: d => { toggleArr(L.localToday(), 'mood', d.v); render(); },
    water: d => {
      const n = Number(d.v), date = sheet && sheet.kind === 'log' ? sheet.date : L.localToday();
      setWater(date, n);
      if (sheet) renderSheet();
      render();
    },
    addsym: () => {
      const el = $('#newsym'), v = el.value.trim().slice(0, 30);
      if (!v) return;
      if (!SYMPTOMS.concat(S.settings.symptoms).includes(v)) S.settings.symptoms.push(v);
      if (!(getDay(sheet.date).symptoms || []).includes(v)) toggleArr(sheet.date, 'symptoms', v); else save();
      renderSheet(); render();
    },
    logtoday: () => openSheet('log', L.localToday()),
    startnow: () => {
      const t = L.localToday();
      if (getDay(t).flow >= 2) return openSheet('log', t);
      setDay(t, { flow: 3 }); render(); toast('Period start logged for today');
    },
    medhome: d => { toggleArr(L.localToday(), 'meds', d.id); render(); },
    onboard: () => openSheet('onboard'),
    obgoal: d => { keepOb(); obGoal = d.v; renderSheet(); },
    obbc: d => { keepOb(); obBc = d.v; renderSheet(); },
    onboardsave: () => {
      const cl = clamp($('#ob-cl').value, 15, 60, 28), pl = clamp($('#ob-pl').value, 1, 14, 5), ds = $('#ob-date').value;
      S.settings.cycleLen = cl; S.settings.periodLen = pl; S.settings.goal = obGoal; S.settings.onboarded = true;
      applyBc(obBc);
      if (ds) {
        const start = L.toNum(ds), tn = L.toNum(L.localToday());
        for (let i = 0; i < pl; i++) { const n = start + i; if (n <= tn && !(getDay(L.toStr(n)).flow)) setDay(L.toStr(n), { flow: 3 }); }
      }
      save(); closeSheet();
    },
    setbc: async d => {
      const cur = S.settings.bc || 'none';
      if (d.v === cur) return;
      if (cur === 'pill' && d.v !== 'pill') {
        const r = await modal({ title: 'Remove pill tracking?', msg: 'This deletes the daily pill reminder and its logged history from this phone.', ok: 'Remove', danger: true });
        if (!r) return;
      }
      applyBc(d.v); render();
    },
    goal: d => { S.settings.goal = d.v; save(); render(); },
    pregtoggle: () => { S.settings.pregnant = !S.settings.pregnant; save(); render(); },
    unit: d => { S.settings.unit = d.v; save(); render(); },
    dommytoggle: () => { S.settings.dommy = S.settings.dommy === false; save(); render(); },
    hintstoggle: () => { S.settings.hints = S.settings.hints === false; save(); render(); },
    mkical: () => makeIcal(),
    clearremind: async () => {
      const r = await modal({ title: 'Clear reminders?', msg: 'This turns reminders off in Nellina. Events already added to your iPhone Calendar stay there until you delete them. In the Calendar app tap Calendars, tap the info button next to Nellina, then Delete Calendar. Nellina cannot remove them for you.', ok: 'Clear in Nellina', danger: true });
      if (!r) return;
      S.settings.remind = { on: false, time: '09:00', made: '' }; save(); render(); toast('Reminders cleared in Nellina');
    },
    blurtoggle: () => { S.settings.blur = !S.settings.blur; save(); render(); },
    delsym: async d => {
      const r = await modal({ title: 'Remove "' + d.v + '"?', msg: 'It will also be removed from past days.', ok: 'Remove', danger: true });
      if (!r) return;
      S.settings.symptoms = S.settings.symptoms.filter(x => x !== d.v);
      Object.keys(S.days).forEach(k => { if (S.days[k].symptoms) setDay(k, { symptoms: S.days[k].symptoms.filter(x => x !== d.v) }); });
      save(); render();
    },
    pickpill: d => { const el = $('#newmed'); if (el) newMedName = el.value; newPill = d.v; render(); },
    addmed: d => {
      const el = $('#newmed'), name = el.value.trim().slice(0, 40);
      if (!name) return toast('Enter a name first');
      S.settings.meds.push({ id: nid(), name, daily: d.v === 'daily', created: L.localToday(), icon: newPill });
      newMedName = ''; save(); render();
    },
    delmed: async d => {
      const mm = S.settings.meds.find(m => m.id === d.id);
      if (mm && mm.bc) return;
      const r = await modal({ title: 'Remove this item?', msg: 'Past logs of it will be removed too.', ok: 'Remove', danger: true });
      if (!r) return;
      S.settings.meds = S.settings.meds.filter(m => m.id !== d.id);
      Object.keys(S.days).forEach(k => { if (S.days[k].meds) setDay(k, { meds: S.days[k].meds.filter(x => x !== d.id) }); });
      save(); render();
    },
    setpin: async () => {
      const r = await modal({ title: 'Set passcode', msg: 'Choose 4 to 6 digits.', inputs: [{ type: 'password', inputmode: 'numeric', placeholder: 'Passcode' }, { type: 'password', inputmode: 'numeric', placeholder: 'Repeat passcode' }], ok: 'Save' });
      if (!r) return;
      if (!/^\d{4,6}$/.test(r[0])) return toast('Use 4 to 6 digits');
      if (r[0] !== r[1]) return toast('Passcodes do not match');
      const salt = b64(crypto.getRandomValues(new Uint8Array(12)));
      S.settings.pinSalt = salt; S.settings.pinLen = r[0].length; S.settings.pinHash = await hashPin(r[0], salt);
      save(); render(); toast('Passcode set');
    },
    removepin: async () => {
      const r = await modal({ title: 'Remove passcode?', ok: 'Remove', danger: true });
      if (!r) return;
      S.settings.pinHash = null; S.settings.pinSalt = null; save(); render();
    },
    key: d => pressKey(d.v),
    forgot: async () => {
      const r = await modal({ title: 'Erase all data?', msg: 'The only way past a forgotten passcode is erasing everything in the app. You can then restore from a backup.', ok: 'Erase everything', danger: true });
      if (!r) return;
      S = fresh(); save(); locked = false; $('#lock').hidden = true; view = 'home'; render();
    },
    export: () => doExport(),
    import: () => $('#importFile').click(),
    report: () => { view = 'report'; window.scrollTo(0, 0); render(); },
    backreport: () => { view = 'settings'; render(); },
    printreport: () => window.print(),
    wipe: async () => {
      const r = await modal({ title: 'Erase all data?', msg: 'This permanently deletes every entry and setting on this phone. Export a backup first if you might want it back.', ok: 'Erase everything', danger: true });
      if (!r) return;
      S = fresh(); save(); view = 'home'; render(); toast('All data erased');
    }
  };

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-act]');
    if (!t || !A[t.dataset.act]) return;
    A[t.dataset.act](t.dataset, t);
  });
  document.addEventListener('input', e => {
    const t = e.target;
    if (!t.dataset || !t.dataset.input || !sheet || sheet.kind !== 'log') return;
    const f = t.dataset.input, v = t.value;
    if (f === 'notes') setDay(sheet.date, { notes: v });
    else if (f === 'sleep') setDay(sheet.date, { sleep: v === '' || isNaN(parseFloat(v)) ? null : Math.min(24, Math.max(0, parseFloat(v))) });
    else if (f === 'bbt') {
      const n = parseFloat(v);
      setDay(sheet.date, { bbt: v === '' || isNaN(n) ? null : Math.round(dispToC(n) * 100) / 100 });
    }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'importFile') { const f = t.files && t.files[0]; t.value = ''; if (f) doImport(f); return; }
    if (!t.dataset || !t.dataset.change) return;
    const f = t.dataset.change, s = S.settings;
    if (f === 'cycleLen') s.cycleLen = clamp(t.value, 15, 60, 28);
    else if (f === 'periodLen') s.periodLen = clamp(t.value, 1, 14, 5);
    else if (f === 'lead') s.lead = clamp(t.value, 0, 7, 2);
    else if (f === 'pregStart') s.pregStart = t.value;
    else if (f === 'remindTime') { s.remind = Object.assign({ on: false, made: '' }, s.remind, { time: /^\d\d:\d\d$/.test(t.value) ? t.value : '09:00' }); }
    save(); render();
  });

  // Hide content in the app switcher and lock when leaving the app.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      $('#cover').hidden = false;
      if (S.settings.pinHash) { pinBuf = ''; showLock(); }
    } else {
      $('#cover').hidden = true;
      render();
    }
  });
  window.addEventListener('pagehide', () => { $('#cover').hidden = false; });
  window.addEventListener('pageshow', () => { if (!document.hidden) $('#cover').hidden = true; });

  // ---------- boot ----------
  $('#cover').innerHTML = IMG('avatar');
  const now = new Date(); calY = now.getFullYear(); calM = now.getMonth();
  render();
  if (S.settings.pinHash) showLock();
  else if (!S.settings.onboarded && !Object.keys(S.days).length) openSheet('onboard');
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
})();
