// Work list — hover preview following cursor.
// Rows with data-clip play a muted 3-second loop; rows with only data-thumb show the image.
const preview = document.getElementById('thumb-preview');
const previewImg = preview.querySelector('img');
const previewVideo = preview.querySelector('video');
const CLIP_SECONDS = 3;
let visible = false;

previewVideo.muted = true;
previewVideo.addEventListener('timeupdate', () => {
  if (previewVideo.currentTime >= CLIP_SECONDS) previewVideo.currentTime = 0;
});

function showImage(src) {
  previewVideo.pause();
  previewVideo.hidden = true;
  previewImg.hidden = false;
  previewImg.src = src;
}

document.querySelectorAll('.work-row[data-thumb], .work-row[data-clip]').forEach(row => {
  row.addEventListener('mouseenter', () => {
    const { clip, thumb } = row.dataset;
    if (clip) {
      previewImg.hidden = true;
      previewVideo.hidden = false;
      if (thumb) previewVideo.poster = thumb;
      if (!previewVideo.src.endsWith(clip)) previewVideo.src = clip;
      previewVideo.currentTime = 0;
      // If the clip can't play (missing file, blocked autoplay), fall back to the thumbnail
      previewVideo.play().catch(() => { if (thumb) showImage(thumb); });
      previewVideo.onerror = () => { if (thumb) showImage(thumb); };
    } else {
      showImage(thumb);
    }
    preview.classList.add('active');
    visible = true;
  });
  row.addEventListener('mouseleave', () => {
    preview.classList.remove('active');
    previewVideo.pause();
    visible = false;
  });
});

document.addEventListener('mousemove', e => {
  if (!visible) return;
  const pw = 540, ph = 304, margin = 24;
  const left = e.clientX + margin + pw > window.innerWidth
    ? e.clientX - pw - margin
    : e.clientX + margin;
  const top = Math.max(margin, Math.min(e.clientY - ph / 2, window.innerHeight - ph - margin));
  preview.style.left = left + 'px';
  preview.style.top  = top + 'px';
});

// Phone: while a finger is on the project list, show a tiny still next to the
// name of the project under it. The still is only loaded the first time it's needed.
const touchRows = document.querySelectorAll('.work-row[data-thumb]');
let touchedRow = null;
let touchHideTimer = null;

function setTouchedRow(row) {
  if (row === touchedRow) return;
  if (touchedRow) touchedRow.classList.remove('touching');
  touchedRow = row;
  if (!row) return;
  let img = row.querySelector('.row-thumb');
  if (!img) {
    img = document.createElement('img');
    img.className = 'row-thumb';
    img.alt = '';
    img.decoding = 'async';
    img.addEventListener('load', () => img.classList.add('ready'));
    img.src = row.dataset.thumb;
    row.querySelector('.client').appendChild(img);
  }
  row.classList.add('touching');
}

function rowUnderFinger(e) {
  const t = e.touches[0];
  const el = t && document.elementFromPoint(t.clientX, t.clientY);
  const row = el && el.closest('.work-row');
  return row && row.dataset.thumb ? row : null;
}

if (touchRows.length) {
  document.addEventListener('touchstart', e => { clearTimeout(touchHideTimer); setTouchedRow(rowUnderFinger(e)); }, { passive: true });
  document.addEventListener('touchmove',  e => setTouchedRow(rowUnderFinger(e)), { passive: true });
  document.addEventListener('touchend',   () => { touchHideTimer = setTimeout(() => setTouchedRow(null), 700); }, { passive: true });
}

// Split hero: FILM (left half) / COMMERCIAL (right half)
// Only one side shows at a time, full screen. Visitors land on a random side; it switches
// when the cursor crosses the middle of the screen, or with a horizontal swipe on phones.
// The project list highlights the rows of the side being shown. Clicking the hero (or
// "Watch Reel") opens that side's reel over the page.
const heroMain   = document.querySelector('.hero-main');
const heroSides  = { film: document.querySelector('.hero-side[data-side="film"]'),
                     commercial: document.querySelector('.hero-side[data-side="commercial"]') };
const reelSrc    = { film: 'videos/film-reel.mp4', commercial: 'videos/commercial-reel.mp4' };
let side = null;
let genre = null; // subgenre currently shown in the hero (computers only)
const isPhone = matchMedia('(max-width: 640px)'); // phones: tabs instead of the split

