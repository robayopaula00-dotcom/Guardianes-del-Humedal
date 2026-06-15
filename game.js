// =============================================
//  GUARDIANES DEL HUMEDAL — game.js v5
//  Mario-style + móvil completo
// =============================================

const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d');

// Bloquear scroll/zoom táctil en el canvas
canvas.addEventListener('touchstart',  e => e.preventDefault(), {passive:false});
canvas.addEventListener('touchmove',   e => e.preventDefault(), {passive:false});
canvas.addEventListener('touchend',    e => e.preventDefault(), {passive:false});
document.addEventListener('gesturestart', e => e.preventDefault());

function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', () => {
  resize();
  // Recalcular piso si el juego está corriendo
  if (estado?.corriendo) {
    const gH = estado.guardian.h;
    const botonesH = Math.min(100, window.innerHeight * 0.14);
    estado.PISO = canvas.height - gH - botonesH;
    estado.guardian.y = Math.min(estado.guardian.y, estado.PISO);
  }
});

// Orientación móvil
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    resize();
    if (estado?.corriendo) {
      const gH = estado.guardian.h;
      const botonesH = Math.min(100, window.innerHeight * 0.14);
      estado.PISO = canvas.height - gH - botonesH;
      estado.guardian.y = Math.min(estado.guardian.y, estado.PISO);
    }
  }, 300);
});

// ── Imágenes ──────────────────────────────
const IMG = {};
const SRC = { fondo:'fondo.jpg', guardian:'guardian.png', lodo:'lodo.png', basura:'basura.png', nube:'nube.png', tingua:'tingua.png', flor:'flor.png' };
let loaded = 0;
function cargarImagenes(cb) {
  loaded = 0;
  for (const [k,s] of Object.entries(SRC)) {
    const i = new Image(); i.src = s;
    const done = () => { loaded++; if (loaded === Object.keys(SRC).length) cb(); };
    i.onload = done; i.onerror = done;
    IMG[k] = i;
  }
}

// ── Preguntas ─────────────────────────────
const PREGUNTAS = [
  { t:'¿El Humedal Santa María del Lago es el único humedal urbano de Bogotá?',     r:false, f:'¡No! Bogotá tiene más de 13 humedales urbanos.' },
  { t:'¿La Tingua Bogotana está en peligro de extinción?',                           r:true,  f:'¡Correcto! Es una subespecie endémica en grave peligro.' },
  { t:'¿Un nivel de oxígeno disuelto bajo 4 mg/L es peligroso para los peces?',     r:true,  f:'¡Correcto! Por debajo de ese nivel la vida acuática no sobrevive.' },
  { t:'¿Los humedales bogotanos son ecosistemas artificiales?',                      r:false, f:'¡No! Son ecosistemas naturales, muy afectados por la urbanización.' },
  { t:'¿El humedal ayuda a regular las inundaciones de la ciudad?',                 r:true,  f:'¡Correcto! Actúa como esponja natural absorbiendo el exceso de agua.' },
  { t:'¿Arrojar basura cerca del humedal solo afecta el paisaje?',                  r:false, f:'¡No! La basura libera toxinas que contaminan el agua y matan fauna.' },
  { t:'¿El humedal Santa María del Lago está en la localidad de Engativá?',         r:true,  f:'¡Correcto! Está en Engativá, noroccidente de Bogotá.' },
  { t:'¿Las plantas acuáticas del humedal ayudan a limpiar el agua naturalmente?',  r:true,  f:'¡Correcto! Filtran contaminantes y oxigenan el agua.' },
  { t:'¿El esmog de la Av. Boyacá no afecta el humedal porque está lejos?',         r:false, f:'¡No! El esmog deposita partículas tóxicas en el agua del humedal.' },
  { t:'¿Los humedales almacenan carbono y ayudan a combatir el cambio climático?',  r:true,  f:'¡Correcto! Son de los mayores almacenadores de carbono del planeta.' },
];

// ── Constantes ────────────────────────────
const GRAVEDAD     = 0.6;
const VEL_CORRE    = 5.5;
const FUERZA_SALTO = -17;
const META          = 200;

// ── Teclas ────────────────────────────────
const K = {};
window.addEventListener('keydown', e => {
  K[e.key] = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  if ((e.key==='ArrowUp'||e.key===' '||e.key==='w') && estado?.corriendo && !estado.pausado) saltar();
});
window.addEventListener('keyup', e => { K[e.key] = false; });

