const canvas = document.getElementById('gameCanvas');
const ctx = canvas?.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const levelEl = document.getElementById('level');
const statusEl = document.getElementById('gameStatus');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');

const size = 720;
let keys = new Set();
let running = false;
let score = 0;
let best = Number(localStorage.getItem('neonRunnerBest') || 0);
let level = 1;
let last = 0;
let player;
let spark;
let chasers;

if (bestEl) bestEl.textContent = best;

function rand(min, max) { return Math.random() * (max - min) + min; }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

function resetGame() {
  score = 0;
  level = 1;
  player = { x: size / 2, y: size / 2, r: 15, speed: 270 };
  spark = { x: rand(60, size - 60), y: rand(60, size - 60), r: 10 };
  chasers = [
    { x: 80, y: 90, r: 16, speed: 100 },
    { x: size - 80, y: size - 110, r: 16, speed: 118 }
  ];
  updateHud();
  draw();
  if (statusEl) statusEl.textContent = 'Collect blue sparks. Avoid red chasers.';
}

function updateHud() {
  if (scoreEl) scoreEl.textContent = score;
  if (bestEl) bestEl.textContent = best;
  if (levelEl) levelEl.textContent = level;
}

function placeSpark() {
  do {
    spark.x = rand(50, size - 50);
    spark.y = rand(50, size - 50);
  } while (distance(spark, player) < 120);
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= size; i += 45) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }
}

function drawCircle(obj, color, glow) {
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = 22;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(obj.x, obj.y, obj.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function draw() {
  if (!ctx) return;
  ctx.clearRect(0, 0, size, size);
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 40, size / 2, size / 2, size);
  gradient.addColorStop(0, '#111827');
  gradient.addColorStop(1, '#050608');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  drawGrid();
  drawCircle(spark, '#8ab4ff', '#8ab4ff');
  chasers.forEach((enemy) => drawCircle(enemy, '#ff5d73', '#ff5d73'));
  ctx.save();
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#f7f7f8';
  ctx.fillRect(player.x - player.r, player.y - player.r, player.r * 2, player.r * 2);
  ctx.restore();
}

function update(delta) {
  let dx = 0;
  let dy = 0;
  if (keys.has('ArrowUp') || keys.has('w')) dy -= 1;
  if (keys.has('ArrowDown') || keys.has('s')) dy += 1;
  if (keys.has('ArrowLeft') || keys.has('a')) dx -= 1;
  if (keys.has('ArrowRight') || keys.has('d')) dx += 1;
  if (dx || dy) {
    const length = Math.hypot(dx, dy);
    player.x += (dx / length) * player.speed * delta;
    player.y += (dy / length) * player.speed * delta;
  }
  player.x = clamp(player.x, player.r, size - player.r);
  player.y = clamp(player.y, player.r, size - player.r);

  chasers.forEach((enemy) => {
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    enemy.x += Math.cos(angle) * enemy.speed * delta;
    enemy.y += Math.sin(angle) * enemy.speed * delta;
  });

  if (distance(player, spark) < player.r + spark.r + 4) {
    score += 10;
    level = 1 + Math.floor(score / 50);
    if (score > best) {
      best = score;
      localStorage.setItem('neonRunnerBest', String(best));
    }
    chasers.forEach((enemy) => { enemy.speed += 5; });
    if (score % 70 === 0 && chasers.length < 5) {
      chasers.push({ x: rand(40, size - 40), y: rand(40, size - 40), r: 15, speed: 105 + level * 10 });
    }
    placeSpark();
    updateHud();
  }

  if (chasers.some((enemy) => distance(player, enemy) < player.r + enemy.r - 2)) {
    running = false;
    if (statusEl) statusEl.textContent = `Game over. Final score: ${score}. Press Start game to try again.`;
    if (startBtn) startBtn.textContent = 'Play again';
  }
}

function loop(time) {
  if (!running) { draw(); return; }
  const delta = Math.min((time - last) / 1000 || 0, 0.033);
  last = time;
  update(delta);
  draw();
  requestAnimationFrame(loop);
}

function startGame() {
  resetGame();
  running = true;
  last = performance.now();
  if (startBtn) startBtn.textContent = 'Restart';
  if (statusEl) statusEl.textContent = 'Game running — stay alive.';
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(event.key)) event.preventDefault();
  keys.add(event.key);
});
window.addEventListener('keyup', (event) => keys.delete(event.key));

let dragging = false;
canvas?.addEventListener('pointerdown', () => { dragging = true; });
window.addEventListener('pointerup', () => { dragging = false; });
canvas?.addEventListener('pointermove', (event) => {
  if (!dragging || !player) return;
  const rect = canvas.getBoundingClientRect();
  player.x = ((event.clientX - rect.left) / rect.width) * size;
  player.y = ((event.clientY - rect.top) / rect.height) * size;
});

startBtn?.addEventListener('click', startGame);
resetBtn?.addEventListener('click', () => { running = false; resetGame(); if (startBtn) startBtn.textContent = 'Start game'; });
resetGame();
