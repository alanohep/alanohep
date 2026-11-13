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

// Spotify — background music
// The playlist starts when the page finishes loading and plays non-stop, looping from the top.
// Clicking anywhere on the page pauses it; clicking again resumes. If the browser blocks
// autoplay with sound, it starts with the visitor's first click instead.
// The current song is shown in the hero's bottom-left corner.
const SPOTIFY_PLAYLIST_ID = '0igatRylColKXp1IIfDh21'; // Dream Haze

// Track list of the playlist [track id, song, artist], in playlist order.
// If the playlist changes on Spotify, this list needs to be refreshed.
const SPOTIFY_TRACKS = [
  ["6ibiAgBvPvnAZsMr6e32IH", "Strangers", "Ruby Haunt"],
  ["0il7LJ828XyPqyvNx9cF5S", "You got time and I got money", "Smerz"],
  ["5BSFEeAykpOz160uZK4fcW", "Falling", "Acopia"],
  ["6ajfyxyUZ3dECuKi04vaR3", "Idle I'm - Colorama Coloured In Remix", "John Stammers, Colorama Coloured In, Colorama Coloured In Remix"],
  ["2LKOHdMsL0K9KwcPRlJK2v", "After Dark", "Mr.Kitty"],
  ["1e4kwCOOIv8OHBHSd3avgQ", "Baby", "Ariel Pink, DāM-FunK"],
  ["3NWTeiwILojiH2OM9IRVZb", "18 Years", "The Black Angels"],
  ["5wYsTtdq2c7ljXp4bIpfmH", "hi", "NEW YORK, Lolina"],
  ["6nzy9w5eKLZGz0UqO41fC5", "Another Day", "Human Tetris"],
  ["46ZLeoYZ4abozAWMqTB1TE", "El Jardín", "The Black Angels"],
  ["1FFmiaCi4Md97ANkP0U1zc", "grand theft auto", "sabrina palau"],
  ["1mh9zmkXOzqSVt8Gnc79RI", "perfect storm", "spirit blue"],
  ["7oFMyxHighYVebgKkyQ2G1", "Sunken", "Scratch Massive"],
  ["6vYoqwpLLtvfeRTo3gweoN", "It's Lovely, Come On In", "thredd"],
  ["74SUn8w4lYSwgOGPvVZiEo", "Gallowdance", "Lebanon Hanover"],
  ["4LRw4FEgsWAZ87EagBVQWd", "Dream Story", "Laura Groves"],
  ["4T1oZ3UAFKbraSp5JAISWW", "Monolith", "Twin Tribes"],
  ["11sfRkHdvsop5DdHVmGpt1", "Ring of Past", "Men I Trust"],
  ["5DKhWB2CyjHceyV75MdaF0", "Coffin", "pavlos"],
  ["0qnE2zGsoGm0GaWEYvMUUi", "Little Ghost", "Provoker"],
  ["7vvultYHYCuFk0AJWa5c9O", "Phantom", "Vestron Vulture"],
  ["61vULySTwSy8nXlrSU8j9Q", "Prisoner of Love", "Provoker"],
  ["2tpfPi4qSamU9EX5Q8FnNi", "Pain", "Boy Harsher"],
  ["7k04YZDaHaoMjOGKhcIFKc", "You Make Me Wanna Die", "Farah"],
  ["7KT3QK1mTErOIeXyBwsnA8", "Flinch Awake", "Provoker"],
  ["4qa6mMggRQGmiCXsGXkyJL", "céilí", "Mermaid Chunky"],
  ["2ndh30vZhrfL0Zpq8wRbvl", "You Could Have It", "Horse Vision"],
  ["5dF0HUts7TRFgYKRpXborR", "How Are We", "Horse Vision"],
  ["2O2TWBdW6bHRpNqOV9UpBa", "Clouds", "Maria Chiara Argirò"],
  ["0U0ldCRmgCqhVvD6ksG63j", "Nightcall", "Kavinsky"],
  ["068kLruVinypNfFPEujjSK", "September Again", "Nation of Language"],
  ["47tgNw681YONTIyoAS2Ski", "Come to the Fore - C Duncan Remix", "Fellini Félin, C Duncan"]
];

