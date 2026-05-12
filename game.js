const canvas = document.getElementById('gameCanvas');
const ctx = canvas?.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const levelEl = document.getElementById('level');
const statusEl = document.getElementById('gameStatus');
const titleEl = document.getElementById('gameTitle');
const helpEl = document.getElementById('gameHelp');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const tabs = [...document.querySelectorAll('[data-game]')];

const size = 720;
let game = 'runner';
let running = false;
let score = 0;
let level = 1;
let best = Number(localStorage.getItem('arcadeBest') || 0);
let last = 0;
let keys = new Set();
let state = {};

const meta = {
  runner: {
    title: 'Neon Runner',
    help: 'Use arrow keys or WASD. On mobile, drag inside the game area. Collect blue sparks. Avoid red chasers.'
  },
  flappy: {
    title: 'Orbit Flap',
    help: 'Press Space, click, or tap to flap upward. Fly through the glowing gates without touching them.'
  },
  pong: {
    title: 'Solo Pong',
    help: 'Use arrow keys or drag to move the paddle. Keep the ball alive as long as possible.'
  }
};

function rand(min, max) { return Math.random() * (max - min) + min; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function hud() { scoreEl.textContent = score; bestEl.textContent = best; levelEl.textContent = level; }
function saveBest() { if (score > best) { best = score; localStorage.setItem('arcadeBest', String(best)); } hud(); }

function background() {
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 40, size / 2, size / 2, size);
  gradient.addColorStop(0, '#111827');
  gradient.addColorStop(1, '#050608');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  for (let i = 0; i <= size; i += 45) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
  }
}

function circle(obj, color, glow = color) {
  ctx.save(); ctx.shadowColor = glow; ctx.shadowBlur = 22; ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(obj.x, obj.y, obj.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

function setGame(next) {
  game = next;
  tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.game === game));
  titleEl.textContent = meta[game].title;
  helpEl.textContent = meta[game].help;
  running = false;
  reset();
}

function resetRunner() {
  state = {
    player: { x: size / 2, y: size / 2, r: 15, speed: 270 },
    spark: { x: rand(60, size - 60), y: rand(60, size - 60), r: 10 },
    enemies: [{ x: 80, y: 90, r: 16, speed: 100 }, { x: size - 80, y: size - 110, r: 16, speed: 118 }]
  };
}
function updateRunner(dt) {
  const p = state.player;
  let dx = 0, dy = 0;
  if (keys.has('ArrowUp') || keys.has('w')) dy--;
  if (keys.has('ArrowDown') || keys.has('s')) dy++;
  if (keys.has('ArrowLeft') || keys.has('a')) dx--;
  if (keys.has('ArrowRight') || keys.has('d')) dx++;
  if (dx || dy) { const l = Math.hypot(dx, dy); p.x += dx / l * p.speed * dt; p.y += dy / l * p.speed * dt; }
  p.x = clamp(p.x, p.r, size - p.r); p.y = clamp(p.y, p.r, size - p.r);
  state.enemies.forEach((e) => { const a = Math.atan2(p.y - e.y, p.x - e.x); e.x += Math.cos(a) * e.speed * dt; e.y += Math.sin(a) * e.speed * dt; });
  if (distance(p, state.spark) < p.r + state.spark.r + 4) {
    score += 10; level = 1 + Math.floor(score / 50); saveBest();
    state.enemies.forEach((e) => e.speed += 5);
    if (score % 70 === 0 && state.enemies.length < 5) state.enemies.push({ x: rand(40, size - 40), y: rand(40, size - 40), r: 15, speed: 105 + level * 10 });
    state.spark.x = rand(50, size - 50); state.spark.y = rand(50, size - 50);
  }
  if (state.enemies.some((e) => distance(p, e) < p.r + e.r - 2)) end(`Game over. Final score: ${score}.`);
}
function drawRunner() {
  background(); circle(state.spark, '#8ab4ff'); state.enemies.forEach((e) => circle(e, '#ff5d73'));
  const p = state.player; ctx.save(); ctx.shadowColor = '#fff'; ctx.shadowBlur = 20; ctx.fillStyle = '#f7f7f8'; ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2); ctx.restore();
}

