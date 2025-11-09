/* 2nd Anniversary Adventure - Sunset Edition
   - One-player main character (boyfriend) with duck sidekick
   - On-screen joystick + keyboard controls
   - 8 shards revealed, final photo appears
   - Intro screen with sparkle transition
   - Looping WebAudio music (harp + ambience)
*/

const intro = document.getElementById('intro');
const introCanvas = document.getElementById('intro-canvas');
const gameArea = document.getElementById('game-area');
const gameCanvas = document.getElementById('game');
const ctx = gameCanvas.getContext('2d');
const introCtx = introCanvas.getContext('2d');
const collectedEl = document.getElementById('collected');
const totalEl = document.getElementById('total');
const ending = document.getElementById('ending');
const finalPhoto = document.getElementById('final-photo');
const musicBtn = document.getElementById('musicBtn');

const W = gameCanvas.width = 900;
const H = gameCanvas.height = 520;

totalEl.textContent = 8;
let collected = 0;
collectedEl.textContent = collected;

function fitIntroCanvas(){ introCanvas.width = intro.clientWidth; introCanvas.height = intro.clientHeight; }
fitIntroCanvas();
window.addEventListener('resize', fitIntroCanvas);

let introTicks = 0;
function drawIntro(){ const w = introCanvas.width, h = introCanvas.height; introCtx.clearRect(0,0,w,h); const g = introCtx.createLinearGradient(0,0,w,h); g.addColorStop(0,'#ffecd1'); g.addColorStop(0.5,'#ffc9a1'); g.addColorStop(1,'#8fb3a6'); introCtx.fillStyle = g; introCtx.fillRect(0,0,w,h); introCtx.fillStyle = 'rgba(255,255,255,0.65)'; const x = w*0.6; introCtx.fillRect(x, h*0.18 + Math.sin(introTicks*0.03)*6, w*0.08, h*0.6); introCtx.beginPath(); introCtx.arc(w*0.2, h*0.25, 80+10*Math.sin(introTicks*0.02), 0, Math.PI*2); introCtx.fillStyle = 'rgba(255,180,110,0.25)'; introCtx.fill(); for(let i=0;i<20;i++){ introCtx.fillStyle = 'rgba(255,255,220,'+ (0.3 + 0.7*Math.abs(Math.sin((introTicks+i)*0.02))) +')'; const sx = (i*47)%w; const sy = (i*31)%h; introCtx.fillRect((sx + 30*Math.sin(introTicks*0.02 + i))*0.9, sy*0.9 + 20*Math.cos(introTicks*0.01+i), 3,3); } introTicks++; requestAnimationFrame(drawIntro); }
drawIntro();

intro.addEventListener('click', ()=>{ sparkleTransition().then(()=>{ intro.classList.add('hidden'); gameArea.classList.remove('hidden'); if(!audioCtx) initAudio(); if(audioCtx.state === 'suspended') audioCtx.resume(); musicOn = true; musicBtn.textContent='Music: On'; loop(); }); });

function sparkleTransition(){ return new Promise(res=>{ const particles = []; const cx = introCanvas.width/2, cy = introCanvas.height/2; for(let i=0;i<120;i++){ particles.push({x:cx, y:cy, vx:(Math.random()-0.5)*8, vy:(Math.random()-0.6)*8, life:40+Math.random()*40, s:2+Math.random()*3}); } let t=0; function frame(){ introCtx.fillStyle='rgba(0,0,0,0.08)'; introCtx.fillRect(0,0,introCanvas.width, introCanvas.height); particles.forEach(p=>{ if(p.life>0){ p.x+=p.vx; p.y+=p.vy; p.life--; introCtx.fillStyle='rgba(255,240,200,'+(p.life/80)+')'; introCtx.fillRect(p.x,p.y,p.s,p.s); } }); t++; if(t<80) requestAnimationFrame(frame); else res(); } frame(); }); }

const totalShards = 8;
const shards = [];
const particles = [];
for(let i=0;i<totalShards;i++){ shards.push({x:60 + Math.random()*(W-120), y:80 + Math.random()*(H-160), r:12, collected:false}); }
const trees = [];
for(let i=0;i<18;i++){ trees.push({x:20 + Math.random()*(W-40), y:40 + Math.random()*(H-200), sz:30+Math.random()*40}); }

const player = {x:W/4, y:H-100, w:20, h:26, speed:2.6, color:'#b07a56', vx:0, vy:0};
const duck = {x:player.x-24, y:player.y+6, w:12, h:10, bob:0};