// Film rows carry their subgenre in the HTML (data-genre); commercial rows get it from their category
const COMMERCIAL_GENRES = { 'Sports': 'sports', 'Fashion': 'fashion', 'Beauty': 'beauty', 'Branded & Social': 'branded' };
document.querySelectorAll('.work-row').forEach(row => {
  const cat = row.children[1] && row.children[1].dataset.en;
  if (cat === 'Film') row.classList.add('is-film');
  else if (COMMERCIAL_GENRES[cat]) row.dataset.genre = COMMERCIAL_GENRES[cat];
});

// Carousel under the hero: shows only the projects of the side being shown (built from the
// project list), repeated so the loop always fills the screen. After a subgenre is clicked,
// it shows only that subgenre's projects.
let stripKey = '';
function buildStrip() {
  const track = document.querySelector('.strip-track');
  if (!track) return;
  const g = document.body.dataset.genre || ''; // the subgenre the visitor clicked
  const rows = [...document.querySelectorAll('.work-row[data-thumb]')]
    .filter(r => r.classList.contains('is-film') === (side === 'film'))
    .filter(r => !g || r.dataset.genre === g);
  if (!rows.length || stripKey === side + g) return;
  stripKey = side + g;
  const item = r => `<a href="${r.href}" target="_blank" class="strip-item" data-genre="${r.dataset.genre || ''}"><img src="${r.dataset.thumb}" alt="" /></a>`;
  let set = rows.map(item).join('');
  let count = rows.length;
  while (count * 242 < window.innerWidth + 300) { set += rows.map(item).join(''); count += rows.length; }
  track.innerHTML = set + set; // two copies: the animation slides by half for a seamless loop
  track.style.animationDuration = count * 3.7 + 's';
}

function setSide(next) {
  if (next === side) return;
  side = next;
  delete document.body.dataset.genre; // a picked subgenre belongs to the other side
  setGenre(null);
  buildStrip();
  document.body.dataset.side = side;
  for (const [name, el] of Object.entries(heroSides)) {
    const video = el.querySelector('video');
    el.classList.toggle('active', name === side);
    if (name === side) video.play().catch(() => {}); // muted, so autoplay is allowed
    else setTimeout(() => { if (side !== name) video.pause(); }, 450); // after the fade
  }
}
// Phones always open on Film; elsewhere the side is random
setSide(isPhone.matches ? 'film' : (Math.random() < 0.5 ? 'film' : 'commercial'));

// Load the side the visitor landed on first (it downloads behind the entry game);
// only once it can play through, fetch the other side's reel.
(() => {
  const first  = heroSides[side].querySelector('video');
  const second = heroSides[side === 'film' ? 'commercial' : 'film'].querySelector('video');
  first.preload = 'auto';
  const loadSecond = () => { second.preload = 'auto'; }; // upgrading preload resumes the download
  if (first.readyState >= 4) loadSecond();
  else first.addEventListener('canplaythrough', loadSecond, { once: true });
})();

// Subgenres: the top of the hero shows the reel; below that, the hero is split into equal bands,
// one per subgenre of the side being shown. The band under the cursor shows its label (at that
// height) and its still over the reel.
const GENRE_TOP = 0.22, GENRE_BOTTOM = 0.88; // share of the hero height the bands cover

function genreItems(name) {
  return [...heroSides[name].querySelectorAll('.genre-labels span')].map(s => s.dataset.genre);
}

function placeGenreLabels() {
  const h = heroMain.clientHeight;
  for (const name of Object.keys(heroSides)) {
    const spans = heroSides[name].querySelectorAll('.genre-labels span');
    const band = (GENRE_BOTTOM - GENRE_TOP) * h / spans.length;
    spans.forEach((s, i) => { s.style.top = GENRE_TOP * h + band * (i + 0.5) + 'px'; });
  }
}
placeGenreLabels();
window.addEventListener('resize', placeGenreLabels);

// Fetch the subgenre stills shortly after the page loads (computers only), so they show instantly
window.addEventListener('load', () => {
  if (isPhone.matches) return;
  document.querySelectorAll('.genre-stills img').forEach(img => { if (!img.src) img.src = img.dataset.src; });
});

