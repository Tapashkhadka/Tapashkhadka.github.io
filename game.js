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
const fullscreenBtn = document.getElementById('fullscreenBtn');
const arcadeShell = document.getElementById('arcadeShell');
const tabs = [...document.querySelectorAll('[data-game]')];

const size = 720;
let game = 'runner';
let running = false;
let score = 0;
let level = 1;
let best = Number(localStorage.getItem('arcadeBest') || 0);
let last = 0;
let keys = new Set();
let pointer = { x: size / 2, y: size / 2, down: false, sx: 0, sy: 0 };
let state = {};

const meta = {
  runner: ['Neon Runner', 'Drag on mobile, or use arrows/WASD. Collect blue sparks and avoid red chasers.'],
  flappy: ['Orbit Flap', 'Tap anywhere to flap upward. Fly through glowing gates.'],
  pong: ['Solo Pong', 'Drag left/right or use arrows/WASD. Keep the ball alive.'],
  snake: ['Snake Grid', 'Swipe or use arrows/WASD. Eat sparks, avoid walls and yourself.'],
  breakout: ['Breakout', 'Drag the paddle. Break every block before the ball drops.'],
  catcher: ['Falling Stars', 'Drag the basket. Catch blue stars and avoid red hazards.'],
  shooter: ['Bubble Shooter', 'Tap to aim and shoot. Pop moving bubbles before they reach you.'],
  reflex: ['Reflex Tap', 'Tap the blue target as fast as possible. Avoid red decoys.']
};

function rand(min, max) { return Math.random() * (max - min) + min; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function hud() { scoreEl.textContent = score; bestEl.textContent = best; levelEl.textContent = level; }
function saveBest() { if (score > best) { best = score; localStorage.setItem('arcadeBest', String(best)); } hud(); }
function addScore(n) { score += n; level = 1 + Math.floor(score / 50); saveBest(); }
function end(msg) { running = false; statusEl.textContent = msg; startBtn.textContent = 'Play again'; }

function bg() {
  const g = ctx.createRadialGradient(size / 2, size / 2, 30, size / 2, size / 2, size);
  g.addColorStop(0, '#111827'); g.addColorStop(1, '#050608');
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  for (let i = 0; i <= size; i += 45) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
  }
}
function circle(o, color, glow = color) {
  ctx.save(); ctx.shadowColor = glow; ctx.shadowBlur = 20; ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function rect(x, y, w, h, color, glow = color) {
  ctx.save(); ctx.shadowColor = glow; ctx.shadowBlur = 14; ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h); ctx.restore();
}

function setGame(next) {
  game = next;
  tabs.forEach((t) => t.classList.toggle('active', t.dataset.game === game));
  titleEl.textContent = meta[game][0];
  helpEl.textContent = meta[game][1];
  running = false;
  reset();
}

function reset() {
  score = 0; level = 1; hud(); startBtn.textContent = 'Start'; statusEl.textContent = `${meta[game][0]} ready.`;
  const f = resets[game]; if (f) f(); draw();
}
function start() { reset(); running = true; last = performance.now(); statusEl.textContent = `${meta[game][0]} running.`; startBtn.textContent = 'Restart'; requestAnimationFrame(loop); }
function loop(t) { if (!running) { draw(); return; } const dt = Math.min((t - last) / 1000 || 0, 0.033); last = t; updates[game]?.(dt); draw(); requestAnimationFrame(loop); }
function draw() { if (!ctx) return; draws[game]?.(); }

const resets = {
  runner() { state = { p:{x:360,y:360,r:15,s:275}, spark:{x:rand(60,660),y:rand(60,660),r:10}, enemies:[{x:80,y:90,r:16,s:100},{x:640,y:610,r:16,s:118}] }; },
  flappy() { state = { b:{x:150,y:330,r:16,vy:0}, gates:[] }; for (let i=0;i<4;i++) addGate(520+i*230); },
  pong() { state = { p:{x:295,y:660,w:130,h:16,s:420}, b:{x:360,y:240,r:12,vx:220,vy:255} }; },
  snake() { state = { cell:24, snake:[{x:14,y:14},{x:13,y:14},{x:12,y:14}], dir:{x:1,y:0}, next:{x:1,y:0}, food:{x:20,y:14}, acc:0 }; placeFood(); },
  breakout() { state = { p:{x:280,y:660,w:160,h:16}, b:{x:360,y:540,r:11,vx:210,vy:-260}, blocks:[] }; for(let r=0;r<5;r++) for(let c=0;c<8;c++) state.blocks.push({x:52+c*78,y:82+r*34,w:58,h:18,hit:false}); },
  catcher() { state = { basket:{x:285,y:650,w:150,h:22}, drops:[], timer:0 }; },
  shooter() { state = { player:{x:360,y:640,r:18}, shots:[], bubbles:[], timer:0 }; },
  reflex() { state = { target:null, decoys:[], timer:0, life:20 }; spawnReflex(); }
};

