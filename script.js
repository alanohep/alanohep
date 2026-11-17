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

// Background music
// Plays the tracks below in order and loops back to the first when the last one ends.
// It starts with the snake game on the entry screen (snake.js) and stops when the visitor
// enters the site; the song line under the name in the top-left corner plays / pauses it.
const MUSIC_TRACKS = [
  { src: 'music/pt1.m4a', title: 'Fallen Waves - Soundtrack Part 1' },
  { src: 'music/pt2.m4a', title: 'Fallen Waves - Soundtrack Part 2' },
  { src: 'music/pt3.m4a', title: 'Fallen Waves - Soundtrack Part 3' },
  { src: 'music/pt4.m4a', title: 'Fallen Waves - Soundtrack Part 4' },
  { src: 'music/pt5.m4a', title: 'Fallen Waves - Soundtrack Part 5' },
];

const music           = document.getElementById('bgMusic');
const nowPlayingTitle = document.getElementById('nowPlayingTitle');
let trackIndex = 0;

function loadTrack(index) {
  trackIndex = index % MUSIC_TRACKS.length;
  music.src = MUSIC_TRACKS[trackIndex].src;
}

function showTrack() {
  // Replace the "Play music" hint; drop its translations so the language toggle doesn't bring it back
  nowPlayingTitle.removeAttribute('data-en');
  nowPlayingTitle.removeAttribute('data-es');
  nowPlayingTitle.textContent = MUSIC_TRACKS[trackIndex].title;
}

music.addEventListener('playing', showTrack);
music.addEventListener('ended', () => { loadTrack(trackIndex + 1); music.play().catch(() => {}); });

loadTrack(0);

// The song line stays in the hero (the name above it is fixed); line it up right under "Lead Editor"
const musicLine = document.getElementById('musicLine');
const heroRole  = document.querySelector('.hero-role');
function placeMusicLine() {
  // "Lead Editor" is fixed, so its position on screen is the same as at the top of the hero
  musicLine.style.top = heroRole.getBoundingClientRect().bottom + 5 + 'px';
}
placeMusicLine();
window.addEventListener('resize', placeMusicLine);
if (document.fonts) document.fonts.ready.then(placeMusicLine);

// The song line is the play / pause button
const nowPlayingBtn  = document.getElementById('nowPlaying');
const nowPlayingIcon = document.getElementById('nowPlayingIcon');
nowPlayingBtn.addEventListener('click', () => {
  if (music.paused) music.play().catch(() => {});
  else music.pause();
});
music.addEventListener('play',  () => { nowPlayingIcon.textContent = '❚❚'; });
music.addEventListener('pause', () => { nowPlayingIcon.textContent = '▶'; });