const nowPlaying      = document.getElementById('nowPlaying');
const nowPlayingTitle = document.getElementById('nowPlayingTitle');

let spotifyController = null;
let wantPlay = true;   // play as soon as the player is ready
let isPlaying = false;
let trackIndex = 0;
let lastDuration = 0;
let lastPosition = 0;
let nearTrackEnd = false;
let restartTimer = null;

function showTrack(index) {
  const t = SPOTIFY_TRACKS[index];
  if (!t) return;
  nowPlayingTitle.textContent = `${t[1]} — ${t[2]}`;
  nowPlaying.hidden = false;
}

// Figure out which song is playing: by its id when the player reports it,
// otherwise by counting track changes from the top of the playlist.
function updateTrack({ playingURI, duration, position }) {
  const id = String(playingURI || '').startsWith('spotify:track:') ? playingURI.split(':')[2] : null;
  const byId = id ? SPOTIFY_TRACKS.findIndex(t => t[0] === id) : -1;
  if (byId >= 0) {
    trackIndex = byId;
  } else if (lastDuration && (duration !== lastDuration || position < lastPosition - 5000)) {
    trackIndex = (trackIndex + 1) % SPOTIFY_TRACKS.length;
  }
  lastDuration = duration;
  lastPosition = position;
  showTrack(trackIndex);
}

function startPlayback() {
  wantPlay = true;
  spotifyController.play();
  // If the player wasn't ready to take the command yet, try once more
  setTimeout(() => { if (wantPlay && !isPlaying) spotifyController.play(); }, 1500);
}

// Loop: the player has no repeat option, so detect the end of the playlist ourselves —
// a track reached its last seconds, playback stopped, and no next track started.
function restartPlaylist() {
  restartTimer = null;
  nearTrackEnd = false;
  trackIndex = 0;
  lastDuration = 0;
  wantPlay = true;
  spotifyController.loadUri(`spotify:playlist:${SPOTIFY_PLAYLIST_ID}`);
}

function onPlaybackUpdate(e) {
  const { isPaused, position, duration } = e.data;
  isPlaying = !isPaused;
  if (isPlaying) {
    wantPlay = false;
    clearTimeout(restartTimer);
    restartTimer = null;
    nearTrackEnd = duration > 0 && duration - position < 3000;
    if (duration > 0) updateTrack(e.data);
  } else if (nearTrackEnd && !restartTimer && wantPlay === false && !pausedByClick) {
    restartTimer = setTimeout(restartPlaylist, 2500);
  }
}

let pausedByClick = false;

// Any click on the page pauses / resumes the music
document.addEventListener('pointerdown', () => {
  if (!spotifyController) return;
  if (isPlaying) {
    pausedByClick = true;
    clearTimeout(restartTimer);
    restartTimer = null;
    spotifyController.pause();
  } else {
    pausedByClick = false;
    startPlayback();
  }
}, true);

window.addEventListener('load', () => {
  window.onSpotifyIframeApiReady = IFrameAPI => {
    const host = document.createElement('div');
    document.getElementById('spotify-host').appendChild(host);
    IFrameAPI.createController(host, { uri: `spotify:playlist:${SPOTIFY_PLAYLIST_ID}`, width: 300, height: 80 }, controller => {
      spotifyController = controller;
      controller.addListener('ready', () => { if (wantPlay) startPlayback(); });
      controller.addListener('playback_update', onPlaybackUpdate);
    });
  };
  const script = document.createElement('script');
  script.src = 'https://open.spotify.com/embed/iframe-api/v1';
  script.async = true;
  document.body.appendChild(script);
});