function addGate(x=size+40){ const gap=176, top=rand(90,size-gap-120); state.gates.push({x,w:70,top,gap,passed:false}); }
function placeFood(){ const n=size/state.cell|0; do state.food={x:rand(1,n-1)|0,y:rand(1,n-1)|0}; while(state.snake.some(s=>s.x===state.food.x&&s.y===state.food.y)); }
function spawnReflex(){ state.target={x:rand(70,650),y:rand(110,610),r:rand(22,38)}; state.decoys=Array.from({length:Math.min(2+level,6)},()=>({x:rand(60,660),y:rand(90,630),r:rand(16,28)})); state.timer=2.2; }

const updates = {
  runner(dt){ const p=state.p; let dx=0,dy=0; if(keys.has('ArrowUp')||keys.has('w'))dy--; if(keys.has('ArrowDown')||keys.has('s'))dy++; if(keys.has('ArrowLeft')||keys.has('a'))dx--; if(keys.has('ArrowRight')||keys.has('d'))dx++; if(dx||dy){const l=Math.hypot(dx,dy);p.x+=dx/l*p.s*dt;p.y+=dy/l*p.s*dt;} p.x=clamp(p.x,p.r,size-p.r);p.y=clamp(p.y,p.r,size-p.r); state.enemies.forEach(e=>{const a=Math.atan2(p.y-e.y,p.x-e.x);e.x+=Math.cos(a)*e.s*dt;e.y+=Math.sin(a)*e.s*dt;}); if(dist(p,state.spark)<p.r+state.spark.r+4){addScore(10); state.enemies.forEach(e=>e.s+=5); if(score%70===0&&state.enemies.length<5)state.enemies.push({x:rand(40,680),y:rand(40,680),r:15,s:110+level*9}); state.spark.x=rand(50,670);state.spark.y=rand(50,670);} if(state.enemies.some(e=>dist(p,e)<p.r+e.r-2))end(`Game over. Final score: ${score}.`); },
  flappy(dt){ const b=state.b; b.vy+=780*dt;b.y+=b.vy*dt; state.gates.forEach(g=>g.x-=(185+level*12)*dt); if(state.gates[0]?.x<-90){state.gates.shift();addGate();} for(const g of state.gates){ if(!g.passed&&g.x+g.w<b.x){g.passed=true;addScore(10);} const hitX=b.x+b.r>g.x&&b.x-b.r<g.x+g.w, hitY=b.y-b.r<g.top||b.y+b.r>g.top+g.gap; if(hitX&&hitY)end(`Crashed. Final score: ${score}.`);} if(b.y<b.r||b.y>size-b.r)end(`Out of bounds. Final score: ${score}.`); },
  pong(dt){ const p=state.p,b=state.b; if(keys.has('ArrowLeft')||keys.has('a'))p.x-=p.s*dt; if(keys.has('ArrowRight')||keys.has('d'))p.x+=p.s*dt; p.x=clamp(p.x,12,size-p.w-12); b.x+=b.vx*dt;b.y+=b.vy*dt; if(b.x<b.r||b.x>size-b.r)b.vx*=-1; if(b.y<b.r)b.vy*=-1; if(b.y+b.r>p.y&&b.y-b.r<p.y+p.h&&b.x>p.x&&b.x<p.x+p.w&&b.vy>0){b.vy*=-1.05;b.vx+=(b.x-(p.x+p.w/2))*3.2;addScore(5);} if(b.y>size+30)end(`Ball missed. Final score: ${score}.`); },
  snake(dt){ const s=state; s.acc+=dt; if(keys.has('ArrowUp')||keys.has('w')) s.next={x:0,y:-1}; if(keys.has('ArrowDown')||keys.has('s')) s.next={x:0,y:1}; if(keys.has('ArrowLeft')||keys.has('a')) s.next={x:-1,y:0}; if(keys.has('ArrowRight')||keys.has('d')) s.next={x:1,y:0}; if(s.next.x!==-s.dir.x||s.next.y!==-s.dir.y)s.dir=s.next; if(s.acc<Math.max(.07,.16-level*.01))return; s.acc=0; const head={x:s.snake[0].x+s.dir.x,y:s.snake[0].y+s.dir.y}; const n=size/s.cell|0; if(head.x<0||head.y<0||head.x>=n||head.y>=n||s.snake.some(v=>v.x===head.x&&v.y===head.y)){end(`Snake crashed. Final score: ${score}.`);return;} s.snake.unshift(head); if(head.x===s.food.x&&head.y===s.food.y){addScore(10);placeFood();} else s.snake.pop(); },
  breakout(dt){ const p=state.p,b=state.b; if(keys.has('ArrowLeft')||keys.has('a'))p.x-=430*dt; if(keys.has('ArrowRight')||keys.has('d'))p.x+=430*dt; p.x=clamp(p.x,10,size-p.w-10); b.x+=b.vx*dt;b.y+=b.vy*dt; if(b.x<b.r||b.x>size-b.r)b.vx*=-1; if(b.y<b.r)b.vy*=-1; if(b.y+b.r>p.y&&b.x>p.x&&b.x<p.x+p.w&&b.vy>0){b.vy*=-1; b.vx+=(b.x-(p.x+p.w/2))*2;} for(const bl of state.blocks){ if(!bl.hit&&b.x>bl.x&&b.x<bl.x+bl.w&&b.y-b.r<bl.y+bl.h&&b.y+b.r>bl.y){bl.hit=true;b.vy*=-1;addScore(5);} } if(state.blocks.every(bl=>bl.hit))end(`You cleared the board. Score: ${score}.`); if(b.y>size+30)end(`Ball dropped. Final score: ${score}.`); },
  catcher(dt){ const c=state; if(keys.has('ArrowLeft')||keys.has('a'))c.basket.x-=430*dt; if(keys.has('ArrowRight')||keys.has('d'))c.basket.x+=430*dt; c.basket.x=clamp(c.basket.x,10,size-c.basket.w-10); c.timer-=dt; if(c.timer<=0){c.timer=Math.max(.22,.7-level*.04); c.drops.push({x:rand(25,695),y:-20,r:rand(10,18),bad:Math.random()<.24,vy:170+level*18});} c.drops.forEach(d=>d.y+=d.vy*dt); c.drops=c.drops.filter(d=>{const hit=d.y+d.r>c.basket.y&&d.x>c.basket.x&&d.x<c.basket.x+c.basket.w; if(hit){ if(d.bad)end(`Caught a hazard. Final score: ${score}.`); else addScore(5); return false;} return d.y<size+40;}); },
  shooter(dt){ const s=state; s.timer-=dt; if(s.timer<=0){s.timer=Math.max(.35,1.05-level*.05);s.bubbles.push({x:rand(50,670),y:-20,r:rand(15,28),vy:85+level*13});} s.shots.forEach(o=>{o.x+=o.vx*dt;o.y+=o.vy*dt;}); s.bubbles.forEach(b=>b.y+=b.vy*dt); for(const shot of s.shots)for(const b of s.bubbles)if(!b.dead&&dist(shot,b)<shot.r+b.r){b.dead=true;shot.dead=true;addScore(10);} s.shots=s.shots.filter(o=>!o.dead&&o.y>-30&&o.x>-30&&o.x<size+30); s.bubbles=s.bubbles.filter(b=>!b.dead&&b.y<size+70); if(s.bubbles.some(b=>b.y+b.r>s.player.y-s.player.r))end(`Bubbles reached you. Final score: ${score}.`); },
  reflex(dt){ state.timer-=dt; if(state.timer<=0){end(`Too slow. Final score: ${score}.`);} }
};