function resetFlappy() {
  state = { bird: { x: 150, y: 330, r: 16, vy: 0 }, gates: [], tick: 0 };
  for (let i = 0; i < 4; i++) addGate(520 + i * 230);
}
function addGate(x = size + 40) { const gap = 176; const top = rand(90, size - gap - 120); state.gates.push({ x, w: 70, top, gap, passed: false }); }
function flap() { if (game === 'flappy') state.bird.vy = -360; }
function updateFlappy(dt) {
  const b = state.bird; b.vy += 780 * dt; b.y += b.vy * dt;
  state.gates.forEach((g) => g.x -= (185 + level * 12) * dt);
  if (state.gates[0]?.x < -90) { state.gates.shift(); addGate(); }
  for (const g of state.gates) {
    if (!g.passed && g.x + g.w < b.x) { g.passed = true; score += 10; level = 1 + Math.floor(score / 40); saveBest(); }
    const hitX = b.x + b.r > g.x && b.x - b.r < g.x + g.w;
    const hitY = b.y - b.r < g.top || b.y + b.r > g.top + g.gap;
    if (hitX && hitY) end(`Crashed. Final score: ${score}.`);
  }
  if (b.y < b.r || b.y > size - b.r) end(`Out of bounds. Final score: ${score}.`);
}
function drawFlappy() {
  background();
  ctx.fillStyle = '#8ab4ff';
  state.gates.forEach((g) => { ctx.fillRect(g.x, 0, g.w, g.top); ctx.fillRect(g.x, g.top + g.gap, g.w, size - g.top - g.gap); });
  circle(state.bird, '#f7f7f8', '#fff');
}

function resetPong() {
  state = { paddle: { x: size / 2 - 65, y: size - 58, w: 130, h: 16, speed: 390 }, ball: { x: size / 2, y: 240, r: 12, vx: 210, vy: 245 } };
}
function updatePong(dt) {
  const p = state.paddle, b = state.ball;
  if (keys.has('ArrowLeft') || keys.has('a')) p.x -= p.speed * dt;
  if (keys.has('ArrowRight') || keys.has('d')) p.x += p.speed * dt;
  p.x = clamp(p.x, 12, size - p.w - 12);
  b.x += b.vx * dt; b.y += b.vy * dt;
  if (b.x < b.r || b.x > size - b.r) b.vx *= -1;
  if (b.y < b.r) b.vy *= -1;
  if (b.y + b.r > p.y && b.y - b.r < p.y + p.h && b.x > p.x && b.x < p.x + p.w && b.vy > 0) {
    b.vy *= -1.05; b.vx += (b.x - (p.x + p.w / 2)) * 3.2; score += 5; level = 1 + Math.floor(score / 35); saveBest();
  }
  if (b.y > size + 30) end(`Ball missed. Final score: ${score}.`);
}
function drawPong() {
  background(); const p = state.paddle, b = state.ball;
  ctx.save(); ctx.shadowColor = '#fff'; ctx.shadowBlur = 18; ctx.fillStyle = '#f7f7f8'; ctx.fillRect(p.x, p.y, p.w, p.h); ctx.restore();
  circle(b, '#8ab4ff');
}

function reset() {
  score = 0; level = 1; hud(); statusEl.textContent = `${meta[game].title} ready.`; startBtn.textContent = 'Start game';
  if (game === 'runner') resetRunner();
  if (game === 'flappy') resetFlappy();
  if (game === 'pong') resetPong();
  draw();
}
function end(message) { running = false; statusEl.textContent = message; startBtn.textContent = 'Play again'; }
function draw() { if (!ctx) return; if (game === 'runner') drawRunner(); if (game === 'flappy') drawFlappy(); if (game === 'pong') drawPong(); }
function update(dt) { if (game === 'runner') updateRunner(dt); if (game === 'flappy') updateFlappy(dt); if (game === 'pong') updatePong(dt); }
function loop(time) { if (!running) { draw(); return; } const dt = Math.min((time - last) / 1000 || 0, 0.033); last = time; update(dt); draw(); requestAnimationFrame(loop); }
function start() { reset(); running = true; last = performance.now(); statusEl.textContent = `${meta[game].title} running.`; startBtn.textContent = 'Restart'; requestAnimationFrame(loop); }

window.addEventListener('keydown', (event) => { if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','w','a','s','d'].includes(event.key)) event.preventDefault(); keys.add(event.key); if (event.key === ' ') flap(); });
window.addEventListener('keyup', (event) => keys.delete(event.key));
canvas?.addEventListener('click', flap);
canvas?.addEventListener('pointermove', (event) => {
  if (!state.player && !state.paddle) return;
  const rect = canvas.getBoundingClientRect(); const x = ((event.clientX - rect.left) / rect.width) * size; const y = ((event.clientY - rect.top) / rect.height) * size;
  if (game === 'runner' && event.buttons) { state.player.x = x; state.player.y = y; }
  if (game === 'pong') state.paddle.x = clamp(x - state.paddle.w / 2, 12, size - state.paddle.w - 12);
});

tabs.forEach((tab) => tab.addEventListener('click', () => setGame(tab.dataset.game)));
startBtn?.addEventListener('click', start);
resetBtn?.addEventListener('click', () => { running = false; reset(); });
setGame('runner');