// ── Controles móvil ───────────────────────
function setupTouch() {
  const izq    = document.getElementById('btn-izq');
  const der    = document.getElementById('btn-der');
  const jumpB  = document.getElementById('btn-saltar');

  function on(btn, key) {
    btn.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); K[key]=true;  btn.classList.add('on'); },    {passive:false});
    btn.addEventListener('touchend',   e => { e.preventDefault(); e.stopPropagation(); K[key]=false; btn.classList.remove('on'); }, {passive:false});
    btn.addEventListener('touchcancel',e => { K[key]=false; btn.classList.remove('on'); });
    // También mouse para pruebas en PC
    btn.addEventListener('mousedown', () => { K[key]=true;  btn.classList.add('on'); });
    btn.addEventListener('mouseup',   () => { K[key]=false; btn.classList.remove('on'); });
    btn.addEventListener('mouseleave',() => { K[key]=false; btn.classList.remove('on'); });
  }

  on(izq, 'ArrowLeft');
  on(der, 'ArrowRight');

  // Saltar: dispara al tocar, no mantener
  jumpB.addEventListener('touchstart', e => {
    e.preventDefault(); e.stopPropagation();
    jumpB.classList.add('on');
    if (estado?.corriendo && !estado.pausado) saltar();
  }, {passive:false});
  jumpB.addEventListener('touchend',   e => { e.preventDefault(); jumpB.classList.remove('on'); }, {passive:false});
  jumpB.addEventListener('touchcancel',e => { jumpB.classList.remove('on'); });
  jumpB.addEventListener('mousedown',  () => { jumpB.classList.add('on'); if (estado?.corriendo && !estado.pausado) saltar(); });
  jumpB.addEventListener('mouseup',    () => jumpB.classList.remove('on'));
}

// ── Estado ────────────────────────────────
let estado;

function estadoInicial() {
  const gW  = Math.min(150, canvas.width * 0.13);
  const gH  = gW * 1.3;
  const botonesH = Math.min(100, canvas.height * 0.14);
  const PISO = canvas.height - gH - botonesH;
  return {
    corriendo: true, pausado: false,
    puntos: 0, vidas: 3, frame: 0,
    fondoX: 0, PISO,
    guardian: { x:100, y:PISO, vx:0, vy:0, w:gW, h:gH, enSuelo:true, doble:true, inv:0 },
    enemigos:[], particulas:[],
    tingua:{ x:-100, y:70 },
    flores: Array.from({length:8},()=>({ x:Math.random()*canvas.width*1.8, e:0.28+Math.random()*0.18 })),
    timerE:0, velE:3.2, mensajeT:0,
    pregActiva:false, pregActual:null, pregUsadas:[],
    animF:null,
  };
}

// ── Salto ─────────────────────────────────
function saltar() {
  const g = estado.guardian;
  if (g.enSuelo) {
    g.vy = FUERZA_SALTO; g.enSuelo=false; g.doble=true;
    spawn(g.x+g.w/2, g.y+g.h, '#a5d6a7', 7);
  } else if (g.doble) {
    g.vy = FUERZA_SALTO*0.82; g.doble=false;
    spawn(g.x+g.w/2, g.y+g.h/2, '#00e5ff', 10);
  }
}

// ── Partículas ────────────────────────────
function spawn(x,y,color,n) {
  for(let i=0;i<n;i++) estado.particulas.push({
    x,y, vx:(Math.random()-.5)*6, vy:(Math.random()-.5)*5-1,
    vida:35+Math.random()*20, max:55, color, r:3+Math.random()*3
  });
}

// ── Enemigos ──────────────────────────────
const TIPOS = [
  {img:'lodo',   w:155,h:145,suelo:true,  msg:'🟤 ¡Lodo contaminante! Asfixia la vida del humedal.'},
  {img:'basura', w:165,h:150,suelo:true,  msg:'🗑️ ¡Basura! Plásticos y llantas destruyen la fauna.'},
  {img:'nube',   w:140,h:125,suelo:false, msg:'☁️ ¡Nube tóxica! El esmog altera el ecosistema.'},
];
function genEnemigo() {
  const t = TIPOS[Math.floor(Math.random()*TIPOS.length)];
  const {PISO,guardian:g} = estado;
  const y = t.suelo ? PISO : PISO - 80 - Math.random()*120;
  return {...t, x:canvas.width+30, y, vel:estado.velE+Math.random()*1.3, onda:Math.random()*Math.PI*2, fn:0};
}

// ── Colisión ──────────────────────────────
function choca(a,b,m=24){
  return a.x+m<b.x+b.w-m && a.x+a.w-m>b.x+m && a.y+m<b.y+b.h-m && a.y+a.h-m>b.y+m;
}

// ── Pregunta ──────────────────────────────
function mostrarPregunta(en) {
  estado.pausado=true; estado.pregActiva=true;
  const disp = PREGUNTAS.filter((_,i)=>!estado.pregUsadas.includes(i));
  const pool = disp.length ? disp : PREGUNTAS;
  const p = pool[Math.floor(Math.random()*pool.length)];
  estado.pregUsadas.push(PREGUNTAS.indexOf(p));
  estado.pregActual = {...p, en};
  document.getElementById('texto-pregunta').textContent = p.t;
  document.getElementById('panel-pregunta').classList.remove('oculto');
}

