// Constantes y funciones puras compartidas entre todos los modos

export const PICTOS = [
  { e:"📖", n:"Lectura" }, { e:"✏️", n:"Escritura" }, { e:"🧮", n:"Matemática" },
  { e:"🧩", n:"Trabajo en mesa" }, { e:"🤝", n:"Trabajo en grupo" }, { e:"👂", n:"Escuchar" },
  { e:"🗣️", n:"Exponer" }, { e:"💻", n:"Computador" }, { e:"🎨", n:"Arte" },
  { e:"🎵", n:"Música" }, { e:"🍎", n:"Colación" }, { e:"🍽️", n:"Almuerzo" },
  { e:"🏃", n:"Recreo" }, { e:"🧘", n:"Calma" }, { e:"🎮", n:"Juego" },
  { e:"🧹", n:"Ordenar" }, { e:"🚻", n:"Baño" }, { e:"🚌", n:"Salida" },
];

export const T = {
  bg:"#FFFFFF", panel:"#F4F6F9", line:"#D9DFE8",
  text:"#22303F", dim:"#67768A",
  warn5:"#E3A93C", warn1:"#8B5CF6",
};

export const WEDGE_COLORS = [
  { k:"rojo",     n:"Rojo",     c:"#E04F4F" },
  { k:"naranjo",  n:"Naranjo",  c:"#ED8936" },
  { k:"amarillo", n:"Amarillo", c:"#E3C334" },
  { k:"verde",    n:"Verde",    c:"#46A877" },
  { k:"turquesa", n:"Turquesa", c:"#34AFAA" },
  { k:"azul",     n:"Azul",     c:"#4A90D9" },
  { k:"lavanda",  n:"Lavanda",  c:"#9B7FE0" },
  { k:"rosado",   n:"Rosado",   c:"#E879A9" },
  { k:"negro",    n:"Negro",    c:"#1A1A1A" },
];

export const MILESTONES = [
  { key:"m5",  secs:300, minTotal:330, text:"Quedan cinco minutos",    label:"5 min" },
  { key:"m3",  secs:180, minTotal:210, text:"Quedan tres minutos",     label:"3 min" },
  { key:"m2",  secs:120, minTotal:150, text:"Quedan dos minutos",      label:"2 min" },
  { key:"m1",  secs:60,  minTotal:90,  text:"Queda un minuto",         label:"1 min" },
  { key:"s30", secs:30,  minTotal:60,  text:"Quedan treinta segundos", label:"30 seg" },
  { key:"s5",  secs:5,   minTotal:30,  text:"Quedan cinco segundos",   label:"5 seg" },
];

export function textOn(hex) {
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return (0.299*r+0.587*g+0.114*b)>160?"#22303F":"#FFFFFF";
}

export const CX=200, CY=200, R=158;

export function polar(a, dir=1, r=R) {
  const rad=(a*Math.PI)/180;
  return { x:CX+dir*r*Math.sin(rad), y:CY-r*Math.cos(rad) };
}

export function wedgePath(a, dir=1) {
  if(a<=0.2) return "";
  if(a>=359.8) return `M ${CX} ${CY-R} A ${R} ${R} 0 1 1 ${CX-0.01} ${CY-R} Z`;
  const p=polar(a,dir);
  return `M ${CX} ${CY} L ${CX} ${CY-R} A ${R} ${R} 0 ${a>180?1:0} ${dir===1?1:0} ${p.x} ${p.y} Z`;
}

// Arco-sector de startAngle a endAngle (ángulos en grados, 0=12h, creciente = dir)
export function arcSegPath(startAngle, endAngle, dir=1) {
  const span = endAngle - startAngle;
  if (span < 0.2) return "";
  if (span >= 359.8) return `M ${CX} ${CY-R} A ${R} ${R} 0 1 1 ${CX-0.01} ${CY-R} Z`;
  const p1 = polar(startAngle, dir);
  const p2 = polar(endAngle,   dir);
  return `M ${CX} ${CY} L ${p1.x} ${p1.y} A ${R} ${R} 0 ${span>180?1:0} ${dir===1?1:0} ${p2.x} ${p2.y} Z`;
}

export const fmt=(s)=>{
  const m=Math.floor(s/60), ss=Math.floor(s%60);
  return `${m}:${String(ss).padStart(2,"0")}`;
};

export function darkenColor(hex, amount=0.30) {
  const r=Math.max(0,Math.round(parseInt(hex.slice(1,3),16)*(1-amount)));
  const g=Math.max(0,Math.round(parseInt(hex.slice(3,5),16)*(1-amount)));
  const b=Math.max(0,Math.round(parseInt(hex.slice(5,7),16)*(1-amount)));
  return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
}

// ---- Audio ----
let audioCtx=null;
export function tone(freq,dur,gainV,type="sine",when=0){
  try{
    if(!audioCtx) audioCtx=new(window.AudioContext||window.webkitAudioContext)();
    const t0=audioCtx.currentTime+when;
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.type=type; o.frequency.value=freq;
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(gainV,t0+0.03);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t0); o.stop(t0+dur+0.05);
  }catch(e){}
}
export function playEnd(m){
  if(m==="off") return;
  if(m==="suave"){ tone(523,.7,.05); tone(659,.9,.05,"sine",.35); }
  else { tone(880,1.2,.12,"triangle"); tone(1760,.8,.04,"sine",.05); }
}
export function playWarn(m){
  if(m==="off") return;
  tone(587,.45,m==="suave"?.03:.06,"sine");
}
export function speak(text){
  try{
    if(!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text);
    u.lang="es-CL"; u.rate=0.92; u.pitch=1;
    window.speechSynthesis.speak(u);
  }catch(e){}
}
