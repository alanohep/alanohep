// Work list — thumbnail preview following cursor
const preview = document.getElementById('thumb-preview');
const previewImg = preview.querySelector('img');
let visible = false;

document.querySelectorAll('.work-row[data-thumb]').forEach(row => {
  row.addEventListener('mouseenter', () => {
    previewImg.src = row.dataset.thumb;
    preview.classList.add('active');
    visible = true;
  });
  row.addEventListener('mouseleave', () => {
    preview.classList.remove('active');
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