const keys = {};
window.addEventListener('keydown', e=>{ keys[e.key.toLowerCase()]=true; });
window.addEventListener('keyup', e=>{ keys[e.key.toLowerCase()]=false; });

const btns = document.querySelectorAll('#joystick .btn');
const active = {up:false,down:false,left:false,right:false};
btns.forEach(b=>{ const dir = b.dataset.dir; b.addEventListener('pointerdown', (e)=>{ e.preventDefault(); active[dir]=true; }); b.addEventListener('pointerup', (e)=>{ e.preventDefault(); active[dir]=false; }); b.addEventListener('pointerout', (e)=>{ e.preventDefault(); active[dir]=false; }); b.addEventListener('pointercancel', (e)=>{ e.preventDefault(); active[dir]=false; }); });

function movePlayer(){ let mx=0,my=0; if(keys['arrowup']||keys['w']||active.up) my -= 1; if(keys['arrowdown']||keys['s']||active.down) my += 1; if(keys['arrowleft']||keys['a']||active.left) mx -= 1; if(keys['arrowright']||keys['d']||active.right) mx += 1; if(mx!==0 && my!==0){ mx*=0.7071; my*=0.7071; } player.x += mx * player.speed; player.y += my * player.speed; player.x = Math.max(18, Math.min(W-18, player.x)); player.y = Math.max(18, Math.min(H-18, player.y)); duck.x += (player.x - 24 - duck.x) * 0.12; duck.y += (player.y + 6 - duck.y) * 0.12; duck.bob += 0.08; }

function drawBackground(){ const g = ctx.createLinearGradient(0,0,W,H); g.addColorStop(0,'#ffd7b8'); g.addColorStop(0.5,'#ffc39a'); g.addColorStop(1,'#9fd3c7'); ctx.fillStyle = g; ctx.fillRect(0,0,W,H); for(let i=0;i<3;i++){ ctx.fillStyle = 'rgba(40,60,40,'+(0.12 + i*0.05)+')'; ctx.beginPath(); ctx.ellipse(100 + i*260, 140 + i*10, 340 - i*80, 120 - i*30, 0, 0, Math.PI*2); ctx.fill(); } ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(W*0.6, H*0.25, 80, H*0.5); ctx.fillStyle = 'rgba(255,230,200,0.06)'; ctx.fillRect(W*0.6 - 60, H*0.6, 260, 40); trees.forEach(t=>{ ctx.fillStyle = 'rgba(20,60,40,0.95)'; ctx.beginPath(); ctx.ellipse(t.x, t.y, t.sz, t.sz*0.6, 0,0,Math.PI*2); ctx.fill(); ctx.fillStyle = 'rgba(255,240,200,0.06)'; ctx.fillRect(t.x-8, t.y-6, 6,6); }); }

function drawShards(){ shards.forEach(s=>{ if(s.collected) return; const grd = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, 18); grd.addColorStop(0, 'rgba(255,245,210,1)'); grd.addColorStop(0.6, 'rgba(255,180,140,0.95)'); grd.addColorStop(1, 'rgba(255,120,150,0.06)'); ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(s.x, s.y, s.r+6, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(s.x, s.y-7); ctx.lineTo(s.x+5, s.y); ctx.lineTo(s.x, s.y+7); ctx.lineTo(s.x-5, s.y); ctx.closePath(); ctx.fill(); }); }

function drawPlayer(){ ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(player.x-10, player.y+15, 28, 6); ctx.fillStyle = player.color; ctx.fillRect(player.x-8, player.y-6, 16, 18); ctx.fillStyle = 'rgba(255,215,150,0.9)'; ctx.fillRect(player.x-6, player.y+2, 4,2); ctx.fillRect(player.x+2, player.y+2, 4,2); ctx.fillStyle = '#f2d8c9'; ctx.fillRect(player.x-6, player.y-20, 12,12); ctx.fillStyle = '#2b2b2b'; ctx.fillRect(player.x-6, player.y-22, 12,4); ctx.fillStyle = '#111'; ctx.fillRect(player.x-3, player.y-15,2,2); ctx.fillRect(player.x+1, player.y-15,2,2); }