const draws = {
  runner(){ bg(); circle(state.spark,'#8ab4ff'); state.enemies.forEach(e=>circle(e,'#ff5d73')); const p=state.p; rect(p.x-p.r,p.y-p.r,p.r*2,p.r*2,'#f7f7f8','#fff'); },
  flappy(){ bg(); ctx.fillStyle='#8ab4ff'; state.gates.forEach(g=>{ctx.fillRect(g.x,0,g.w,g.top);ctx.fillRect(g.x,g.top+g.gap,g.w,size-g.top-g.gap);}); circle(state.b,'#f7f7f8','#fff'); },
  pong(){ bg(); const p=state.p,b=state.b; rect(p.x,p.y,p.w,p.h,'#f7f7f8','#fff'); circle(b,'#8ab4ff'); },
  snake(){ bg(); const c=state.cell; circle({x:state.food.x*c+c/2,y:state.food.y*c+c/2,r:c*.36},'#8ab4ff'); state.snake.forEach((s,i)=>rect(s.x*c+2,s.y*c+2,c-4,c-4,i?'#f7f7f8':'#8ab4ff',i?'#fff':'#8ab4ff')); },
  breakout(){ bg(); state.blocks.forEach(bl=>{if(!bl.hit)rect(bl.x,bl.y,bl.w,bl.h,'#8ab4ff');}); rect(state.p.x,state.p.y,state.p.w,state.p.h,'#f7f7f8','#fff'); circle(state.b,'#f7f7f8','#fff'); },
  catcher(){ bg(); rect(state.basket.x,state.basket.y,state.basket.w,state.basket.h,'#f7f7f8','#fff'); state.drops.forEach(d=>circle(d,d.bad?'#ff5d73':'#8ab4ff')); },
  shooter(){ bg(); circle(state.player,'#f7f7f8','#fff'); state.shots.forEach(s=>circle(s,'#8ab4ff')); state.bubbles.forEach(b=>circle(b,'#ff5d73')); },
  reflex(){ bg(); circle(state.target,'#8ab4ff'); state.decoys.forEach(d=>circle(d,'#ff5d73')); ctx.fillStyle='rgba(255,255,255,.7)'; ctx.font='28px system-ui'; ctx.fillText(`${Math.max(0,state.timer).toFixed(1)}s`, 28, 48); }
};

