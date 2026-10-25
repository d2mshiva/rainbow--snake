/* ===== 3. SCRIPT ===== */
(() => {
  'use strict';

  /* ---------- Setup ---------- */
  const COLS = 20, ROWS = 20, CELL = 30;
  const BEST_KEY = 'rainbow-snake-best';
  const DIRS = {
    up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
    left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
  };
  const KEYMAP = {
    arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down',
    arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right',
  };

  // Milliseconds per move at level 1. Lower number = faster snake.
  const SPEEDS = { slow: 190, normal: 140, fast: 100, insane: 70 };
  const SPEED_ORDER = ['slow', 'normal', 'fast', 'insane'];
  const SPEED_KEY = 'rainbow-snake-speed';
  const LEVEL_STEP_MS = 6;   // every 5 points the snake gets this much faster
  const MIN_TICK_MS = 45;    // never faster than this

  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  canvas.width = COLS * CELL;
  canvas.height = ROWS * CELL;

  const el = {
    score: document.getElementById('score'),
    best: document.getElementById('best'),
    level: document.getElementById('level'),
    overlay: document.getElementById('overlay'),
    title: document.getElementById('overlayTitle'),
    text: document.getElementById('overlayText'),
    start: document.getElementById('startBtn'),
    reset: document.getElementById('resetBtn'),
  };

  const speedBtns = document.querySelectorAll('.speed-btn');

  let snake, dir, queue, food, score, best, speed, state, tickMs, acc, last, particles, flash, newBest;

  /* ---------- Best score (per browser) ---------- */
  function loadBest() {
    try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch (e) { return 0; }
  }
  function saveBest(v) {
    try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) { /* ignore */ }
  }

  /* ---------- Speed setting ---------- */
  function loadSpeed() {
    try {
      const v = localStorage.getItem(SPEED_KEY);
      return SPEEDS[v] ? v : 'normal';
    } catch (e) { return 'normal'; }
  }
  function saveSpeed(v) {
    try { localStorage.setItem(SPEED_KEY, v); } catch (e) { /* ignore */ }
  }
  function currentTick() {
    return Math.max(MIN_TICK_MS, SPEEDS[speed] - Math.floor(score / 5) * LEVEL_STEP_MS);
  }
  function setSpeed(name) {
    if (!SPEEDS[name]) return;
    speed = name;
    saveSpeed(name);
    tickMs = currentTick();
    speedBtns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.speed === name)));
  }

  /* ---------- Game state ---------- */
  function reset() {
    snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    dir = DIRS.right;
    queue = [];
    score = 0;
    tickMs = currentTick();
    acc = 0;
    particles = [];
    flash = 0;
    newBest = false;
    state = 'ready';
    placeFood();
    updateHud();
    showOverlay('RAINBOW SNAKE', 'Press an arrow key, WASD or Start.');
    setStartLabel();
  }

  function begin() {
    state = 'running';
    acc = 0;
    last = performance.now();
    el.overlay.hidden = true;
    setStartLabel();
  }

  function pause() {
    state = 'paused';
    showOverlay('PAUSED', 'Press Space or Resume to keep going.');
    setStartLabel();
  }

  function gameOver() {
    state = 'over';
    showOverlay('GAME OVER', 'Score ' + score + (newBest ? ' - new best!' : '') + '. Press Play again or Reset.');
    setStartLabel();
  }

  function primary() {
    if (state === 'ready') begin();
    else if (state === 'running') pause();
    else if (state === 'paused') begin();
    else if (state === 'over') { reset(); begin(); }
  }

  function placeFood() {
    let spot;
    do {
      spot = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
    } while (snake.some(s => s.x === spot.x && s.y === spot.y));
    food = spot;
  }

  function turn(name) {
    if (state === 'over' || state === 'paused') return;
    const d = DIRS[name];
    const ref = queue.length ? queue[queue.length - 1] : dir;
    if (d === ref || (d.x === -ref.x && d.y === -ref.y)) return;
    if (queue.length < 2) queue.push(d);
    if (state === 'ready') begin();
  }

  function step() {
    if (queue.length) dir = queue.shift();
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    const eats = head.x === food.x && head.y === food.y;
    const body = eats ? snake : snake.slice(0, -1);
    const hitWall = head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS;
    if (hitWall || body.some(s => s.x === head.x && s.y === head.y)) { gameOver(); return; }

    snake.unshift(head);
    if (eats) {
      score++;
      burst(food);
      placeFood();
      flash = 1;
      if (score > best) { best = score; newBest = true; saveBest(best); }
      tickMs = currentTick();
      updateHud();
    } else {
      snake.pop();
    }
  }

  /* ---------- HUD ---------- */
  function updateHud() {
    el.score.textContent = score;
    el.best.textContent = best;
    el.level.textContent = Math.floor(score / 5) + 1;
  }
  function showOverlay(title, text) {
    el.title.textContent = title;
    el.text.textContent = text;
    el.overlay.hidden = false;
  }
  function setStartLabel() {
    el.start.textContent =
      state === 'running' ? 'Pause' :
      state === 'paused' ? 'Resume' :
      state === 'over' ? 'Play again' : 'Start';
  }

  /* ---------- Particles ---------- */
  function burst(cell) {
    const cx = cell.x * CELL + CELL / 2, cy = cell.y * CELL + CELL / 2;
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 220;
      particles.push({
        x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        hue: Math.random() * 360, life: 1, size: 3 + Math.random() * 5,
      });
    }
  }
  function updateParticles(dt) {
    const s = dt / 1000;
    particles.forEach(p => { p.x += p.vx * s; p.y += p.vy * s; p.life -= s * 1.8; });
    particles = particles.filter(p => p.life > 0);
    flash = Math.max(0, flash - s * 4);
  }

  /* ---------- Drawing ---------- */
  function rounded(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }

  function draw(now) {
    const t = now / 1000;

    // Rainbow checkerboard
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const hue = (x * 12 + y * 12 + t * 50) % 360;
        ctx.fillStyle = 'hsl(' + hue + ' 90% ' + ((x + y) % 2 ? 20 : 27) + '%)';
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      }
    }

    // Food
    const fx = food.x * CELL + CELL / 2, fy = food.y * CELL + CELL / 2;
    const fr = CELL * 0.32 + Math.sin(t * 6) * 3;
    const fh = (t * 200) % 360;
    ctx.shadowColor = 'hsl(' + fh + ' 100% 60%)';
    ctx.shadowBlur = 26;
    ctx.fillStyle = 'hsl(' + fh + ' 100% 62%)';
    ctx.beginPath(); ctx.arc(fx, fy, fr, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(fx, fy, fr + 4, 0, Math.PI * 2); ctx.stroke();

    // Snake: every segment gets its own hue, shifting over time
    for (let i = snake.length - 1; i >= 0; i--) {
      const s = snake[i];
      const hue = (i * 18 + t * 160) % 360;
      const pad = i === 0 ? 1 : 3;
      ctx.shadowColor = 'hsl(' + hue + ' 100% 60%)';
      ctx.shadowBlur = 14;
      ctx.fillStyle = 'hsl(' + hue + ' 100% 58%)';
      rounded(s.x * CELL + pad, s.y * CELL + pad, CELL - pad * 2, CELL - pad * 2, 9);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Eyes
    const hx = snake[0].x * CELL + CELL / 2, hy = snake[0].y * CELL + CELL / 2;
    const px = -dir.y, py = dir.x;
    [-1, 1].forEach(side => {
      const ex = hx + dir.x * 6 + px * 6 * side, ey = hy + dir.y * 6 + py * 6 * side;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(ex, ey, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#14022e';
      ctx.beginPath(); ctx.arc(ex + dir.x * 1.5, ey + dir.y * 1.5, 2.2, 0, Math.PI * 2); ctx.fill();
    });

    // Particles and eat flash
    particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = 'hsl(' + p.hue + ' 100% 60%)';
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1;
    if (flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (flash * 0.25) + ')';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  /* ---------- Main loop ---------- */
  function frame(now) {
    const dt = Math.min(now - last, 100);
    last = now;
    if (state === 'running') {
      acc += dt;
      while (acc >= tickMs && state === 'running') { acc -= tickMs; step(); }
    }
    updateParticles(dt);
    draw(now);
    requestAnimationFrame(frame);
  }

  /* ---------- Input ---------- */
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (KEYMAP[k]) { e.preventDefault(); turn(KEYMAP[k]); }
    else if (k === ' ') { e.preventDefault(); primary(); }
    else if (k === 'r') { reset(); }
    else if (k >= '1' && k <= '4') { setSpeed(SPEED_ORDER[Number(k) - 1]); }
  });

  speedBtns.forEach(btn => {
    btn.addEventListener('click', () => { setSpeed(btn.dataset.speed); btn.blur(); });
  });

  el.start.addEventListener('click', () => { primary(); el.start.blur(); });
  el.reset.addEventListener('click', () => { reset(); el.reset.blur(); });

  document.querySelectorAll('.pad').forEach(btn => {
    btn.addEventListener('pointerdown', e => { e.preventDefault(); turn(btn.dataset.dir); });
  });

  let touch = null;
  canvas.addEventListener('touchstart', e => {
    const t = e.changedTouches[0];
    touch = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  canvas.addEventListener('touchend', e => {
    if (!touch) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.x, dy = t.clientY - touch.y;
    touch = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 'right' : 'left');
    else turn(dy > 0 ? 'down' : 'up');
  }, { passive: true });

  /* ---------- Boot ---------- */
  best = loadBest();
  speed = loadSpeed();
  last = performance.now();
  reset();
  setSpeed(speed);
  requestAnimationFrame(frame);
})();