function responder(r) {
  const p = estado.pregActual;
  document.getElementById('panel-pregunta').classList.add('oculto');
  if (r===p.r) {
    estado.puntos+=20; mostrarMsg('✅ ¡Correcto! +20 pts — '+p.f);
    spawn(canvas.width/2,canvas.height/2,'#69f0ae',25);
  } else {
    estado.puntos=Math.max(0,estado.puntos-10); estado.vidas--;
    estado.guardian.inv=90;
    mostrarMsg('❌ Incorrecto. -10 pts — '+p.f);
    spawn(canvas.width/2,canvas.height/2,'#ff5252',25);
  }
  estado.enemigos=estado.enemigos.filter(e=>e!==p.en);
  actuHUD(); estado.pregActiva=false; estado.pausado=false;
  if(estado.vidas<=0) return fin(false);
  if(estado.puntos>=META) return fin(true);
}

document.getElementById('btn-si').addEventListener('click',()=>{ if(estado?.pregActiva) responder(true); });
document.getElementById('btn-no').addEventListener('click',()=>{ if(estado?.pregActiva) responder(false); });

// ── HUD ───────────────────────────────────
function actuHUD(){
  document.getElementById('vidas').textContent='❤️ '.repeat(Math.max(0,estado.vidas)).trim()||'💀';
  document.getElementById('puntos').textContent=`Puntos: ${estado.puntos}`;
}
function mostrarMsg(t){
  const el=document.getElementById('mensaje-enemigo');
  el.textContent=t; el.style.opacity='1'; estado.mensajeT=240;
}

// ── Sprite ────────────────────────────────
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
function sombra(x,y,w){
  ctx.save(); ctx.globalAlpha=0.2; ctx.fillStyle='#000';
  ctx.beginPath(); ctx.ellipse(x+w/2,y,w/2.2,8,0,0,Math.PI*2); ctx.fill(); ctx.restore();
}