function point(event){ const r=canvas.getBoundingClientRect(); return {x:((event.clientX-r.left)/r.width)*size, y:((event.clientY-r.top)/r.height)*size}; }
function tapAction(p){
  if(game==='flappy') state.b.vy=-360;
  if(game==='shooter'&&running){ const a=Math.atan2(p.y-state.player.y,p.x-state.player.x); state.shots.push({x:state.player.x,y:state.player.y,r:7,vx:Math.cos(a)*520,vy:Math.sin(a)*520}); }
  if(game==='reflex'&&running){ if(dist(p,state.target)<state.target.r){addScore(10);spawnReflex();} else if(state.decoys.some(d=>dist(p,d)<d.r)) end(`Hit a decoy. Final score: ${score}.`); }
}
function dragAction(p){
  if(game==='runner'&&state.p){state.p.x=p.x;state.p.y=p.y;}
  if(game==='pong'&&state.p)state.p.x=clamp(p.x-state.p.w/2,12,size-state.p.w-12);
  if(game==='breakout'&&state.p)state.p.x=clamp(p.x-state.p.w/2,10,size-state.p.w-10);
  if(game==='catcher'&&state.basket)state.basket.x=clamp(p.x-state.basket.w/2,10,size-state.basket.w-10);
}
function swipeDirection(dx,dy){ if(Math.abs(dx)<20&&Math.abs(dy)<20)return; if(Math.abs(dx)>Math.abs(dy)){ state.next={x:Math.sign(dx),y:0}; } else state.next={x:0,y:Math.sign(dy)}; }

window.addEventListener('keydown', e=>{ if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','w','a','s','d'].includes(e.key))e.preventDefault(); keys.add(e.key); if(e.key===' ')tapAction({x:360,y:360}); });
window.addEventListener('keyup', e=>keys.delete(e.key));
canvas?.addEventListener('pointerdown', e=>{ e.preventDefault(); pointer.down=true; const p=point(e); pointer={...pointer,...p,sx:p.x,sy:p.y,down:true}; tapAction(p); dragAction(p); });
canvas?.addEventListener('pointermove', e=>{ if(!pointer.down)return; e.preventDefault(); const p=point(e); pointer.x=p.x; pointer.y=p.y; dragAction(p); });
window.addEventListener('pointerup', ()=>{ if(game==='snake') swipeDirection(pointer.x-pointer.sx,pointer.y-pointer.sy); pointer.down=false; });

async function enterFullscreen(){ const target=arcadeShell||document.documentElement; try{ if(document.fullscreenElement) await document.exitFullscreen(); else if(target.requestFullscreen) await target.requestFullscreen(); else if(target.webkitRequestFullscreen) target.webkitRequestFullscreen(); }catch(_){ statusEl.textContent='Fullscreen may be blocked, but this page is already arcade-sized.'; } }
document.addEventListener('fullscreenchange',()=>{ fullscreenBtn.textContent=document.fullscreenElement?'×':'⛶'; });
window.addEventListener('resize', draw); window.addEventListener('orientationchange',()=>setTimeout(draw,250));
tabs.forEach(tab=>tab.addEventListener('click',()=>setGame(tab.dataset.game)));
startBtn?.addEventListener('click', start); resetBtn?.addEventListener('click',()=>{running=false;reset();}); fullscreenBtn?.addEventListener('click', enterFullscreen);
setGame('runner');
