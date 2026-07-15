// =============================================
//  GUARDIANES DEL HUMEDAL — game.js v8
//  + Logos institucionales, tingua real,
//    fondo real, más tiempo de juego
// =============================================

const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');

canvas.addEventListener('touchstart',  e => e.preventDefault(), {passive:false});
canvas.addEventListener('touchmove',   e => e.preventDefault(), {passive:false});
canvas.addEventListener('touchend',    e => e.preventDefault(), {passive:false});
document.addEventListener('gesturestart', e => e.preventDefault());

function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
resize();
window.addEventListener('resize', () => { resize(); if (estado?.corriendo) recalcPiso(); });
window.addEventListener('orientationchange', () => { setTimeout(() => { resize(); if (estado?.corriendo) recalcPiso(); }, 300); });
function recalcPiso() {
  const isPortrait = canvas.height > canvas.width * 1.2;
  const gH = estado.guardian.h;
  const botonesH = Math.min(100, window.innerHeight * 0.14);
  estado.PISO = isPortrait
    ? Math.min(canvas.height * 0.65 - gH, canvas.height - gH - botonesH)
    : canvas.height - gH - botonesH;
  estado.guardian.y = Math.min(estado.guardian.y, estado.PISO);
}

// ── Audio ─────────────────────────────────
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
function getAudio() {
  if (!audioCtx) audioCtx = new AudioCtx();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
function playTone(freq, type, duration, vol=0.3, fadeOut=true) {
  try {
    const ac = getAudio();
    const osc = ac.createOscillator(); const gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    osc.type = type; osc.frequency.setValueAtTime(freq, ac.currentTime);
    gain.gain.setValueAtTime(vol, ac.currentTime);
    if (fadeOut) gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    osc.start(ac.currentTime); osc.stop(ac.currentTime + duration);
  } catch(e) {}
}
function soundJump()       { playTone(520,'square',0.12,0.18); setTimeout(()=>playTone(780,'square',0.08,0.12),60); }
function soundDoubleJump() { playTone(880,'sine',0.18,0.2); setTimeout(()=>playTone(1100,'sine',0.12,0.15),80); }
function soundLand()       { playTone(120,'sine',0.08,0.25,true); }
function soundHit()        { playTone(200,'sawtooth',0.22,0.35); setTimeout(()=>playTone(150,'sawtooth',0.15,0.25),80); }
function soundStomp()      { playTone(300,'square',0.05,0.4); setTimeout(()=>playTone(150,'square',0.12,0.3),50); }
function soundCollect()    { playTone(880,'sine',0.08,0.18); setTimeout(()=>playTone(1100,'sine',0.06,0.14),60); }
function soundCorrect()    { [523,659,784,1047].forEach((f,i)=>setTimeout(()=>playTone(f,'sine',0.18,0.28),i*90)); }
function soundWrong()      { playTone(220,'sawtooth',0.35,0.4); setTimeout(()=>playTone(160,'sawtooth',0.3,0.35),120); }
function soundWin()        { [523,659,784,1047,1319].forEach((f,i)=>setTimeout(()=>playTone(f,'triangle',0.25,0.3),i*100)); }
function soundPowerup()    { [660,880,1100].forEach((f,i)=>setTimeout(()=>playTone(f,'sine',0.15,0.25),i*70)); }

let musicInterval = null;
const MELODIA = [262,294,330,349,392,440,494,523];
let melIdx = 0;
function startMusic() {
  stopMusic();
  musicInterval = setInterval(() => {
    if (!estado?.corriendo || estado?.pausado) return;
    playTone(MELODIA[melIdx % MELODIA.length], 'sine', 0.45, 0.06, true);
    melIdx++;
  }, 350);
}
function stopMusic() { if (musicInterval) { clearInterval(musicInterval); musicInterval=null; } }

// ── Imágenes ──────────────────────────────
const IMG = {};
const SRC = { fondo:'fondo.jpg', guardian:'guardian.png', lodo:'lodo.png', basura:'basura.png', nube:'nube.png', tingua:'tingua.png', flor:'flor.png' };
let loaded = 0;
function cargarImagenes(cb) {
  loaded = 0;
  for (const [k,s] of Object.entries(SRC)) {
    const i = new Image(); i.src = s;
    const done = () => { loaded++; if (loaded === Object.keys(SRC).length) cb(); };
    i.onload = done; i.onerror = done; IMG[k] = i;
  }
}

// ── Preguntas (opción múltiple) ────────────
const PREGUNTAS = [
  {
    t: '¿Cuántos humedales urbanos tiene Bogotá aproximadamente?',
    ops: ['Menos de 5', 'Más de 13', 'Exactamente 7', 'Solo 2'],
    r: 1, f: '¡Correcto! Bogotá tiene más de 13 humedales urbanos registrados.'
  },
  {
    t: '¿Cómo se llama el ave endémica en peligro del humedal?',
    ops: ['Garza Real', 'Colibrí Andino', 'Tingua Bogotana', 'Pato Zambullidor'],
    r: 2, f: '¡Correcto! La Tingua Bogotana es una subespecie endémica en grave peligro.'
  },
  {
    t: '¿Bajo qué nivel de oxígeno disuelto no sobrevive la vida acuática?',
    ops: ['Bajo 8 mg/L', 'Bajo 10 mg/L', 'Bajo 6 mg/L', 'Bajo 4 mg/L'],
    r: 3, f: '¡Correcto! Por debajo de 4 mg/L la vida acuática no puede sobrevivir.'
  },
  {
    t: '¿En qué localidad de Bogotá está el Humedal Santa María del Lago?',
    ops: ['Suba', 'Engativá', 'Kennedy', 'Usaquén'],
    r: 1, f: '¡Correcto! Está en Engativá, noroccidente de Bogotá.'
  },
  {
    t: '¿Qué función cumplen las plantas acuáticas del humedal?',
    ops: ['Solo decorar', 'Atraer insectos dañinos', 'Filtrar contaminantes y oxigenar', 'Aumentar la temperatura'],
    r: 2, f: '¡Correcto! Filtran contaminantes y oxigenan el agua naturalmente.'
  },
  {
    t: '¿Cómo ayuda el humedal frente a las inundaciones de Bogotá?',
    ops: ['Las empeora', 'No tiene efecto', 'Solo protege zonas rurales', 'Actúa como esponja absorbiendo agua'],
    r: 3, f: '¡Correcto! El humedal absorbe el exceso de agua como una esponja natural.'
  },
  {
    t: '¿Qué efecto real tiene arrojar basura cerca del humedal?',
    ops: ['Solo afecta el paisaje', 'Libera toxinas que matan fauna', 'Mejora el suelo', 'No tiene impacto'],
    r: 1, f: '¡Correcto! La basura libera toxinas que contaminan el agua y destruyen la fauna.'
  },
  {
    t: '¿Qué almacenan los humedales que ayuda a combatir el cambio climático?',
    ops: ['Oxígeno puro', 'Minerales raros', 'Carbono', 'Hidrógeno'],
    r: 2, f: '¡Correcto! Son de los mayores almacenadores de carbono del planeta.'
  },
  {
    t: '¿Qué deposita el esmog de la Av. Boyacá en el humedal?',
    ops: ['Nada, está lejos', 'Agua limpia', 'Partículas tóxicas', 'Solo polvo inofensivo'],
    r: 2, f: '¡Correcto! El esmog deposita partículas tóxicas en el agua del humedal.'
  },
  {
    t: '¿Son artificiales los humedales bogotanos?',
    ops: ['Sí, todos son artificiales', 'No, son naturales aunque muy afectados', 'Solo algunos', 'Depende del tamaño'],
    r: 1, f: '¡Correcto! Son ecosistemas naturales, muy afectados por la urbanización.'
  },
];

// ── Constantes ────────────────────────────
const GRAVEDAD        = 0.55;
const GRAVEDAD_CAIDA  = 0.95;
const VEL_CORRE       = 5.5;
const VEL_ACELERACION = 0.28;
const VEL_FRICCION    = 0.78;
const FUERZA_SALTO    = -16;
const COYOTE_TIME     = 8;
const JUMP_BUFFER     = 10;
const META            = 350;

// Escala dinámica según pantalla
// En portrait usa canvas.width*1.5 como referencia para que los objetos no queden muy pequeños
function sc(base) {
  const isPortrait = canvas.height > canvas.width * 1.2;
  const ref = isPortrait ? canvas.width * 1.5 : canvas.width;
  return Math.round(base * Math.min(1.4, Math.max(0.5, ref / 900)));
}

const NIVELES = [
  { nombre:'Amanecer en el Humedal', velBase:3.2, intervalo:115 },
  { nombre:'Tarde nublada',          velBase:4.0, intervalo:95  },
  { nombre:'Noche de luna',          velBase:5.0, intervalo:78  },
];

// ── Teclas ────────────────────────────────
const K = {};
let jumpBuffer = 0;
window.addEventListener('keydown', e => {
  K[e.key] = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  if ((e.key==='ArrowUp'||e.key===' '||e.key==='w') && estado?.corriendo && !estado.pausado) {
    jumpBuffer = JUMP_BUFFER; saltar();
  }
});
window.addEventListener('keyup', e => { K[e.key] = false; });

// ── Controles móvil ───────────────────────
function setupTouch() {
  const izq   = document.getElementById('btn-izq');
  const der   = document.getElementById('btn-der');
  const jumpB = document.getElementById('btn-saltar');
  function on(btn, key) {
    btn.addEventListener('touchstart', e=>{ e.preventDefault(); e.stopPropagation(); K[key]=true; btn.classList.add('on'); }, {passive:false});
    btn.addEventListener('touchend',   e=>{ e.preventDefault(); e.stopPropagation(); K[key]=false; btn.classList.remove('on'); }, {passive:false});
    btn.addEventListener('touchcancel',e=>{ K[key]=false; btn.classList.remove('on'); });
    btn.addEventListener('mousedown', ()=>{ K[key]=true; btn.classList.add('on'); });
    btn.addEventListener('mouseup',   ()=>{ K[key]=false; btn.classList.remove('on'); });
    btn.addEventListener('mouseleave',()=>{ K[key]=false; btn.classList.remove('on'); });
  }
  on(izq,'ArrowLeft'); on(der,'ArrowRight');
  jumpB.addEventListener('touchstart', e=>{ e.preventDefault(); e.stopPropagation(); jumpB.classList.add('on'); jumpBuffer=JUMP_BUFFER; if(estado?.corriendo&&!estado.pausado) saltar(); }, {passive:false});
  jumpB.addEventListener('touchend',   e=>{ e.preventDefault(); jumpB.classList.remove('on'); }, {passive:false});
  jumpB.addEventListener('touchcancel',e=>{ jumpB.classList.remove('on'); });
  jumpB.addEventListener('mousedown',  ()=>{ jumpB.classList.add('on'); jumpBuffer=JUMP_BUFFER; if(estado?.corriendo&&!estado.pausado) saltar(); });
  jumpB.addEventListener('mouseup',    ()=>jumpB.classList.remove('on'));
}

// ── Botones de opciones múltiples ──────────
function setupBotonesOpciones() {
  for (let i=0; i<4; i++) {
    document.getElementById(`btn-op${i}`).addEventListener('click', () => {
      if (estado?.pregActiva) responder(i);
    });
  }
}

// ── Estado ────────────────────────────────
let estado;
function estadoInicial() {
  const isPortrait = canvas.height > canvas.width * 1.2;
  // En portrait el guardián es más grande (20% del ancho) para verse mejor
  const gW = Math.min(150, canvas.width * (isPortrait ? 0.20 : 0.13));
  const gH = gW * 1.3;
  const botonesH = Math.min(100, canvas.height * 0.14);
  // En portrait el piso queda al 65% de la altura para que no haya tanto espacio vacío arriba
  const PISO = isPortrait
    ? Math.min(canvas.height * 0.65 - gH, canvas.height - gH - botonesH)
    : canvas.height - gH - botonesH;
  return {
    corriendo:true, pausado:false,
    puntos:0, vidas:3, frame:0,
    fondoX:0, PISO,
    nivel:0, nivelAnterior:0,
    turbo:0, escudo:0,
    guardian:{
      x:100, y:PISO, vx:0, vy:0, w:gW, h:gH,
      enSuelo:true, doble:true, inv:0,
      coyote:0, prevY:PISO
    },
    enemigos:[], particulas:[], estrellas:[],
    powerups:[], plataformas:[], recolectables:[],
    tingua:{ x:-100, y:70 },
    flores: Array.from({length:8},()=>({ x:Math.random()*canvas.width*1.8, e:0.28+Math.random()*0.18 })),
    nubes: Array.from({length:5},()=>({ x:Math.random()*canvas.width, y:20+Math.random()*80, w:80+Math.random()*120, vel:0.3+Math.random()*0.4, alpha:0.5+Math.random()*0.4 })),
    timerE:0, timerP:0, timerPL:0, timerR:0,
    velE:3.2, mensajeT:0,
    pregActiva:false, pregActual:null, pregUsadas:[],
    comboCorrectas:0,
    animF:null,
  };
}

// ── Salto (coyote time + buffer + variable height) ──
function saltar() {
  const g = estado.guardian;
  const puedeJump = g.enSuelo || g.coyote > 0;
  if (puedeJump) {
    g.vy = FUERZA_SALTO; g.enSuelo=false; g.coyote=0; g.doble=true;
    soundJump(); spawn(g.x+g.w/2, g.y+g.h, '#a5d6a7', 9);
  } else if (g.doble) {
    g.vy = FUERZA_SALTO*0.82; g.doble=false;
    soundDoubleJump(); spawn(g.x+g.w/2, g.y+g.h/2, '#00e5ff', 12);
  }
}

// ── Partículas ────────────────────────────
function spawn(x,y,color,n) {
  for(let i=0;i<n;i++) estado.particulas.push({
    x,y, vx:(Math.random()-.5)*7, vy:(Math.random()-.5)*6-2,
    vida:35+Math.random()*25, max:60, color, r:2+Math.random()*4
  });
}
function spawnEstrellas(x,y) {
  for(let i=0;i<8;i++) {
    const ang=(i/8)*Math.PI*2;
    estado.estrellas.push({x,y,ax:Math.cos(ang)*5,ay:Math.sin(ang)*5,vida:30,max:30});
  }
}

// ── Power-ups ─────────────────────────────
const TIPOS_PU = [
  {tipo:'escudo',emoji:'🛡️',color:'#2196f3',dur:300,msg:'¡Escudo activado! Inmunidad temporal'},
  {tipo:'turbo', emoji:'⚡',color:'#ffeb3b',dur:200,msg:'¡Turbo! Velocidad aumentada'},
  {tipo:'vida',  emoji:'❤️',color:'#e91e63',dur:0,  msg:'¡+1 Vida extra!'},
];
function genPowerup() {
  const t=TIPOS_PU[Math.floor(Math.random()*TIPOS_PU.length)];
  const sz=sc(38);
  return {...t, x:canvas.width+30, y:estado.PISO-sc(40)-Math.random()*sc(80), w:sz, h:sz, vel:2.5, fn:0};
}

// ── Enemigos ──────────────────────────────
const TIPOS_EN = [
  {img:'lodo',   w:155,h:145,suelo:true,  msg:'🟤 ¡Lodo contaminante! Asfixia la vida del humedal.'},
  {img:'basura', w:165,h:150,suelo:true,  msg:'🗑️ ¡Basura! Los plásticos y residuos destruyen la fauna.'},
  {img:'nube',   w:140,h:125,suelo:false, msg:'☁️ ¡Nube tóxica! El esmog deteriora el ecosistema.'},
];
function genEnemigo() {
  const t=TIPOS_EN[Math.floor(Math.random()*TIPOS_EN.length)];
  const w=sc(t.w), h=sc(t.h);
  const y=t.suelo ? estado.PISO : estado.PISO - sc(80) - Math.random()*sc(120);
  return {...t, w, h, x:canvas.width+30, y, vel:estado.velE+Math.random()*1.3, onda:Math.random()*Math.PI*2, fn:0, hp:1};
}

// ── Plataformas ───────────────────────────
function genPlataforma() {
  const w = sc(120+Math.random()*140);
  const h = sc(18);
  const nivAltura = [0.55, 0.4, 0.28];
  const alt = nivAltura[Math.floor(Math.random()*3)];
  const y = estado.PISO * alt + estado.guardian.h * (1-alt);
  return { x:canvas.width+30, y, w, h, vel:2.2+Math.random()*1.2 };
}

// ── Recolectables (gotas de agua 💧) ──────
function genRecolectable() {
  // Aparece en suelo o sobre plataformas
  const enPlat = estado.plataformas.length > 0 && Math.random() < 0.4;
  let x, y;
  if (enPlat) {
    const pl = estado.plataformas[Math.floor(Math.random()*estado.plataformas.length)];
    x = pl.x + pl.w/2;
    y = pl.y - 28;
  } else {
    x = canvas.width + 30 + Math.random()*200;
    y = estado.PISO - 10;
  }
  const sz = sc(26);
  return { x, y, w:sz, h:sz, vel:2.5, fn:0, tipo: Math.random()<0.7?'gota':'estrella' };
}

// ── Colisiones ────────────────────────────
function choca(a,b,m=22) {
  return a.x+m<b.x+b.w-m && a.x+a.w-m>b.x+m &&
         a.y+m<b.y+b.h-m && a.y+a.h-m>b.y+m;
}
// Detección de pisar enemigo desde arriba
function stomping(g,e) {
  return g.vy > 0 &&
    g.y+g.h >= e.y &&
    g.y+g.h <= e.y + e.h*0.45 &&
    g.x+g.w-12 > e.x &&
    g.x+12 < e.x+e.w;
}
// Colisión con plataforma (desde arriba)
function aterrizaEnPlataforma(g,p) {
  return g.vy >= 0 &&
    g.prevY + g.h <= p.y + 4 &&
    g.y + g.h >= p.y &&
    g.x + g.w - 10 > p.x &&
    g.x + 10 < p.x + p.w;
}

// ── Pregunta (opción múltiple) ─────────────
function mostrarPregunta(en) {
  estado.pausado=true; estado.pregActiva=true;
  const disp=PREGUNTAS.filter((_,i)=>!estado.pregUsadas.includes(i));
  const pool=disp.length?disp:PREGUNTAS;
  const p=pool[Math.floor(Math.random()*pool.length)];
  estado.pregUsadas.push(PREGUNTAS.indexOf(p));
  estado.pregActual={...p,en};
  document.getElementById('texto-pregunta').textContent=p.t;
  for(let i=0;i<4;i++) {
    const btn=document.getElementById(`btn-op${i}`);
    btn.textContent=p.ops[i];
    btn.style.background='';
    btn.disabled=false;
  }
  document.getElementById('panel-pregunta').classList.remove('oculto');
}

function responder(idx) {
  const p=estado.pregActual;
  // Deshabilitar botones para evitar doble click
  for(let i=0;i<4;i++) document.getElementById(`btn-op${i}`).disabled=true;
  // Colorear respuesta
  document.getElementById(`btn-op${p.r}`).style.background='#2e7d32';
  if (idx!==p.r) document.getElementById(`btn-op${idx}`).style.background='#c62828';

  setTimeout(() => {
    document.getElementById('panel-pregunta').classList.add('oculto');
    if (idx===p.r) {
      estado.comboCorrectas++;
      const bonus=estado.comboCorrectas>=3?10:0;
      const pts=20+bonus;
      estado.puntos+=pts;
      const msg=bonus?`✅ ¡COMBO x${estado.comboCorrectas}! +${pts} pts — ${p.f}`:`✅ ¡Correcto! +${pts} pts — ${p.f}`;
      mostrarMsg(msg); soundCorrect();
      spawn(canvas.width/2,canvas.height/2,'#69f0ae',30);
      spawnEstrellas(canvas.width/2,canvas.height/2);
    } else {
      estado.comboCorrectas=0;
      estado.puntos=Math.max(0,estado.puntos-10);
      if (!estado.escudo) { estado.vidas--; estado.guardian.inv=90; }
      else { estado.escudo=0; }
      mostrarMsg(`❌ Incorrecto. -10 pts — ${p.f}`);
      soundWrong(); spawn(canvas.width/2,canvas.height/2,'#ff5252',30);
    }
    estado.enemigos=estado.enemigos.filter(e=>e!==p.en);
    actuHUD(); estado.pregActiva=false; estado.pausado=false;
    if (estado.vidas<=0) return fin(false);
    if (estado.puntos>=META) return fin(true);
  }, 600);
}

// ── HUD ───────────────────────────────────
function actuHUD(){
  document.getElementById('vidas').textContent='❤️ '.repeat(Math.max(0,estado.vidas)).trim()||'💀';
  document.getElementById('puntos').textContent=`Puntos: ${estado.puntos}`;
}
function mostrarMsg(t){
  const el=document.getElementById('mensaje-enemigo');
  el.textContent=t; el.style.opacity='1'; estado.mensajeT=260;
}

// ── Sprites ───────────────────────────────
function spr(key,x,y,w,h,alpha=1){
  const img=IMG[key]; ctx.save(); ctx.globalAlpha=alpha;
  if(img&&img.complete&&img.naturalWidth>0) ctx.drawImage(img,x,y,w,h);
  else{
    const c={guardian:'#4caf50',lodo:'#795548',basura:'#9e9e9e',nube:'#9c27b0',tingua:'#1565c0',flor:'#e3f2fd'};
    ctx.fillStyle=c[key]||'#888';
    ctx.beginPath(); ctx.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}
function sombra(x,y,w,alpha=0.22){
  ctx.save(); ctx.globalAlpha=alpha; ctx.fillStyle='#000';
  ctx.beginPath(); ctx.ellipse(x+w/2,y,w/2.2,8,0,0,Math.PI*2); ctx.fill(); ctx.restore();
}
function dibujarNube(x,y,w,alpha){
  ctx.save(); ctx.globalAlpha=alpha; ctx.fillStyle='#fff';
  const h=w*0.45;
  ctx.beginPath();
  ctx.arc(x+w*0.25,y+h*0.55,h*0.5,0,Math.PI*2);
  ctx.arc(x+w*0.5, y+h*0.35,h*0.65,0,Math.PI*2);
  ctx.arc(x+w*0.75,y+h*0.55,h*0.5,0,Math.PI*2);
  ctx.rect(x,y+h*0.4,w,h*0.6);
  ctx.fill(); ctx.restore();
}
function dibujarPowerup(pu){
  const bob=Math.sin(estado.frame/20+pu.x)*5;
  ctx.save(); ctx.shadowColor=pu.color; ctx.shadowBlur=15; ctx.globalAlpha=0.92;
  ctx.fillStyle=pu.color+'44';
  ctx.beginPath(); ctx.arc(pu.x+pu.w/2,pu.y+pu.h/2+bob,pu.w/2+4,0,Math.PI*2); ctx.fill();
  ctx.restore();
  ctx.font=`${pu.w*0.8}px Arial`; ctx.textAlign='center';
  ctx.fillText(pu.emoji,pu.x+pu.w/2,pu.y+pu.h*0.8+bob); ctx.textAlign='left';
}
function dibujarRecolectable(r){
  const bob=Math.sin(estado.frame/18+r.x)*4;
  ctx.save(); ctx.shadowColor='#00bcd4'; ctx.shadowBlur=12;
  ctx.font=`${r.w}px Arial`; ctx.textAlign='center';
  ctx.globalAlpha=0.92;
  ctx.fillText(r.tipo==='gota'?'💧':'⭐',r.x+r.w/2,r.y+r.h+bob);
  ctx.restore(); ctx.textAlign='left';
}
function dibujarPlataforma(p){
  // Cuerpo con degradado
  const gr=ctx.createLinearGradient(p.x,p.y,p.x,p.y+p.h);
  gr.addColorStop(0,'#66bb6a'); gr.addColorStop(1,'#2e7d32');
  ctx.fillStyle=gr; ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(p.x,p.y,p.w,p.h,6) : ctx.rect(p.x,p.y,p.w,p.h);
  ctx.fill();
  // Borde superior brillante
  ctx.strokeStyle='#a5d6a7'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(p.x+4,p.y+2); ctx.lineTo(p.x+p.w-4,p.y+2); ctx.stroke();
  // Sombra debajo
  ctx.save(); ctx.globalAlpha=0.15; ctx.fillStyle='#000';
  ctx.beginPath(); ctx.ellipse(p.x+p.w/2,p.y+p.h+6,p.w/2.2,6,0,0,Math.PI*2); ctx.fill(); ctx.restore();
}

// ── LOOP PRINCIPAL ────────────────────────
function loop(){
  if (!estado.corriendo) return;
  estado.animF=requestAnimationFrame(loop);
  estado.frame++;
  const {guardian:g, PISO}=estado;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const nv=NIVELES[estado.nivel]||NIVELES[0];

  // ── Fondo ──
  if (IMG.fondo?.complete&&IMG.fondo.naturalWidth>0){
    if(!estado.pausado) estado.fondoX-=0.7;
    if(estado.fondoX<=-canvas.width) estado.fondoX=0;
    ctx.drawImage(IMG.fondo,estado.fondoX,0,canvas.width,canvas.height);
    ctx.drawImage(IMG.fondo,estado.fondoX+canvas.width,0,canvas.width,canvas.height);
    if(estado.nivel>=2){ ctx.fillStyle='rgba(10,15,50,0.45)'; ctx.fillRect(0,0,canvas.width,canvas.height); }
  } else {
    const gr=ctx.createLinearGradient(0,0,0,canvas.height);
    if(estado.nivel===0){ gr.addColorStop(0,'#87ceeb'); gr.addColorStop(0.55,'#3a9e5f'); gr.addColorStop(1,'#1a5c32'); }
    if(estado.nivel===1){ gr.addColorStop(0,'#607d8b'); gr.addColorStop(0.55,'#2e7d32'); gr.addColorStop(1,'#1b5e20'); }
    if(estado.nivel===2){ gr.addColorStop(0,'#1a237e'); gr.addColorStop(0.55,'#1b5e20'); gr.addColorStop(1,'#0d3b1e'); }
    ctx.fillStyle=gr; ctx.fillRect(0,0,canvas.width,canvas.height);
    if(estado.nivel===2){
      for(let i=0;i<40;i++){
        const sx=(i*137.5+estado.frame*0.05)%canvas.width;
        const sy=(i*73)%(canvas.height*0.45);
        ctx.globalAlpha=Math.sin(estado.frame/30+i)*0.5+0.5;
        ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(sx,sy,1.2,0,Math.PI*2); ctx.fill();
      }
      ctx.globalAlpha=1;
    }
  }

  // ── Nubes ──
  for(const nc of estado.nubes){
    if(!estado.pausado) nc.x-=nc.vel;
    if(nc.x+nc.w<0) nc.x=canvas.width+20;
    dibujarNube(nc.x,nc.y,nc.w,nc.alpha*(estado.nivel===2?0.3:0.7));
  }

  // ── Suelo ──
  const sueloY=PISO+g.h-8;
  const grS=ctx.createLinearGradient(0,sueloY,0,canvas.height);
  grS.addColorStop(0,estado.nivel===2?'#0d3b1e':'rgba(20,80,30,0.9)');
  grS.addColorStop(1,estado.nivel===2?'#081a0e':'rgba(10,50,20,0.98)');
  ctx.fillStyle=grS; ctx.fillRect(0,sueloY,canvas.width,canvas.height-sueloY);
  ctx.strokeStyle=estado.nivel===2?'rgba(80,180,120,0.4)':'rgba(100,220,130,0.5)';
  ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(0,sueloY); ctx.lineTo(canvas.width,sueloY); ctx.stroke();

  // ── Flores ──
  for(const f of estado.flores){
    const fy=PISO+g.h-32+Math.sin(estado.frame/40+f.x)*4;
    spr('flor',f.x-estado.fondoX*0.3,fy,55*f.e,50*f.e);
  }

  // ── Tingua ──
  if(!estado.pausado){ estado.tingua.x+=0.5; if(estado.tingua.x>canvas.width+100) estado.tingua.x=-100; }
  estado.tingua.y=60+Math.sin(estado.frame/90)*18;
  const alaS=1+Math.sin(estado.frame/16)*0.14;
  ctx.save(); ctx.translate(estado.tingua.x+45,estado.tingua.y+35); ctx.scale(1,alaS); ctx.translate(-45,-35);
  spr('tingua',0,0,90,70); ctx.restore();

  // ── Plataformas (se dibujan antes del guardián) ──
  for(const p of estado.plataformas) dibujarPlataforma(p);

  // ── Recolectables ──
  for(const r of estado.recolectables) dibujarRecolectable(r);

  if (!estado.pausado) {
    // ── Movimiento guardián ──
    const velMax=estado.turbo>0?VEL_CORRE*1.6:VEL_CORRE;
    if(K['ArrowLeft']||K['a'])       g.vx=Math.max(g.vx-VEL_ACELERACION*3,-velMax);
    else if(K['ArrowRight']||K['d']) g.vx=Math.min(g.vx+VEL_ACELERACION*3, velMax);
    else g.vx*=VEL_FRICCION;
    g.x+=g.vx;
    if(g.x<0){g.x=0;g.vx=0;}
    if(g.x+g.w>canvas.width){g.x=canvas.width-g.w;g.vx=0;}

    // ── Física vertical ──
    const jumpHeld=K['ArrowUp']||K[' ']||K['w'];
    const grav=(g.vy>0?GRAVEDAD_CAIDA:GRAVEDAD)*(g.vy<0&&jumpHeld?0.72:1);
    g.prevY=g.y;
    g.vy+=grav; g.y+=g.vy;

    // ── Coyote time ──
    if(g.enSuelo) g.coyote=COYOTE_TIME;
    else if(g.coyote>0) g.coyote--;

    // ── Aterrizar en suelo ──
    let enSueloEsteFrame=false;
    if(g.y>=PISO){
      g.y=PISO; g.vy=0;
      if(!g.enSuelo){ soundLand(); spawn(g.x+g.w/2,g.y+g.h,'#a5d6a7',5); g.doble=true; }
      enSueloEsteFrame=true;
    }

    // ── Aterrizar en plataformas ──
    for(const p of estado.plataformas){
      if(aterrizaEnPlataforma(g,p)){
        g.y=p.y-g.h; g.vy=0;
        if(!g.enSuelo){ soundLand(); spawn(g.x+g.w/2,g.y+g.h,'#a5d6a7',4); g.doble=true; }
        enSueloEsteFrame=true;
      }
    }
    g.enSuelo=enSueloEsteFrame;

    // ── Jump buffer ──
    if(jumpBuffer>0){ jumpBuffer--; if(g.enSuelo&&jumpBuffer>0) saltar(); }
    if(g.inv>0) g.inv--;
    if(estado.turbo>0) estado.turbo--;
    if(estado.escudo>0) estado.escudo--;

    // ── Generar enemigos ──
    estado.timerE++;
    const intv=Math.max(35,nv.intervalo-Math.floor(estado.puntos/14)*2);
    if(estado.timerE>=intv){ estado.enemigos.push(genEnemigo()); estado.timerE=0; }

    // ── Generar power-ups (~18s) ──
    estado.timerP++;
    if(estado.timerP>=1080){ estado.powerups.push(genPowerup()); estado.timerP=0; }

    // ── Generar plataformas (~4s) ──
    estado.timerPL++;
    if(estado.timerPL>=240){ estado.plataformas.push(genPlataforma()); estado.timerPL=0; }

    // ── Generar recolectables (~5s) ──
    estado.timerR++;
    if(estado.timerR>=300){ estado.recolectables.push(genRecolectable()); estado.timerR=0; }

    // ── Mover todo ──
    for(const e of estado.enemigos){ e.x-=e.vel; e.fn++; if(!e.suelo) e.y+=Math.sin(e.fn/20+e.onda)*2; }
    for(const pu of estado.powerups){ pu.x-=pu.vel; }
    for(const p of estado.plataformas){ p.x-=p.vel; }
    for(const r of estado.recolectables){ r.x-=r.vel; r.fn++; }

    // Limpiar off-screen
    estado.enemigos=estado.enemigos.filter(e=>e.x+e.w>-20);
    estado.powerups=estado.powerups.filter(p=>p.x+p.w>-10);
    estado.plataformas=estado.plataformas.filter(p=>p.x+p.w>-10);
    estado.recolectables=estado.recolectables.filter(r=>r.x+r.w>-10);

    // ── Colisiones con enemigos ──
    if(g.inv===0&&!estado.pregActiva){
      for(let i=estado.enemigos.length-1;i>=0;i--){
        const e=estado.enemigos[i];
        if(stomping(g,e)){
          // ¡Pisar! Elimina el enemigo
          soundStomp();
          estado.puntos+=15; actuHUD();
          spawn(e.x+e.w/2,e.y,'#ff8f00',18);
          spawnEstrellas(e.x+e.w/2,e.y+e.h/2);
          mostrarMsg(`👟 ¡Aplastaste al enemigo! +15 pts — ${e.msg}`);
          estado.enemigos.splice(i,1);
          g.vy=FUERZA_SALTO*0.55; // rebote hacia arriba
          if(estado.puntos>=META) return fin(true);
          break;
        } else if(choca(g,e)){
          soundHit(); mostrarPregunta(e); break;
        }
      }
    }

    // ── Colisiones con power-ups ──
    for(let i=estado.powerups.length-1;i>=0;i--){
      const pu=estado.powerups[i];
      if(choca(g,pu,4)){
        soundPowerup(); mostrarMsg(`${pu.emoji} ${pu.msg}`);
        if(pu.tipo==='escudo') estado.escudo=pu.dur;
        if(pu.tipo==='turbo')  estado.turbo=pu.dur;
        if(pu.tipo==='vida'&&estado.vidas<5){ estado.vidas++; actuHUD(); }
        spawn(pu.x+pu.w/2,pu.y+pu.h/2,pu.color,20);
        spawnEstrellas(pu.x+pu.w/2,pu.y+pu.h/2);
        estado.powerups.splice(i,1);
      }
    }

    // ── Colisiones con recolectables ──
    for(let i=estado.recolectables.length-1;i>=0;i--){
      const r=estado.recolectables[i];
      if(choca(g,r,2)){
        soundCollect();
        const pts=r.tipo==='gota'?5:8;
        estado.puntos+=pts; actuHUD();
        mostrarMsg(`${r.tipo==='gota'?'💧':'⭐'} +${pts} pts`);
        spawn(r.x+r.w/2,r.y+r.h/2,'#00bcd4',12);
        estado.recolectables.splice(i,1);
        if(estado.puntos>=META) return fin(true);
      }
    }

    // ── Puntos por tiempo ──
    if(estado.frame%90===0){ estado.puntos++; actuHUD(); if(estado.puntos>=META) return fin(true); }

    // ── Nivel y dificultad ──
    estado.nivel=estado.puntos<120?0:estado.puntos<250?1:2;
    estado.velE=nv.velBase+estado.puntos/55;

    // ── Mensaje timer ──
    if(estado.mensajeT>0){ estado.mensajeT--; if(estado.mensajeT===0) document.getElementById('mensaje-enemigo').style.opacity='0'; }

    // ── Partículas ──
    for(let i=estado.particulas.length-1;i>=0;i--){
      const p=estado.particulas[i];
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.18; p.vida--;
      if(p.vida<=0){estado.particulas.splice(i,1);continue;}
      ctx.save(); ctx.globalAlpha=p.vida/p.max; ctx.fillStyle=p.color;
      ctx.translate(p.x,p.y); ctx.rotate(p.vida*0.12);
      ctx.fillRect(-p.r,-p.r,p.r*2,p.r*2); ctx.restore();
    }

    // ── Estrellas ──
    for(let i=estado.estrellas.length-1;i>=0;i--){
      const s=estado.estrellas[i];
      s.x+=s.ax; s.y+=s.ay; s.ay+=0.3; s.vida--;
      if(s.vida<=0){estado.estrellas.splice(i,1);continue;}
      ctx.save(); ctx.globalAlpha=s.vida/s.max;
      ctx.font='18px Arial'; ctx.textAlign='center';
      ctx.fillText('⭐',s.x,s.y); ctx.restore(); ctx.textAlign='left';
    }
  }

  // ── Power-ups ──
  for(const pu of estado.powerups) dibujarPowerup(pu);

  // ── Enemigos ──
  for(const e of estado.enemigos){
    sombra(e.x,e.suelo?PISO+g.h-4:e.y+e.h+4,e.w);
    spr(e.img,e.x,e.y,e.w,e.h);
    if(e.x<canvas.width*0.4){
      ctx.save(); ctx.globalAlpha=0.18+Math.sin(estado.frame/15)*0.1;
      ctx.strokeStyle='#ff5252'; ctx.lineWidth=3;
      ctx.strokeRect(e.x-3,e.y-3,e.w+6,e.h+6); ctx.restore();
    }
  }

  // ── Guardián ──
  const sy=g.enSuelo?0.93:(g.vy<0?1.14:0.91);
  const sx2=g.enSuelo?1.06:(g.vy<0?0.88:1.08);
  const dw=g.w*sx2, dh=g.h*sy;
  sombra(g.x,PISO+g.h-4,g.w);
  const mostrar=g.inv===0||Math.floor(g.inv/6)%2===0;
  if(mostrar){
    if(estado.escudo>0){
      ctx.save(); ctx.globalAlpha=0.35+Math.sin(estado.frame/10)*0.2;
      ctx.strokeStyle='#2196f3'; ctx.lineWidth=5;
      ctx.beginPath(); ctx.arc(g.x+g.w/2,g.y+g.h/2,g.w*0.7,0,Math.PI*2); ctx.stroke(); ctx.restore();
    }
    if(estado.turbo>0) spawn(g.x,g.y+g.h*0.5,'#ffeb3b',1);
    const img=IMG['guardian'];
    if(img?.complete&&img.naturalWidth>0) ctx.drawImage(img,g.x+(g.w-dw)/2,g.y+(g.h-dh),dw,dh);
    else{ ctx.fillStyle='#4caf50'; ctx.fillRect(g.x+(g.w-dw)/2,g.y+(g.h-dh),dw,dh); }
  }

  // ── Barra progreso ──
  const bw=Math.min(240,canvas.width*0.55),bx=canvas.width/2-bw/2,by=14;
  ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(bx,by,bw,16);
  const gc=ctx.createLinearGradient(bx,0,bx+bw,0);
  gc.addColorStop(0,'#43a047'); gc.addColorStop(1,'#00e676');
  ctx.fillStyle=gc; ctx.fillRect(bx,by,bw*Math.min(estado.puntos/META,1),16);
  ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=1.5; ctx.strokeRect(bx,by,bw,16);
  ctx.fillStyle='#fff'; ctx.font=`bold ${Math.max(10,canvas.width*0.022)}px Arial`;
  ctx.textAlign='center'; ctx.fillText(`${estado.puntos}/${META} pts`,canvas.width/2,by+12); ctx.textAlign='left';

  // ── Nombre nivel ──
  if(estado.frame<180||(estado.nivel!==estado.nivelAnterior)){
    ctx.save(); ctx.globalAlpha=Math.max(0,Math.min(1,(180-estado.frame*0.5)/60));
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.font=`bold ${Math.max(12,canvas.width*0.025)}px Arial`;
    ctx.textAlign='center'; ctx.fillText(`🌿 ${nv.nombre}`,canvas.width/2,50); ctx.restore(); ctx.textAlign='left';
  }
  estado.nivelAnterior=estado.nivel;

  // ── Combo ──
  if(estado.comboCorrectas>=2){
    ctx.save(); ctx.globalAlpha=0.9;
    ctx.font=`bold ${Math.max(14,canvas.width*0.028)}px Arial`;
    ctx.textAlign='right'; ctx.fillStyle='#FFD700';
    ctx.fillText(`🔥 Combo x${estado.comboCorrectas}`,canvas.width-16,45);
    ctx.restore(); ctx.textAlign='left';
  }

  // ── Indicador "pisa al enemigo" ──
  for(const e of estado.enemigos){
    if(e.suelo && e.x < canvas.width*0.6 && g.y < e.y && g.vy > 0){
      ctx.save(); ctx.globalAlpha=0.7;
      ctx.font=`${Math.max(12,canvas.width*0.022)}px Arial`;
      ctx.textAlign='center';
      ctx.fillText('👆 ¡Salta encima!',e.x+e.w/2,e.y-10);
      ctx.restore(); ctx.textAlign='left';
    }
  }
}

// ── Pantallas ─────────────────────────────
function mostrarPantalla(id){
  document.querySelectorAll('.pantalla').forEach(p=>p.classList.remove('activa'));
  document.getElementById(id).classList.add('activa');
}
function fin(gano){
  estado.corriendo=false; stopMusic();
  if(estado.animF) cancelAnimationFrame(estado.animF);
  if(gano) soundWin();
  mostrarPantalla(gano?'pantalla-victoria':'pantalla-derrota');
}
function iniciarJuego(){
  stopMusic(); resize();
  estado=estadoInicial(); estado.turbo=0; estado.escudo=0;
  document.getElementById('panel-pregunta').classList.add('oculto');
  document.getElementById('mensaje-enemigo').style.opacity='0';
  actuHUD(); mostrarPantalla('pantalla-juego');
  if(estado.animF) cancelAnimationFrame(estado.animF);
  melIdx=0; startMusic(); loop();
}

// ── Arranque ──────────────────────────────
setupTouch();
setupBotonesOpciones();
document.getElementById('btn-iniciar').addEventListener('click',()=>cargarImagenes(iniciarJuego));
document.getElementById('btn-reiniciar-victoria').addEventListener('click',iniciarJuego);
document.getElementById('btn-reiniciar-derrota').addEventListener('click',iniciarJuego);
