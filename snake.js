// Entry screen: a full-screen retro snake game on an LCD-style screen.
// - It opens paused, mid-game: a long snake coiled at random across the board.
// - Any key / tap starts it. The ENTER button in the middle of the board is a wall for the
//   snake; clicking it goes straight to the site.
// - The music starts with the game (browsers only allow sound after a key press / tap).
// - Losing (hitting a wall, ENTER or itself) or clicking ENTER stops the music and reveals
//   the site, where the song line under the name lets the visitor play it again.
(() => {
  const splash   = document.getElementById('splash');
  const canvas   = document.getElementById('snake');
  const enterBtn = document.getElementById('splashEnter');
  const music    = document.getElementById('bgMusic');
  if (!splash || !canvas) return;

  const ctx = canvas.getContext('2d');
  const LCD_BG = '#f5c400'; // yellow
  const LCD_FG = '#0a0a0a'; // black
  const HEADER = 1.8;                       // top bar (name + score), in cells
  const FOOTER = 1.6;                       // bottom bar (instructions), in cells
  const BLOCK = { x: 0, y: 0, w: 7, h: 3 }; // cells covered by the ENTER button (centred in layout())
  const FILL = 0.3;                         // share of the free board the starting snake covers

  const touchDevice = matchMedia('(pointer: coarse)').matches;
  const HINT = touchDevice ? 'TAP TO PLAY' : 'PRESS ANY KEY TO PLAY';

  // The board fills the screen: cell size comes from the screen, then as many cells as fit
  let cell = 16, COLS = 24, ROWS = 16, ox = 0, oy = 0, W = 0, H = 0;
  let snake, dir, queue, food, score, interval, state = 'ready', last = 0, acc = 0, raf = 0, done = false;

  const inBoard = p => p.x >= 0 && p.y >= 0 && p.x < COLS && p.y < ROWS;
  const inBlock = p => p.x >= BLOCK.x && p.x < BLOCK.x + BLOCK.w && p.y >= BLOCK.y && p.y < BLOCK.y + BLOCK.h;
  const onSnake = p => snake.some(s => s.x === p.x && s.y === p.y);
  const DIRS = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ─── Random mid-game position ───
  // Grows a long self-avoiding path with a randomised depth-first search. Preferring the
  // neighbour with the fewest free exits (Warnsdorff's rule) keeps it hugging itself, so it
  // coils tightly instead of boxing itself in.
  function randomPath(length) {
    const key = p => p.y * COLS + p.x;
    const used = new Set();
    const free = p => inBoard(p) && !inBlock(p) && !used.has(key(p));
    const exits = p => DIRS.reduce((n, d) => n + (free({ x: p.x + d.x, y: p.y + d.y }) ? 1 : 0), 0);

    let start;
    do { start = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }; } while (inBlock(start));
    const path = [start];
    used.add(key(start));
    const options = [null];
    let budget = 60000;

    while (path.length < length && budget-- > 0) {
      const top = path.length - 1;
      if (options[top] === null) {
        const here = path[top];
        options[top] = shuffle(DIRS.map(d => ({ x: here.x + d.x, y: here.y + d.y })).filter(free))
          .sort((a, b) => exits(a) - exits(b) + (Math.random() - 0.5) * 1.5);
      }
      const next = options[top].shift();
      if (next) {
        path.push(next);
        used.add(key(next));
        options.push(null);
      } else {
        if (path.length === 1) break;
        used.delete(key(path.pop()));
        options.pop();
      }
    }
    return path;
  }

  // Free cells reachable from p (so the player isn't started in a dead end)
  function roomFrom(p, body) {
    const key = c => c.y * COLS + c.x;
    const blocked = new Set(body.map(key));
    const seen = new Set([key(p)]);
    const stack = [p];
    while (stack.length) {
      const c = stack.pop();
      for (const d of DIRS) {
        const n = { x: c.x + d.x, y: c.y + d.y };
        if (inBoard(n) && !inBlock(n) && !blocked.has(key(n)) && !seen.has(key(n))) { seen.add(key(n)); stack.push(n); }
      }
    }
    return seen.size;
  }

  function reset() {
    const freeCells = COLS * ROWS - BLOCK.w * BLOCK.h;
    const target = Math.max(12, Math.round(freeCells * FILL));
    let best = null;
    for (let attempt = 0; attempt < 40; attempt++) {
      const path = randomPath(target);
      if (path.length < 8) continue;
      const head = path[path.length - 1], neck = path[path.length - 2];
      const d = { x: head.x - neck.x, y: head.y - neck.y };
      const ahead = { x: head.x + d.x, y: head.y + d.y };
      const body = path.slice(0, -1);
      // Playable start: the cell ahead is free and the head has room to escape into
      if (!inBoard(ahead) || inBlock(ahead) || body.some(c => c.x === ahead.x && c.y === ahead.y)) continue;
      if (roomFrom(head, body) < 25) continue;
      if (!best || path.length > best.path.length) best = { path, d };
      if (path.length >= target) break;
    }
    if (best) {
      snake = best.path.slice().reverse(); // snake[0] is the head
      dir = best.d;
    } else {
      // Fallback: a short straight snake below ENTER
      const y = Math.min(ROWS - 2, BLOCK.y + BLOCK.h + 2);
      snake = [{ x: 6, y }, { x: 5, y }, { x: 4, y }, { x: 3, y }];
      dir = { x: 1, y: 0 };
    }
    queue = [];
    score = snake.length - 4;
    interval = 120;
    placeFood();
  }

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
    // Before the game starts, refit the board; once it's running keep the grid and only re-centre
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

    // Bottom bar: small centred instructions while paused
    if (state === 'ready') text(HINT, w / 2, bottom + (FOOTER * cell) / 2 + 2, Math.min(cell * 0.75, 18), 'center');

    // Faint LCD pixel grid
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
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

    // Snake: segments joined to the next one, so the coils read as one body
    const g = Math.max(2, Math.round(cell * 0.14)); // gap at the edge of each segment
    for (let i = 0; i < snake.length; i++) {
      const s = snake[i], px = s.x * cell, py = top + s.y * cell;
      ctx.fillRect(px + g, py + g, cell - 2 * g, cell - 2 * g);
      const n = snake[i + 1];
      if (n) {
        if (n.x > s.x) ctx.fillRect(px + cell - g, py + g, 2 * g, cell - 2 * g);
        if (n.x < s.x) ctx.fillRect(px - g, py + g, 2 * g, cell - 2 * g);
        if (n.y > s.y) ctx.fillRect(px + g, py + cell - g, cell - 2 * g, 2 * g);
        if (n.y < s.y) ctx.fillRect(px + g, py - g, cell - 2 * g, 2 * g);
      }
    }
    // Head: a full cell with an eye
    const h = snake[0], hx = h.x * cell, hy = top + h.y * cell;
    ctx.fillRect(hx + 1, hy + 1, cell - 2, cell - 2);
    ctx.fillStyle = LCD_BG;
    const e = Math.max(2, Math.round(cell * 0.18));
    const ex = hx + cell / 2 + dir.x * cell * 0.18 - e / 2 + dir.y * cell * 0.18;
    const ey = hy + cell / 2 + dir.y * cell * 0.18 - e / 2 - dir.x * cell * 0.18;
    ctx.fillRect(Math.round(ex), Math.round(ey), e, e);
  }

  // ─── Game loop ───
  function step() {
    if (queue.length) dir = queue.shift();
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    const eating = head.x === food.x && head.y === food.y;
    const body = eating ? snake : snake.slice(0, -1); // the tail moves away unless we grow
    if (!inBoard(head) || inBlock(head) || body.some(s => s.x === head.x && s.y === head.y)) return gameOver();

    snake.unshift(head);
    if (eating) {
      score += 1;
      interval = Math.max(65, interval - 3);
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
    if (music && music.paused) music.play().catch(() => {}); // inside the key press / tap, so it's allowed
    state = 'playing';
    last = performance.now();
    acc = 0;
    draw();
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
    if (music) music.pause();
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
    if (e.metaKey || e.ctrlKey || e.altKey) return;                       // leave browser shortcuts alone
    const k = KEYS[e.key];
    if (k || e.key === ' ') e.preventDefault();
    if (state === 'ready') { start(); return; } // any key starts; the snake keeps its current heading
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
    if (state === 'ready') { start(); return; } // first tap / swipe only starts the game
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) turn(Math.sign(dx), 0);
    else turn(0, Math.sign(dy));
  });

  canvas.addEventListener('click', start);
  enterBtn.addEventListener('click', e => { e.stopPropagation(); enterSite(); });

  layout();
  window.addEventListener('resize', layout);
  if (document.fonts) document.fonts.ready.then(draw);
})();