function drawDuck(){ ctx.save(); const bob = Math.sin(duck.bob)*2; ctx.fillStyle = '#fff2b8'; ctx.fillRect(duck.x-6, duck.y-4 + bob, 12,8); ctx.fillStyle = '#fff2b8'; ctx.fillRect(duck.x-4, duck.y-10 + bob, 8,6); ctx.fillStyle = '#ffb347'; ctx.fillRect(duck.x+4, duck.y-8 + bob, 4,3); ctx.fillStyle = '#111'; ctx.fillRect(duck.x-1, duck.y-8 + bob, 2,2); ctx.restore(); }

function checkPickups(){ shards.forEach((s, idx)=>{ if(s.collected) return; const dx = player.x - s.x, dy = player.y - s.y; const dist = Math.sqrt(dx*dx + dy*dy); if(dist < s.r + 14){ s.collected = true; collected++; collectedEl.textContent = collected; for(let i=0;i<18;i++){ particles.push({x:s.x, y:s.y, vx:(Math.random()-0.5)*4, vy:(Math.random()-0.9)*4, life:30+Math.random()*30}); } for(let j=0;j<6;j++){ particles.push({x:duck.x + (Math.random()-0.5)*12, y:duck.y + (Math.random()-0.5)*12, vx:(Math.random()-0.5)*2, vy:-Math.random()*2, life:20+Math.random()*30}); } playChime(); if(collected >= shards.length) finishGame(); } }); }

function drawParticles(){ for(let i=particles.length-1;i>=0;i--){ const p = particles[i]; p.x += p.vx; p.y += p.vy; p.life--; ctx.fillStyle = 'rgba(255,240,200,'+ (p.life/60) +')'; ctx.fillRect(p.x, p.y, 2,2); if(p.life<=0) particles.splice(i,1); } }

function finishGame(){ ending.classList.remove('hidden'); finalPhoto.style.opacity = '1.0'; finalPhoto.style.filter = 'brightness(1)'; running = false; }

document.getElementById('restart').addEventListener('click', ()=>{ shards.forEach(s=>{ s.collected=false; s.x = 60 + Math.random()*(W-120); s.y = 80 + Math.random()*(H-160); }); collected = 0; collectedEl.textContent = collected; ending.classList.add('hidden'); finalPhoto.style.opacity='0.0'; running = true; loop(); });

let audioCtx, masterGain, musicOn=false;
function initAudio(){ if(audioCtx) return; audioCtx = new (window.AudioContext || window.webkitAudioContext)(); masterGain = audioCtx.createGain(); masterGain.gain.value = 0.12; masterGain.connect(audioCtx.destination); const pad = audioCtx.createOscillator(); pad.type='sine'; pad.frequency.value = 220; const padGain = audioCtx.createGain(); padGain.gain.value = 0.02; pad.connect(padGain); padGain.connect(masterGain); pad.start(); const lfo = audioCtx.createOscillator(); lfo.frequency.value = 0.07; const lfoGain = audioCtx.createGain(); lfoGain.gain.value = 30; lfo.connect(lfoGain); lfoGain.connect(pad.frequency); lfo.start(); function pluck(){ const o = audioCtx.createOscillator(); o.type='triangle'; const g = audioCtx.createGain(); g.gain.value = 0.06; o.connect(g); g.connect(masterGain); o.frequency.value = 440 + Math.random()*140; o.start(); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.6); o.stop(audioCtx.currentTime + 1.7); } setInterval(pluck, 3500 + Math.random()*2000); }

function playChime(){ if(!audioCtx) return; const o = audioCtx.createOscillator(); o.type = 'sine'; const g = audioCtx.createGain(); g.gain.value = 0.0001; o.connect(g); g.connect(masterGain); o.frequency.value = 880 + Math.random()*220; o.start(); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.8); o.stop(audioCtx.currentTime + 0.82); }

musicBtn.addEventListener('click', ()=>{ if(!audioCtx) initAudio(); if(!musicOn){ audioCtx.resume(); musicOn=true; musicBtn.textContent='Music: On'; } else { audioCtx.suspend(); musicOn=false; musicBtn.textContent='Music: Off'; } });

let running=true;
function loop(){ if(!running) return; movePlayer(); ctx.clearRect(0,0,W,H); drawBackground(); drawShards(); drawPlayer(); drawDuck(); drawParticles(); checkPickups(); requestAnimationFrame(loop); }

gameCanvas.addEventListener('click', ()=>{ if(!audioCtx) initAudio(); if(audioCtx.state==='suspended') audioCtx.resume(); musicOn=true; musicBtn.textContent='Music: On'; });

const photo = new Image(); photo.src = 'final_photo.jpg'; photo.onload = ()=>{};
