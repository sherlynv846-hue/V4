(() => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;

  const intro = document.getElementById("intro");
  const game = document.getElementById("game");
  const startBtn = document.getElementById("startBtn");
  const shardCountEl = document.getElementById("shardCount");
  const victoryEl = document.getElementById("victory");
  const pauseEl = document.getElementById("pause");
  const resumeBtn = document.getElementById("resumeBtn");
  const portalHintEl = document.getElementById("portalHint");
  const muteBtn = document.getElementById("muteBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const storyEl = document.getElementById("story");
  const storyTextEl = document.getElementById("storyText");
  const storySkipBtn = document.getElementById("storySkip");

  const PALETTES = [{
    sky:"#e9f4ef", far:"#b3d6c7", mid:"#89c3ac", near:"#6aa689", ground:"#7fb28f", platform:"#5a8f73"
  },{
    sky:"#eaf6fb", far:"#a9d3e6", mid:"#7fbad6", near:"#69a3c1", ground:"#87c0b3", platform:"#5aa391"
  }];

  const COLORS = {
    shardCore:"#bfe9ff", shardGlow:"rgba(173,216,255,0.65)",
    player:"#5c6aa8", skin:"#f6d7b0", duck:"#f3c350", beak:"#d28e2c", leg:"#b56b2a"
  };

  // WebAudio
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  let audioEnabled = true;
  function ping(freq, dur=0.08, type="sine", gain=0.05){
    if(!audioEnabled) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = gain;
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); setTimeout(()=>o.stop(), dur*1000);
  }
  function collectSound(){ ping(880,.07,"triangle",.05); ping(1320,.07,"triangle",.04); }
  function stepSound(){ ping(220,.03,"square",.03); }
  function quack(){ ping(300,.09,"square",.06); ping(260,.09,"square",.06); }
  let musicTimer = 0;
  function musicTick(t){
    if(!audioEnabled) return;
    if(t - musicTimer > 450){
      musicTimer = t;
      const seq = [523,659,784,659];
      ping(seq[Math.floor((t/450)%seq.length)], .08, "sine", .02);
    }
  }

  // Input
  const keys = new Set();
  window.addEventListener("keydown",(e)=>{
    const k = e.key.toLowerCase();
    keys.add(k);
    if(k==="q") quack();
    if((k==="p"||k==="escape") && started){ togglePause(); }
    if(k==="r" && state.victory) resetAndLoadArea(0);
  });
  window.addEventListener("keyup",(e)=>keys.delete(e.key.toLowerCase()));
  muteBtn?.addEventListener("click",()=>{ audioEnabled=!audioEnabled; muteBtn.textContent = audioEnabled? "🔊":"🔈"; });
  pauseBtn?.addEventListener("click",()=>togglePause());
  resumeBtn?.addEventListener("click",()=>togglePause());

  // World
  const GRAV = 0.9, FRICTION = 0.85;
  const state = { cameraX:0, victory:false, shardsCollected:0, area:0, paused:false };
  let started = false, storyPlaying = false;

  const LEVELS = [
    {
      platforms: [
        {x:-100,y:H-60,w:2000,h:60},
        {x:200,y:H-140,w:160,h:16},
        {x:420,y:H-200,w:140,h:16},
        {x:680,y:H-260,w:160,h:16},
        {x:980,y:H-220,w:140,h:16},
        {x:1240,y:H-180,w:160,h:16}
      ],
      shards: [
        {x:220,y:H-180,got:false},
        {x:460,y:H-240,got:false},
        {x:720,y:H-300,got:false},
        {x:1000,y:H-260,got:false}
      ],
      portal:{x:1500,y:H-140,w:42,h:64,active:false}
    },
    {
      platforms: [
        {x:-100,y:H-60,w:2200,h:60},
        {x:260,y:H-160,w:140,h:16},
        {x:520,y:H-210,w:160,h:16},
        {x:860,y:H-240,w:140,h:16},
        {x:1140,y:H-200,w:160,h:16},
        {x:1480,y:H-260,w:200,h:16}
      ],
      shards: [
        {x:290,y:H-200,got:false},
        {x:560,y:H-250,got:false},
        {x:900,y:H-280,got:false},
        {x:1520,y:H-300,got:false}
      ],
      portal:null,
      waterfall:{x:1000,y:H-60-200,w:120,h:200}
    }
  ];

  // Entities
  const player = { x:60,y:H-100,vx:0,vy:0,w:28,h:46,onGround:false,facing:1 };
  const duck   = { x:30,y:H-80,vx:0,vy:0,w:22,h:18,wobble:0 };

  // Sprites: assume 5 equal columns (female stand, male stand, female run, male run, duck)
  const spriteImg = new Image();
  spriteImg.src = "assets/splash_sprites.png";
  let spriteReady = false, frameW=0, frameH=0;
  spriteImg.onload = () => { frameW = spriteImg.width/5; frameH = spriteImg.height; spriteReady = true; };

  function aabb(a,b){ return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y; }
  function resolveCollisions(body){
    body.onGround = false;
    for(const p of LEVELS[state.area].platforms){
      if(aabb(body,p)){
        if(body.vy>0 && body.y+body.h - p.y < 20){ body.y=p.y-body.h; body.vy=0; body.onGround=true; }
        else if(body.vy<0 && p.y+p.h - body.y < 20){ body.y=p.y+p.h; body.vy=0; }
        else if(body.vx>0){ body.x=p.x - body.w; body.vx=0; }
        else if(body.vx<0){ body.x=p.x + p.w; body.vx=0; }
      }
    }
  }

  function drawParallax(){
    const pal = PALETTES[state.area];
    ctx.fillStyle = pal.sky; ctx.fillRect(0,0,W,H);
    const grad = ctx.createRadialGradient(W*0.8, H*0.2, 10, W*0.8, H*0.2, 260);
    grad.addColorStop(0,"rgba(255,255,255,0.9)"); grad.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);

    const cam = state.cameraX*0.2;
    ctx.fillStyle = pal.far;
    for(let i=0;i<8;i++){ const x=-cam+i*180-(state.cameraX%180); ctx.fillRect(x,H-180,120,180); ctx.fillRect(x+60,H-220,80,220); }

    const cam2 = state.cameraX*0.5;
    ctx.fillStyle = pal.mid;
    for(let i=0;i<8;i++){ const x=-cam2+i*220-(state.cameraX%220); ctx.fillRect(x,H-160,140,160); ctx.fillRect(x+90,H-200,100,200); }

    const cam3 = state.cameraX*0.8;
    ctx.fillStyle = pal.near;
    for(let i=0;i<12;i++){ const x=-cam3+i*140-(state.cameraX%140); ctx.beginPath(); ctx.ellipse(x,H-70,70,24,0,0,Math.PI*2); ctx.fill(); }

    ctx.fillStyle = pal.ground; ctx.fillRect(0,H-60,W,60);
  }
  function drawPlatforms(){
    ctx.fillStyle = PALETTES[state.area].platform;
    for(const p of LEVELS[state.area].platforms){
      const x = p.x - state.cameraX;
      if(x+p.w<-50||x>W+50) continue;
      ctx.fillRect(x,p.y,p.w,p.h);
    }
  }
  function drawShard(s, pulse){
    if(s.got) return;
    const x = s.x - state.cameraX, y = s.y;
    ctx.beginPath(); ctx.fillStyle = COLORS.shardGlow;
    ctx.ellipse(x,y,16+Math.sin(pulse)*2,12+Math.sin(pulse)*1.5,0,0,Math.PI*2); ctx.fill();
    ctx.save(); ctx.translate(x,y); ctx.rotate(Math.sin(pulse*1.2)*0.15);
    ctx.fillStyle = COLORS.shardCore;
    ctx.beginPath(); ctx.moveTo(0,-12); ctx.lineTo(10,0); ctx.lineTo(0,12); ctx.lineTo(-8,0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Waterfall particles in Area 2
  const drops = Array.from({length:120}, ()=>({x:0,y:0,v:0,alive:false}));
  function spawnDrop(){
    const wf = LEVELS[1].waterfall;
    const d = drops.find(o=>!o.alive);
    if(!d) return;
    d.x = wf.x + Math.random()*wf.w;
    d.y = wf.y + Math.random()*10;
    d.v = 2 + Math.random()*3;
    d.alive = true;
  }
  function updateWaterfall(){
    if(state.area!==1 || !LEVELS[1].waterfall) return;
    for(let i=0;i<4;i++) spawnDrop();
    const wf = LEVELS[1].waterfall;
    ctx.save();
    const x = wf.x - state.cameraX;
    const grad = ctx.createLinearGradient(x, wf.y, x+wf.w, wf.y+wf.h);
    grad.addColorStop(0, "rgba(173,216,255,0.7)");
    grad.addColorStop(1, "rgba(173,216,255,0.3)");
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(x, wf.y, wf.w, wf.h);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#bfe9ff";
    for(const d of drops){
      if(!d.alive) continue;
      d.y += d.v;
      if(d.y > wf.y + wf.h){ d.alive=false; continue; }
      ctx.fillRect(d.x - state.cameraX, d.y, 2, 6);
    }
    ctx.globalAlpha = 0.7;
    for(let i=0;i<6;i++){
      const sx = x + Math.random()*wf.w;
      ctx.fillRect(sx, wf.y+wf.h-2, 3, 2);
    }
    ctx.restore();
  }

  // Sprite drawing
  function drawPlayerSprite(){
    const x = player.x - state.cameraX, y = player.y;
    if(spriteReady){
      const idleIndex = 1, runIndex = 3;
      const srcX = ((Math.abs(player.vx) > 0.4) ? runIndex : idleIndex) * frameW;
      ctx.save();
      ctx.translate(x + player.w/2, y + player.h/2);
      if(player.facing<0) ctx.scale(-1,1);
      const scale = Math.min(player.w/frameW*1.5, 1.2);
      ctx.scale(scale, scale);
      ctx.drawImage(spriteImg, srcX, 0, frameW, frameH, -frameW/2, -frameH/2, frameW, frameH);
      ctx.restore();
    } else {
      ctx.fillStyle = COLORS.player; ctx.fillRect(x, y, player.w, player.h);
      ctx.fillStyle = COLORS.skin; ctx.fillRect(x+4, y+6, 10, 10);
    }
  }
  function drawDuckSprite(t){
    const x = duck.x - state.cameraX, y = duck.y;
    if(spriteReady){
      const duckIndex = 4, srcX = duckIndex * frameW;
      ctx.save();
      ctx.translate(x + duck.w/2, y + duck.h/2 + Math.sin(t*8 + duck.wobble)*1.5);
      const scale = Math.min(duck.w/frameW*1.1, 0.7);
      ctx.scale(scale, scale);
      ctx.drawImage(spriteImg, srcX, 0, frameW, frameH, -frameW/2, -frameH/2, frameW, frameH);
      ctx.restore();
    } else {
      ctx.save(); ctx.translate(x + duck.w/2, y + duck.h/2); ctx.translate(-duck.w/2, -duck.h/2);
      ctx.fillStyle = COLORS.duck; ctx.fillRect(2,6,18,10); ctx.fillRect(14,2,8,8);
      ctx.fillStyle = "#d28e2c"; ctx.fillRect(20,5,6,4); ctx.restore();
    }
  }

  function updateHUD(){ shardCountEl.textContent = `Shards: ${state.shardsCollected} / 8`; }

  // Story
  const storyLines = [
    "Long ago, eight light-blue shards kept the forest bright and kind.",
    "On your 2nd anniversary, they scattered across the woods.",
    "Find them together — with a loyal duck to guide the way."
  ];
  function playStory(){
    storyPlaying = true;
    storyEl.classList.remove("hidden");
    let idx=0, char=0;
    function typeNext(){
      if(!storyPlaying) return;
      if(idx >= storyLines.length) return;
      const line = storyLines[idx];
      storyTextEl.textContent = line.slice(0, char);
      char++;
      if(char > line.length){
        idx++; char = 0;
        if(idx >= storyLines.length) return;
        setTimeout(typeNext, 700);
      } else setTimeout(typeNext, 28);
    }
    typeNext();
  }
  storySkipBtn?.addEventListener("click", ()=>{ storyEl.classList.add("hidden"); storyPlaying=false; startLoop(); });

  // Main loop
  let last = 0;
  function loop(t){
    if(!started) return;
    const dt = Math.min(32, t - last)/16.666; last = t;
    if(state.paused){ requestAnimationFrame(loop); return; }

    musicTick(t);

    const left = keys.has("a")||keys.has("arrowleft");
    const right = keys.has("d")||keys.has("arrowright");
    const jump = keys.has(" ")||keys.has("space");

    if(left){ player.vx -= 0.8; player.facing=-1; if(player.onGround) stepSound(); }
    if(right){ player.vx += 0.8; player.facing=1;  if(player.onGround) stepSound(); }

    if(jump && player.onGround){ player.vy = -14; ping(520,.06,"sine",.05); }

    player.vx *= 0.85; player.vy += 0.9;
    player.x += player.vx; player.y += player.vy;
    resolveCollisions(player);

    // duck follow
    const targetX = player.x - 26 * player.facing;
    const targetY = player.y + 10;
    duck.vx += (targetX - duck.x) * 0.02;
    duck.vy += (targetY - duck.y) * 0.04 + 0.6;
    duck.vx *= 0.9; duck.vy *= 0.86;
    duck.x += duck.vx; duck.y += duck.vy;
    resolveCollisions(duck);

    state.cameraX = Math.max(0, player.x - W*0.4);

    const level = LEVELS[state.area];
    const pulse = t/400;
    for(const s of level.shards){
      if(!s.got){
        const box = {x:s.x-10,y:s.y-10,w:20,h:20};
        if(aabb({x:player.x,y:player.y,w:player.w,h:player.h},{...box})){
          s.got = true; state.shardsCollected++; collectSound(); updateHUD();
          if(state.shardsCollected >= 4 && state.area===0 && level.portal){ level.portal.active = true; portalHintEl.classList.remove("hidden"); }
          if(state.shardsCollected >= 8){ state.victory = true; victoryEl.classList.remove("hidden"); }
        }
      }
    }
    if(level.portal && level.portal.active){
      const p = level.portal;
      const box = {x:p.x, y:p.y, w:p.w, h:p.h};
      if(aabb({x:player.x,y:player.y,w:player.w,h:player.h}, box)){
        portalHintEl.classList.add("hidden");
        loadArea(1);
      }
    }

    // render
    drawParallax(); drawPlatforms();
    for(const s of level.shards) drawShard(s, pulse);
    if(level.portal && level.portal.active){
      const p = level.portal, x = p.x - state.cameraX, y = p.y;
      ctx.save();
      ctx.strokeStyle = "rgba(173,216,255,0.8)"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(x+p.w/2, y+p.h/2, p.w/2, p.h/2, 0, 0, Math.PI*2); ctx.stroke();
      ctx.restore();
    }
    // Waterfall scene in area 2
    updateWaterfall();

    drawPlayerSprite(); drawDuckSprite(t/1000);

    requestAnimationFrame(loop);
  }

  function resetAndLoadArea(areaIndex){
    for(const area of LEVELS){ for(const s of area.shards){ s.got=false; } if(area.portal) area.portal.active=false; }
    state.shardsCollected = 0; state.victory = false; updateHUD(); victoryEl.classList.add("hidden");
    loadArea(areaIndex);
  }
  function loadArea(areaIndex){
    state.area = areaIndex;
    player.x = 60; player.y = H-100; player.vx = player.vy = 0;
    duck.x = 30; duck.y = H-80; duck.vx = duck.vy = 0;
    state.cameraX = 0;
  }
  function togglePause(){ if(!started) return; state.paused = !state.paused; pauseEl.classList.toggle("hidden", !state.paused); }
  function startLoop(){ requestAnimationFrame(loop); }

  // Start: show story first
  startBtn.addEventListener("click", () => {
    intro.classList.add("hidden"); game.classList.remove("hidden");
    audioCtx.resume(); started = true; updateHUD(); playStory();
  });
})();