// ── LOOP ──────────────────────────────────
function loop(){
  if(!estado.corriendo) return;
  estado.animF=requestAnimationFrame(loop);
  estado.frame++;
  const {guardian:g, PISO} = estado;
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Fondo parallax
  if(IMG.fondo?.complete&&IMG.fondo.naturalWidth>0){
    if(!estado.pausado) estado.fondoX-=0.7;
    if(estado.fondoX<=-canvas.width) estado.fondoX=0;
    ctx.drawImage(IMG.fondo,estado.fondoX,0,canvas.width,canvas.height);
    ctx.drawImage(IMG.fondo,estado.fondoX+canvas.width,0,canvas.width,canvas.height);
    ctx.fillStyle='rgba(0,0,0,0.08)'; ctx.fillRect(0,0,canvas.width,canvas.height);
  } else {
    const gr=ctx.createLinearGradient(0,0,0,canvas.height);
    gr.addColorStop(0,'#87ceeb'); gr.addColorStop(0.55,'#3a9e5f'); gr.addColorStop(1,'#1a5c32');
    ctx.fillStyle=gr; ctx.fillRect(0,0,canvas.width,canvas.height);
  }

  // Suelo
  ctx.fillStyle='rgba(20,80,30,0.4)';
  ctx.fillRect(0, PISO+g.h-8, canvas.width, canvas.height-(PISO+g.h-8));

  // Flores
  for(const f of estado.flores){
    const fy = PISO+g.h-32+Math.sin(estado.frame/40+f.x)*4;
    spr('flor', f.x-estado.fondoX*0.3, fy, 55*f.e, 50*f.e);
  }

  // Tingua
  if(!estado.pausado){ estado.tingua.x+=1.8; if(estado.tingua.x>canvas.width+100) estado.tingua.x=-100; }
  estado.tingua.y=65+Math.sin(estado.frame/50)*20;
  const alaS=1+Math.sin(estado.frame/8)*0.18;
  ctx.save(); ctx.translate(estado.tingua.x+45,estado.tingua.y+35); ctx.scale(1,alaS); ctx.translate(-45,-35);
  spr('tingua',0,0,90,70); ctx.restore();

  if(!estado.pausado){
    // Movimiento horizontal
    if(K['ArrowLeft']||K['a'])       g.vx=-VEL_CORRE;
    else if(K['ArrowRight']||K['d']) g.vx= VEL_CORRE;
    else g.vx*=0.72;
    g.x+=g.vx;
    if(g.x<0) g.x=0;
    if(g.x+g.w>canvas.width) g.x=canvas.width-g.w;

    // Gravedad
    g.vy+=GRAVEDAD; g.y+=g.vy;
    if(g.y>=PISO){ g.y=PISO; g.vy=0; if(!g.enSuelo){g.enSuelo=true;g.doble=true;spawn(g.x+g.w/2,g.y+g.h,'#a5d6a7',4);} }
    else g.enSuelo=false;
    if(g.inv>0) g.inv--;

    // Generar enemigos
    estado.timerE++;
    const intv=Math.max(50,130-Math.floor(estado.puntos/12)*3);
    if(estado.timerE>=intv){ estado.enemigos.push(genEnemigo()); estado.timerE=0; }

    // Mover enemigos
    for(const e of estado.enemigos){ e.x-=e.vel; e.fn++; if(!e.suelo) e.y+=Math.sin(e.fn/20+e.onda)*2; }
    estado.enemigos=estado.enemigos.filter(e=>e.x+e.w>-20);

    // Colisiones
    if(g.inv===0){
      for(const e of estado.enemigos){ if(choca(g,e)){ mostrarPregunta(e); break; } }
    }

    // Puntos por tiempo
    if(estado.frame%90===0){ estado.puntos++; actuHUD(); if(estado.puntos>=META) return fin(true); }

    // Dificultad
    estado.velE=3.2+estado.puntos/55;

    // Mensaje timer
    if(estado.mensajeT>0){ estado.mensajeT--; if(estado.mensajeT===0) document.getElementById('mensaje-enemigo').style.opacity='0'; }

    // Partículas
    for(let i=estado.particulas.length-1;i>=0;i--){
      const p=estado.particulas[i];
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.18; p.vida--;
      if(p.vida<=0){estado.particulas.splice(i,1);continue;}
      ctx.save(); ctx.globalAlpha=p.vida/p.max; ctx.fillStyle=p.color;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); ctx.restore();
    }
  }

  // Dibujar enemigos
  for(const e of estado.enemigos){
    sombra(e.x, e.suelo?PISO+g.h-4:e.y+e.h+4, e.w);
    spr(e.img,e.x,e.y,e.w,e.h);
  }

  // Dibujar guardián (squash & stretch)
  const sy=g.enSuelo?0.93:(g.vy<0?1.14:0.91);
  const sx=g.enSuelo?1.06:(g.vy<0?0.88:1.08);
  const dw=g.w*sx, dh=g.h*sy;
  sombra(g.x, PISO+g.h-4, g.w);
  const mostrar=g.inv===0||Math.floor(g.inv/6)%2===0;
  if(mostrar){
    const img=IMG['guardian'];
    if(img?.complete&&img.naturalWidth>0) ctx.drawImage(img,g.x+(g.w-dw)/2,g.y+(g.h-dh),dw,dh);
    else{ ctx.fillStyle='#4caf50'; ctx.fillRect(g.x+(g.w-dw)/2,g.y+(g.h-dh),dw,dh); }
  }

  // Barra de progreso
  const bw=Math.min(240,canvas.width*0.55), bx=canvas.width/2-bw/2, by=14;
  ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(bx,by,bw,16);
  const prog=Math.min(estado.puntos/META,1);
  const gc=ctx.createLinearGradient(bx,0,bx+bw,0);
  gc.addColorStop(0,'#43a047'); gc.addColorStop(1,'#00e676');
  ctx.fillStyle=gc; ctx.fillRect(bx,by,bw*prog,16);
  ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=1.5; ctx.strokeRect(bx,by,bw,16);
  ctx.fillStyle='#fff'; ctx.font=`bold ${Math.max(10,canvas.width*0.022)}px Arial`;
  ctx.textAlign='center'; ctx.fillText(`${estado.puntos}/${META} pts`,canvas.width/2,by+12); ctx.textAlign='left';
}

// ── Pantallas ─────────────────────────────
function mostrarPantalla(id){
  document.querySelectorAll('.pantalla').forEach(p=>p.classList.remove('activa'));
  document.getElementById(id).classList.add('activa');
}
function fin(gano){
  estado.corriendo=false;
  if(estado.animF) cancelAnimationFrame(estado.animF);
  mostrarPantalla(gano?'pantalla-victoria':'pantalla-derrota');
}
function iniciarJuego(){
  resize();
  estado=estadoInicial();
  document.getElementById('panel-pregunta').classList.add('oculto');
  document.getElementById('mensaje-enemigo').style.opacity='0';
  actuHUD();
  mostrarPantalla('pantalla-juego');
  if(estado.animF) cancelAnimationFrame(estado.animF);
  loop();
}

// ── Arranque ──────────────────────────────
setupTouch();
document.getElementById('btn-iniciar').addEventListener('click',()=>cargarImagenes(iniciarJuego));
document.getElementById('btn-reiniciar-victoria').addEventListener('click',iniciarJuego);
document.getElementById('btn-reiniciar-derrota').addEventListener('click',iniciarJuego);
