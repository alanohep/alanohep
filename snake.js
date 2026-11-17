// Entry screen: a full-screen retro snake game on an LCD-style screen.
// - The first key press / tap / swipe starts the game and the music (browsers only allow
//   sound after an interaction).
// - The ENTER button sits in the middle of the board: clicking it goes straight to the site,
//   and for the snake it's a wall.
// - Losing (hitting a wall, ENTER or itself) shows GAME OVER, then reveals the site.
(() => {
  const splash   = document.getElementById('splash');
  const canvas   = document.getElementById('snake');
  const enterBtn = document.getElementById('splashEnter');
  const music    = document.getElementById('bgMusic');
  if (!splash || !canvas) return;

  const ctx = canvas.getContext('2d');
  const LCD_BG = '#b7c47a';
  const LCD_FG = '#26301a';
  const HEADER = 1.8;                  // top bar (name + score), in cells
  const FOOTER = 1.6;                  // bottom bar (instructions), in cells
  const BLOCK = { x: 0, y: 0, w: 7, h: 3 }; // cells covered by the ENTER button (centred in layout())

  const touchDevice = matchMedia('(pointer: coarse)').matches;
  const HINT = touchDevice ? 'SWIPE TO PLAY · LOSE TO ENTER ♪' : 'ARROW KEYS TO PLAY · LOSE TO ENTER ♪';

  // The board fills the screen: cell size comes from the screen, then as many cells as fit
  let cell = 16, COLS = 24, ROWS = 16, ox = 0, oy = 0, W = 0, H = 0;
  let snake, dir, queue, food, score, interval, state = 'ready', last = 0, acc = 0, raf = 0, done = false;

  function reset() {
    const y = Math.min(ROWS - 2, BLOCK.y + BLOCK.h + 2);
    snake = [{ x: 6, y }, { x: 5, y }, { x: 4, y }, { x: 3, y }];
    dir = { x: 1, y: 0 };
    queue = [];
    score = 0;
    interval = 140;
    placeFood();
  }

  const inBlock = p => p.x >= BLOCK.x && p.x < BLOCK.x + BLOCK.w && p.y >= BLOCK.y && p.y < BLOCK.y + BLOCK.h;
  const onSnake = p => snake.some(s => s.x === p.x && s.y === p.y);

  function placeFood() {
    let p;
    do { p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }; }
    while (inBlock(p) || onSnake(p));
    food = p;
  }

  // ─── Layout ───
  function layout() {
    W = window.innerWidth;
    H = window.innerHeight;
    // While a game is running keep the same grid (only re-centre it); before that, refit it
    if (state === 'ready') {
      cell = Math.max(14, Math.floor(Math.min(W, H) / 20));
      COLS = Math.floor(W / cell);
      ROWS = Math.floor(H / cell - HEADER - FOOTER);
      BLOCK.x = Math.floor((COLS - BLOCK.w) / 2);
      BLOCK.y = Math.floor((ROWS - BLOCK.h) / 2);
      reset();
    }
    ox = Math.floor((W - COLS * cell) / 2);
    oy = Math.floor((H - (ROWS + HEADER + FOOTER) * cell) / 2);

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';

    Object.assign(enterBtn.style, {
      left:   ox + BLOCK.x * cell + 'px',
      top:    oy + (HEADER + BLOCK.y) * cell + 'px',
      width:  BLOCK.w * cell + 'px',
      height: BLOCK.h * cell + 'px',
      fontSize: Math.round(cell * 1.6) + 'px',
    });
    draw();
  }

  // ─── Drawing ───
  function text(str, x, y, size, align = 'left') {
    ctx.fillStyle = LCD_FG;
    ctx.font = `${size}px VT323, monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }

  function draw() {
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = LCD_BG;
    ctx.fillRect(0, 0, W, H);
    ctx.translate(ox, oy);

    const w = cell * COLS, top = HEADER * cell, bottom = top + ROWS * cell;
    const size = Math.min(cell * 1.3, 34);

    // Top bar: name on the left, score (or GAME OVER) on the right
    const midY = top / 2;
    text('ALAN OHEP', cell * 0.3, midY, size);
    text(state === 'over' ? `GAME OVER  ${String(score).padStart(4, '0')}` : String(score).padStart(4, '0'),
         w - cell * 0.3, midY, size, 'right');
    ctx.fillStyle = LCD_FG;
    ctx.fillRect(0, top - 3, w, 3);
    ctx.fillRect(0, bottom + 1, w, 3);

    // Bottom bar: instructions
    text(HINT, w / 2, bottom + (FOOTER * cell) / 2 + 2, Math.min(cell * 0.95, 24), 'center');
    ctx.fillStyle = LCD_FG;

    // Faint LCD pixel grid
    ctx.fillStyle = 'rgba(38,48,26,0.06)';
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++)
        ctx.fillRect(x * cell + 1, top + y * cell + 1, cell - 2, cell - 2);

    // ENTER block (the button is drawn on top; this keeps the edges crisp)
    ctx.fillStyle = LCD_FG;
    ctx.fillRect(BLOCK.x * cell, top + BLOCK.y * cell, BLOCK.w * cell, BLOCK.h * cell);

    // Food: a small diamond
    const fx = food.x * cell + cell / 2, fy = top + food.y * cell + cell / 2, r = cell * 0.36;
    ctx.beginPath();
    ctx.moveTo(fx, fy - r); ctx.lineTo(fx + r, fy); ctx.lineTo(fx, fy + r); ctx.lineTo(fx - r, fy);
    ctx.closePath();
    ctx.fill();

    // Snake
    for (const s of snake) ctx.fillRect(s.x * cell + 1, top + s.y * cell + 1, cell - 2, cell - 2);
  }

  // ─── Game loop ───
  function step() {
    if (queue.length) dir = queue.shift();
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    const hitWall = head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS;
    const eating = head.x === food.x && head.y === food.y;
    const body = eating ? snake : snake.slice(0, -1); // the tail moves away unless we grow
    if (hitWall || inBlock(head) || body.some(s => s.x === head.x && s.y === head.y)) return gameOver();

    snake.unshift(head);
    if (eating) {
      score += 1;
      interval = Math.max(70, interval - 4);
      placeFood();
    } else {
      snake.pop();
    }
  }

  function frame(t) {
    if (state !== 'playing') return;
    acc += t - last;
    last = t;
    while (acc >= interval && state === 'playing') { acc -= interval; step(); }
    draw();
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (state !== 'ready' || done) return;
    state = 'playing';
    if (music && music.paused) music.play().catch(() => {});
    last = performance.now();
    acc = 0;
    raf = requestAnimationFrame(frame);
  }

  function gameOver() {
    state = 'over';
    cancelAnimationFrame(raf);
    draw();
    setTimeout(enterSite, 1600);
  }

  function turn(x, y) {
    const lastDir = queue.length ? queue[queue.length - 1] : dir;
    if ((x === -lastDir.x && y === -lastDir.y) || (x === lastDir.x && y === lastDir.y)) return;
    if (queue.length < 3) queue.push({ x, y });
  }

  // ─── Leaving the entry screen ───
  function enterSite() {
    if (done) return;
    done = true;
    state = 'over';
    cancelAnimationFrame(raf);
    if (music && music.paused) music.play().catch(() => {});
    splash.classList.add('hidden');
    document.body.classList.remove('splash-open');
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', layout);
    setTimeout(() => splash.remove(), 900);
  }

  // ─── Input ───
  const KEYS = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
    W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0],
  };

  function onKey(e) {
    if (e.key === 'Enter' && document.activeElement === enterBtn) return; // let the button handle it
    const k = KEYS[e.key];
    if (k || e.key === ' ') e.preventDefault();
    if (state === 'ready' && (k || e.key === ' ')) start();
    if (k && state === 'playing') turn(k[0], k[1]);
  }
  document.addEventListener('keydown', onKey, true);

  let touchStart = null;
  splash.addEventListener('touchstart', e => {
    const t = e.touches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });

  splash.addEventListener('touchend', e => {
    if (!touchStart || e.target === enterBtn) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x, dy = t.clientY - touchStart.y;
    touchStart = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) { start(); return; } // a tap
    start();
    if (Math.abs(dx) > Math.abs(dy)) turn(Math.sign(dx), 0);
    else turn(0, Math.sign(dy));
  });

  canvas.addEventListener('click', start);
  enterBtn.addEventListener('click', e => { e.stopPropagation(); enterSite(); });

  reset();
  layout();
  window.addEventListener('resize', layout);
  if (document.fonts) document.fonts.ready.then(draw);
})();
