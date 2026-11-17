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

// Background music
// Plays the tracks below in order and loops back to the first when the last one ends.
// It tries to start as soon as the page loads; browsers usually block sound until the
// visitor interacts, so in that case it starts with the first click. After that, every
// click anywhere on the page pauses / resumes. The current track name is shown in the
// hero's bottom-left corner.
const MUSIC_TRACKS = [
  { src: 'music/pt1.m4a', title: 'Part 1' },
  { src: 'music/pt2.m4a', title: 'Part 2' },
  { src: 'music/pt3.m4a', title: 'Part 3' },
  { src: 'music/pt4.m4a', title: 'Part 4' },
  { src: 'music/pt5.m4a', title: 'Part 5' },
];

const music           = document.getElementById('bgMusic');
const nowPlayingTitle = document.getElementById('nowPlayingTitle');
let trackIndex = 0;

function loadTrack(index) {
  trackIndex = index % MUSIC_TRACKS.length;
  music.src = MUSIC_TRACKS[trackIndex].src;
}

function showTrack() {
  // Replace the "Click to play" hint; drop its translations so the language toggle doesn't bring it back
  nowPlayingTitle.removeAttribute('data-en');
  nowPlayingTitle.removeAttribute('data-es');
  nowPlayingTitle.textContent = MUSIC_TRACKS[trackIndex].title;
}

music.addEventListener('playing', showTrack);
music.addEventListener('ended', () => { loadTrack(trackIndex + 1); music.play().catch(() => {}); });

// Any click / tap on the page pauses or resumes the music
document.addEventListener('pointerdown', () => {
  if (music.paused) music.play().catch(() => {});
  else music.pause();
}, true);

loadTrack(0);
// Try to start right away; if the browser blocks it, the first click starts it instead
music.play().catch(() => {});