function setGenre(next) {
  if (next === genre) return;
  genre = next;
  for (const el of document.querySelectorAll('.genre-stills img, .genre-labels span')) {
    const on = !!next && el.dataset.genre === next;
    if (on && el.tagName === 'IMG' && !el.src) el.src = el.dataset.src; // load stills only when first needed
    el.classList.toggle('active', on);
  }
}

heroMain.addEventListener('mousemove', e => {
  setSide(e.clientX < window.innerWidth / 2 ? 'film' : 'commercial');
  const rect = heroMain.getBoundingClientRect();
  const y = (e.clientY - rect.top) / rect.height;
  const items = genreItems(side);
  if (y < GENRE_TOP || y >= GENRE_BOTTOM || e.target.closest('a, button')) { setGenre(null); return; }
  setGenre(items[Math.min(items.length - 1, Math.floor((y - GENRE_TOP) / (GENRE_BOTTOM - GENRE_TOP) * items.length))]);
});
heroMain.addEventListener('mouseleave', () => setGenre(null));

// Top menu: Film / Commercial switch the hero side. On computers they also scroll down to that
// part of the list; on phones they're tabs: the page shows only that side, from the top.
for (const name of ['film', 'commercial']) {
  document.querySelector(`.corner.top-right a[href="#${name}"]`).addEventListener('click', e => {
    setSide(name);
    if (isPhone.matches) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}

// Phones: horizontal swipe on the hero switches side (finger to the left = the right side comes in)
let heroTouch = null;
heroMain.addEventListener('touchstart', e => { const t = e.touches[0]; heroTouch = { x: t.clientX, y: t.clientY }; }, { passive: true });
heroMain.addEventListener('touchend', e => {
  if (!heroTouch || isPhone.matches) return; // no swipe on phones (they use the tabs)
  const t = e.changedTouches[0];
  const dx = t.clientX - heroTouch.x, dy = t.clientY - heroTouch.y;
  heroTouch = null;
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    heroMain.dataset.swiped = '1'; // so a click that may follow doesn't open the reel
    setTimeout(() => delete heroMain.dataset.swiped, 400);
    setSide(dx < 0 ? 'commercial' : 'film');
  }
}, { passive: true });

// Reel player
const reelOverlay = document.getElementById('reelOverlay');
const reelPlayer  = document.getElementById('reelPlayer');

function openReel() {
  reelPlayer.src = reelSrc[side];
  reelOverlay.classList.add('open');
  reelOverlay.setAttribute('aria-hidden', 'false');
  reelPlayer.currentTime = 0;
  reelPlayer.play().catch(() => {});
}
function closeReel() {
  reelOverlay.classList.remove('open');
  reelOverlay.setAttribute('aria-hidden', 'true');
  reelPlayer.pause();
}

heroMain.addEventListener('click', e => {
  if (heroMain.dataset.swiped) { delete heroMain.dataset.swiped; return; }
  if (e.target.closest('a, button')) return; // menu, language, music, etc.
  if (genre) {
    // A subgenre is showing: go down to the list with only its projects highlighted
    document.body.dataset.genre = genre;
    buildStrip();
    document.getElementById('works').scrollIntoView({ behavior: 'smooth' });
    return;
  }
  openReel();
});
document.getElementById('watchReel').addEventListener('click', e => { e.preventDefault(); openReel(); });
document.getElementById('reelClose').addEventListener('click', closeReel);
reelOverlay.addEventListener('click', e => { if (e.target === reelOverlay) closeReel(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && reelOverlay.classList.contains('open')) closeReel(); });

// Language toggle
let lang = 'en';
const langToggle = document.getElementById('langToggle');
langToggle.addEventListener('click', () => {
  lang = lang === 'en' ? 'es' : 'en';
  langToggle.textContent = lang === 'en' ? 'ES' : 'EN';
  document.querySelectorAll('[data-en]').forEach(el => {
    el.innerHTML = el.dataset[lang];
  });
});

// Fade in a dark band behind the fixed top corners once we scroll past the hero image
function updateScrolled() {
  document.body.classList.toggle('scrolled', window.scrollY > window.innerHeight - 160);
}
window.addEventListener('scroll', updateScrolled, { passive: true });
window.addEventListener('resize', updateScrolled);
updateScrolled();

// Background music — two playlists, each played in order and looped:
// - GAME_TRACKS (Fallen Waves soundtrack) plays during the snake game on the entry screen (snake.js)
// - SITE_TRACKS takes over automatically when the visitor enters the site
// The song line under the name in the top-left corner plays / pauses it.
// `mark` is shown after the title and points to that song's credit at the bottom of the page.
// Every song name has an English and a Spanish version (`en` / `es`).
const GAME_TRACKS = [1, 2, 3, 4, 5].map(n => ({
  src: `music/pt${n}.m4a`,
  en: `Fallen Waves - Soundtrack Part ${n}`,
  es: `Caen las Olas - Soundtrack Parte ${n}`,
  mark: '*',
}));
const SITE_TRACKS = [
  { src: 'music/leitmotiv.m4a',          en: 'Leitmotiv - Yo y Las Bestias',            mark: '†' },
  { src: 'music/esta-via-esta-vida.m4a', en: 'Esta Vía, Esta Vida - Yo y Las Bestias',  mark: '‡' },
  { src: 'music/al-pie-del-volcan.m4a',  en: 'Al Pie del Volcán - Yo y Las Bestias',     mark: '§' },
  { src: 'music/caraballeda.m4a',        en: 'Caraballeda - Yo y Las Bestias',          mark: '¶' },
].map(t => ({ ...t, es: t.en })); // song names are the same in both languages

const music           = document.getElementById('bgMusic');
const nowPlayingTitle = document.getElementById('nowPlayingTitle');
const nowPlayingMark  = document.getElementById('nowPlayingMark');
let playlist = GAME_TRACKS;
let trackIndex = 0;

function loadTrack(index) {
  trackIndex = index % playlist.length;
  music.src = playlist[trackIndex].src;
}

function showTrack() {
  // Replace the "Play music" hint with the song name, in both languages so the ES/EN toggle swaps it
  const t = playlist[trackIndex];
  nowPlayingTitle.dataset.en = t.en;
  nowPlayingTitle.dataset.es = t.es;
  nowPlayingTitle.textContent = lang === 'es' ? t.es : t.en;
  nowPlayingMark.textContent = t.mark;
}

// While the visitor plays the entry game, quietly download the site's first song, so it
// starts the instant they enter (the others load while it plays)
let firstSiteSong = null;
fetch(SITE_TRACKS[0].src).then(r => r.ok ? r.blob() : null).then(b => { if (b) firstSiteSong = URL.createObjectURL(b); }).catch(() => {});

// Called by snake.js when the visitor enters the site: switch to the site's songs and play them
window.startSiteMusic = () => {
  if (playlist === SITE_TRACKS) return;
  playlist = SITE_TRACKS;
  loadTrack(0);
  if (firstSiteSong) music.src = firstSiteSong;
  music.play().catch(() => {});
};

music.addEventListener('playing', showTrack);
music.addEventListener('ended', () => { loadTrack(trackIndex + 1); music.play().catch(() => {}); });

loadTrack(0);

// The song line stays in the hero (the menu above it is fixed); line it up right under
// Film / Commercial / ES in the top-right corner
const musicLine = document.getElementById('musicLine');
const topMenu   = document.querySelector('.corner.top-right');
function placeMusicLine() {
  // The menu is fixed, so its position on screen is the same as at the top of the hero
  musicLine.style.top = topMenu.getBoundingClientRect().bottom + 8 + 'px';
}
placeMusicLine();
window.addEventListener('resize', placeMusicLine);
if (document.fonts) document.fonts.ready.then(placeMusicLine);

// The site's songs keep playing until the visitor clicks something else on the page
// (a link, a project, the hero / a reel, a button…). Then they stop; the song line
// under the name plays them again. The song line itself and the ES/EN toggle don't stop them.
document.addEventListener('click', e => {
  if (document.body.classList.contains('splash-open')) return; // still on the entry game
  if (e.target.closest('#nowPlaying, #langToggle')) return;
  if (e.target.closest('a, button, .hero-main, .work-row')) music.pause();
}, true);

// The song line is the play / pause button
const nowPlayingBtn  = document.getElementById('nowPlaying');
const nowPlayingIcon = document.getElementById('nowPlayingIcon');
nowPlayingBtn.addEventListener('click', () => {
  if (music.paused) music.play().catch(() => {});
  else music.pause();
});
music.addEventListener('play',  () => { nowPlayingIcon.textContent = '❚❚'; });
music.addEventListener('pause', () => { nowPlayingIcon.textContent = '▶'; });
