// Offline cache. Bump VERSION whenever any app file changes so phones pick up the update.
const VERSION = 'nellina-v9';
const FILES = [
  './',
  'index.html',
  'styles.css',
  'logic.js',
  'app.js',
  'manifest.webmanifest',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'img/angry1.png',
  'img/angry2.png',
  'img/angry3.png',
  'img/avatar.png',
  'img/blank1.png',
  'img/blank2.png',
  'img/cute.png',
  'img/deco_heart_pair.png',
  'img/deco_heart_s.png',
  'img/deco_paw.png',
  'img/deco_ring.png',
  'img/deco_sparkle.png',
  'img/deco_star.png',
  'img/dizzy.png',
  'img/downcast.png',
  'img/drop_angry.png',
  'img/drop_blue.png',
  'img/drop_green.png',
  'img/drop_heavy.png',
  'img/drop_light.png',
  'img/drop_sweat.png',
  'img/drop_swirl.png',
  'img/drop_yellow.png',
  'img/grumpy.png',
  'img/happy1.png',
  'img/happy2.png',
  'img/happy3.png',
  'img/joy.png',
  'img/love1.png',
  'img/love2.png',
  'img/love3.png',
  'img/med_bottle.png',
  'img/meh.png',
  'img/pill_blue.png',
  'img/pill_green.png',
  'img/pill_navy.png',
  'img/pill_pink.png',
  'img/pill_pinkdots.png',
  'img/pill_purple.png',
  'img/pill_red.png',
  'img/pill_white.png',
  'img/sad1.png',
  'img/sad2.png',
  'img/sad3.png',
  'img/scared1.png',
  'img/scared2.png',
  'img/scared3.png',
  'img/share.png',
  'img/shock1.png',
  'img/shock2.png',
  'img/shock3.png',
  'img/sick.png',
  'img/sleepy1.png',
  'img/sleepy2.png',
  'img/sleepy3.png',
  'img/smitten1.png',
  'img/smitten2.png',
  'img/smitten3.png',
  'img/smug.png',
  'img/sneeze1.png',
  'img/sneeze2.png',
  'img/spiral.png',
  'img/sym_appetite.png',
  'img/sym_cramp.png',
  'img/sym_fatigue.png',
  'img/sym_headache.png',
  'img/sym_nausea.png',
  'img/sym_sorethroat.png',
  'img/sym_stomach.png',
  'img/sym_zap.png',
  'img/tab_cal.png',
  'img/tab_insights.png',
  'img/tab_settings.png',
  'img/tab_today.png',
  'img/tog_dark.png',
  'img/tog_dark_off.png',
  'img/tog_light_off.png',
  'img/tog_pink.png',
  'img/water1.png',
  'img/water8.png',
  'img/wink.png',
  'img/worry1.png',
  'img/worry2.png',
  'img/wow1.png',
  'img/wow2.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit =>
      hit || fetch(e.request).catch(() => e.request.mode === 'navigate' ? caches.match('index.html') : Response.error())
    )
  );
});
