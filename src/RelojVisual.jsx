import { useState, useRef, useEffect, useCallback } from "react";

/* ============================================================
   RELOJ VISUAL v3 — totalmente responsivo móvil/desktop
   - Layout adaptivo: portrait mobile, landscape, desktop
   - Barra inferior fija en móvil (tab bar nativa)
   - Tap target grande en manilla (radio 24px touch)
   - touch-action contenido al SVG, scroll libre fuera
   - dvh para viewport real en móvil
   - Modales con padding-bottom para teclado virtual
   - Todos los modales: Pictogramas, Rutina, Ajustes
   ============================================================ */

const PICTOS = [
  { e:"📖", n:"Lectura" }, { e:"✏️", n:"Escritura" }, { e:"🧮", n:"Matemática" },
  { e:"🧩", n:"Trabajo en mesa" }, { e:"🤝", n:"Trabajo en grupo" }, { e:"👂", n:"Escuchar" },
  { e:"🗣️", n:"Exponer" }, { e:"💻", n:"Computador" }, { e:"🎨", n:"Arte" },
  { e:"🎵", n:"Música" }, { e:"🍎", n:"Colación" }, { e:"🍽️", n:"Almuerzo" },
  { e:"🏃", n:"Recreo" }, { e:"🧘", n:"Calma" }, { e:"🎮", n:"Juego" },
  { e:"🧹", n:"Ordenar" }, { e:"🚻", n:"Baño" }, { e:"🚌", n:"Salida" },
];

const T = {
  bg:"#FFFFFF", panel:"#F4F6F9", line:"#D9DFE8",
  text:"#22303F", dim:"#67768A",
  warn5:"#E3A93C", warn1:"#8B5CF6",
};

const WEDGE_COLORS = [
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

function textOn(hex) {
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return (0.299*r+0.587*g+0.114*b)>160?"#22303F":"#FFFFFF";
}

const CX=200,CY=200,R=158;
function polar(a,dir=1,r=R){
  const rad=(a*Math.PI)/180;
  return{x:CX+dir*r*Math.sin(rad),y:CY-r*Math.cos(rad)};
}
function wedgePath(a,dir=1){
  if(a<=0.2) return"";
  if(a>=359.8) return`M ${CX} ${CY-R} A ${R} ${R} 0 1 1 ${CX-0.01} ${CY-R} Z`;
  const p=polar(a,dir);
  return`M ${CX} ${CY} L ${CX} ${CY-R} A ${R} ${R} 0 ${a>180?1:0} ${dir===1?1:0} ${p.x} ${p.y} Z`;
}
const fmt=(s)=>{const m=Math.floor(s/60),ss=Math.floor(s%60);return`${m}:${String(ss).padStart(2,"0")}`;};

let audioCtx=null;
function tone(freq,dur,gainV,type="sine",when=0){
  try{
    if(!audioCtx) audioCtx=new(window.AudioContext||window.webkitAudioContext)();
    const t0=audioCtx.currentTime+when;
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.type=type;o.frequency.value=freq;
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(gainV,t0+0.03);
    g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
    o.connect(g);g.connect(audioCtx.destination);
    o.start(t0);o.stop(t0+dur+0.05);
  }catch(e){}
}
function playEnd(m){if(m==="off")return;if(m==="suave"){tone(523,.7,.05);tone(659,.9,.05,"sine",.35);}else{tone(880,1.2,.12,"triangle");tone(1760,.8,.04,"sine",.05);}}
function playWarn(m){if(m==="off")return;tone(587,.45,m==="suave"?.03:.06,"sine");}

/* ============================================================ */
export default function RelojVisual(){
  const[wedgeKey,setWedgeKey]=useState("rojo");
  const[sound,setSound]=useState("suave");
  const[reducedMotion,setReducedMotion]=useState(false);
  const[warn5On,setWarn5On]=useState(true);
  const[warn1On,setWarn1On]=useState(true);
  const[inverted,setInverted]=useState(false);
  const dir=inverted?-1:1;
  const baseWedge=WEDGE_COLORS.find(w=>w.k===wedgeKey).c;

  const[activity,setActivity]=useState(PICTOS[3]);
  const[customPictos,setCustomPictos]=useState([]);
  const[routine,setRoutine]=useState([]);
  const[stepIdx,setStepIdx]=useState(-1);

  const[totalSecs,setTotalSecs]=useState(15*60);
  const[remaining,setRemaining]=useState(15*60);
  const[running,setRunning]=useState(false);
  const[viewMode,setViewMode]=useState("restante");
  const endAtRef=useRef(null);
  const prevRemRef=useRef(remaining);

  // modal activo: null | "picker" | "routine" | "settings"
  const[modal,setModal]=useState(null);
  const[done,setDone]=useState(false);
  const[minInput,setMinInput]=useState("15");
  const svgRef=useRef(null);
  const dragRef=useRef(false);
  const rootRef=useRef(null);
  const fileRef=useRef(null);

  /* ---- tick ---- */
  useEffect(()=>{
    if(!running)return;
    endAtRef.current=Date.now()+remaining*1000;
    const id=setInterval(()=>{
      const rem=Math.max(0,(endAtRef.current-Date.now())/1000);
      const prev=prevRemRef.current;
      if(warn5On&&prev>300&&rem<=300&&totalSecs>330)playWarn(sound);
      if(warn1On&&prev>60&&rem<=60&&totalSecs>90)playWarn(sound);
      prevRemRef.current=rem;
      setRemaining(rem);
      if(rem<=0){clearInterval(id);setRunning(false);playEnd(sound);setDone(true);}
    },200);
    return()=>clearInterval(id);
  },[running]);// eslint-disable-line

  const hasNext=stepIdx>=0&&stepIdx<routine.length-1;
  useEffect(()=>{
    if(!done||!hasNext)return;
    const t=setTimeout(()=>goNextStep(true),8000);
    return()=>clearTimeout(t);
  },[done,hasNext]);// eslint-disable-line

  const loadStep=useCallback((idx,autostart)=>{
    const st=routine[idx];if(!st)return;
    setStepIdx(idx);setActivity({e:st.e,img:st.img,n:st.n});
    const secs=st.mins*60;setTotalSecs(secs);setRemaining(secs);
    prevRemRef.current=secs;setMinInput(String(st.mins));setDone(false);setRunning(!!autostart);
  },[routine]);

  const goNextStep=(autostart)=>{
    if(hasNext)loadStep(stepIdx+1,autostart);
    else{setDone(false);setStepIdx(-1);}
  };

  const setMinutes=(mins)=>{
    const m=Math.min(60,Math.max(1,Math.round(mins)));
    const secs=m*60;setTotalSecs(secs);setRemaining(secs);
    prevRemRef.current=secs;setMinInput(String(m));setDone(false);
  };

  /* ---- arrastre — coordenadas normalizadas al SVG viewBox ---- */
  const getAngle=(ev)=>{
    const rect=svgRef.current.getBoundingClientRect();
    // soporte touch y mouse
    const cx=(ev.touches?ev.touches[0].clientX:ev.clientX);
    const cy=(ev.touches?ev.touches[0].clientY:ev.clientY);
    const x=((cx-rect.left)/rect.width)*400-CX;
    const y=((cy-rect.top)/rect.height)*400-CY;
    let a=(Math.atan2(x,-y)*180)/Math.PI;
    if(a<0)a+=360;
    if(dir===-1)a=(360-a)%360;
    return a;
  };
  const onPointerDown=(ev)=>{
    if(running)return;
    dragRef.current=true;
    ev.currentTarget.setPointerCapture?.(ev.pointerId);
    setMinutes(getAngle(ev)/6);
  };
  const onPointerMove=(ev)=>{
    if(!dragRef.current||running)return;
    const a=getAngle(ev);
    const cur=totalSecs/60;
    let mins=a/6;
    if(cur>50&&mins<5)mins=60;
    if(cur<10&&mins>55)mins=1;
    setMinutes(mins);
  };
  const onPointerUp=()=>{dragRef.current=false;};

  /* ---- controles ---- */
  const start=()=>{if(remaining<=0)setMinutes(Number(minInput)||15);setDone(false);setRunning(true);};
  const pause=()=>setRunning(false);
  const reset=()=>{setRunning(false);setDone(false);setRemaining(totalSecs);prevRemRef.current=totalSecs;};
  const toggleFS=()=>{
    const el=rootRef.current;
    if(!document.fullscreenElement)el?.requestFullscreen?.().catch(()=>{});
    else document.exitFullscreen?.();
  };

  /* ---- pictogramas propios ---- */
  const handleFiles=(ev)=>{
    Array.from(ev.target.files||[]).forEach(file=>{
      const reader=new FileReader();
      reader.onload=()=>{
        const name=file.name.replace(/\.[^.]+$/,"").slice(0,24)||"Imagen";
        setCustomPictos(c=>[...c,{id:Date.now()+Math.random(),img:reader.result,n:name}]);
      };
      reader.readAsDataURL(file);
    });
    ev.target.value="";
  };
  const removeCustom=(id)=>setCustomPictos(c=>c.filter(p=>p.id!==id));
  const renameCustom=(id,n)=>setCustomPictos(c=>c.map(p=>p.id===id?{...p,n}:p));

  /* ---- rutina ---- */
  const[draft,setDraft]=useState({key:"p3",mins:10});
  const allOptions=[
    ...PICTOS.map((p,i)=>({key:"p"+i,label:`${p.e} ${p.n}`,picto:p})),
    ...customPictos.map(p=>({key:"c"+p.id,label:`🖼️ ${p.n}`,picto:p})),
  ];
  const addStep=()=>{
    const opt=allOptions.find(o=>o.key===draft.key)||allOptions[0];
    const p=opt.picto;
    setRoutine(r=>[...r,{id:Date.now(),e:p.e,img:p.img,n:p.n,mins:Math.min(60,Math.max(1,draft.mins))}]);
  };
  const removeStep=(id)=>setRoutine(r=>r.filter(s=>s.id!==id));
  const startRoutine=()=>{if(!routine.length)return;setModal(null);loadStep(0,false);};

  /* ---- estado visual ---- */
  const warnState=
    (running||remaining<totalSecs)
      ?remaining<=60&&warn1On&&totalSecs>90?"w1"
      :remaining<=300&&warn5On&&totalSecs>330?"w5":"ok"
    :"ok";
  const wedgeColor=warnState==="w1"?T.warn1:warnState==="w5"?T.warn5:baseWedge;
  const shownSecs=viewMode==="restante"?remaining:totalSecs-remaining;
  const wedgeAngle=(viewMode==="restante"?remaining:totalSecs-remaining)/10;
  const handlePos=polar(wedgeAngle,dir);

  const ticks=[];
  for(let i=0;i<60;i++){
    const major=i%5===0,a=i*6;
    const p1=polar(a,dir,R+4),p2=polar(a,dir,R+(major?16:10));
    ticks.push(<line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
      stroke={T.dim} strokeWidth={major?2.4:1} opacity={major?.9:.45}/>);
  }
  const numbers=[];
  for(let m=0;m<60;m+=5){
    const p=polar(m*6,dir,R+30);
    numbers.push(<text key={m} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
      fontSize="15" fontWeight="700" fill={T.dim}>{m===0?"0":m}</text>);
  }

  const renderPicto=(p,size)=>p?.img
    ?<img src={p.img} alt={p.n} style={{width:size,height:size,objectFit:"cover",borderRadius:"18%"}}/>
    :<span style={{fontSize:size*.82,lineHeight:1}}>{p.e}</span>;

  /* ===================== ESTILOS ===================== */
  const css=`
    *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    .rv{
      min-height:100dvh;background:${T.bg};color:${T.text};
      font-family:ui-rounded,'Segoe UI',system-ui,-apple-system,sans-serif;
      display:flex;flex-direction:column;align-items:center;
      /* espacio para la tab-bar en móvil */
      padding-bottom:env(safe-area-inset-bottom,0px);
    }

    /* ---- header ---- */
    .rv-hdr{
      width:100%;max-width:980px;display:flex;align-items:center;
      justify-content:space-between;padding:12px 16px;
    }
    .rv-title{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:${T.dim};font-weight:800}
    .rv-hbtns{display:flex;gap:8px}

    /* botones base */
    .btn{
      background:${T.panel};color:${T.text};border:1.5px solid ${T.line};
      border-radius:14px;padding:10px 16px;font-size:14px;font-weight:700;
      cursor:pointer;font-family:inherit;min-height:44px;
      transition:${reducedMotion?"none":"transform .12s,border-color .2s"};
      display:inline-flex;align-items:center;justify-content:center;gap:6px;
    }
    .btn:hover{border-color:${baseWedge}}
    .btn:active{transform:${reducedMotion?"none":"scale(.96)"}}
    .btn:focus-visible{outline:3px solid ${baseWedge};outline-offset:2px}
    .btn.primary{background:${baseWedge};color:${textOn(baseWedge)};border-color:transparent;font-size:15px}
    .btn.ghost{background:transparent;border-color:transparent;font-size:22px;padding:8px}

    /* ---- escenario del reloj ---- */
    .rv-stage{
      position:relative;
      width:min(88vmin,520px);height:min(88vmin,520px);
      flex-shrink:0;
    }
    .rv-svg{width:100%;height:100%;display:block;touch-action:none}
    .rv-center{
      position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
      width:38%;height:38%;border-radius:50%;
      background:${T.bg};border:2px solid ${T.line};
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
      cursor:pointer;box-shadow:0 0 0 6px ${T.bg};user-select:none;overflow:hidden;
    }
    .rv-center:focus-visible{outline:3px solid ${baseWedge};outline-offset:3px}
    .rv-actname{font-size:clamp(10px,2vmin,14px);font-weight:800;text-align:center;padding:0 8px}
    .rv-digital{font-size:clamp(12px,2.4vmin,17px);font-weight:800;color:${T.dim};font-variant-numeric:tabular-nums}
    .rv-badge{
      position:absolute;top:5%;left:50%;transform:translateX(-50%);
      background:${wedgeColor};color:${textOn(wedgeColor)};
      font-weight:800;font-size:12px;padding:5px 12px;border-radius:999px;
      white-space:nowrap;
      animation:${reducedMotion?"none":"rvpulse 1.6s ease-in-out infinite"}
    }
    @keyframes rvpulse{0%,100%{opacity:1}50%{opacity:.55}}

    /* ---- controles inline (desktop/landscape) ---- */
    .rv-controls{
      display:flex;flex-wrap:wrap;gap:10px;align-items:center;
      justify-content:center;padding:6px 16px 8px;
    }
    .rv-input{
      width:62px;background:${T.bg};border:1.5px solid ${T.line};
      color:${T.text};border-radius:12px;padding:9px 8px;font-size:16px;
      font-weight:800;text-align:center;font-family:inherit;min-height:44px;
    }
    .rv-input:focus-visible{outline:3px solid ${baseWedge};outline-offset:1px}
    .rv-seg{display:flex;background:${T.panel};border:1.5px solid ${T.line};border-radius:12px;overflow:hidden}
    .rv-seg button{
      background:transparent;border:none;color:${T.dim};
      padding:10px 13px;font-size:13px;font-weight:800;
      cursor:pointer;font-family:inherit;min-height:44px;
    }
    .rv-seg button.on{background:${baseWedge};color:${textOn(baseWedge)}}

    /* ---- franja rutina ---- */
    .rv-strip{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;padding:4px 16px 16px;max-width:920px}
    .rv-chip{
      display:flex;align-items:center;gap:7px;background:${T.panel};
      border:1.5px solid ${T.line};border-radius:999px;padding:7px 13px;
      font-size:13px;font-weight:700;color:${T.dim};
    }
    .rv-chip.cur{border-color:${baseWedge};color:${T.text};box-shadow:0 0 0 3px ${baseWedge}33}
    .rv-chip.done{opacity:.5;text-decoration:line-through}
    .rv-chip img{width:20px;height:20px;object-fit:cover;border-radius:5px}

    /* ---- tab-bar móvil ---- */
    .rv-tabbar{
      display:none; /* se activa con media query */
      position:fixed;bottom:0;left:0;right:0;
      background:${T.bg};border-top:1.5px solid ${T.line};
      padding:6px 12px calc(6px + env(safe-area-inset-bottom,0px));
      z-index:30;gap:0;
    }
    .rv-tabbar .tab{
      flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
      gap:2px;background:none;border:none;cursor:pointer;
      font-family:inherit;font-size:10px;font-weight:800;color:${T.dim};
      min-height:52px;padding:4px 0;
    }
    .rv-tabbar .tab .ico{font-size:22px;line-height:1}
    .rv-tabbar .tab.active{color:${baseWedge}}
    /* acción primaria central */
    .rv-tabbar .tab.main{
      flex:1.5;
    }
    .rv-tabbar .tab.main .ico{
      background:${baseWedge};color:${textOn(baseWedge)};
      width:52px;height:52px;border-radius:50%;display:flex;align-items:center;
      justify-content:center;font-size:24px;margin-bottom:2px;
      box-shadow:0 3px 12px ${baseWedge}66;
    }

    /* ---- overlay modales ---- */
    .rv-overlay{
      position:fixed;inset:0;
      background:rgba(34,48,63,.45);
      display:flex;align-items:flex-end;justify-content:center;
      z-index:40;padding:0;
    }
    .rv-card{
      background:${T.bg};
      border-radius:24px 24px 0 0;
      padding:20px 20px calc(20px + env(safe-area-inset-bottom,0px));
      width:100%;max-width:600px;
      max-height:88dvh;overflow-y:auto;
      box-shadow:0 -8px 40px rgba(34,48,63,.18);
    }
    .rv-card h2{margin:0 0 14px;font-size:18px}
    .rv-drag-pill{
      width:40px;height:4px;border-radius:999px;
      background:${T.line};margin:0 auto 16px;
    }
    /* en desktop: modal centrado clásico */
    @media(min-width:641px){
      .rv-overlay{align-items:center;padding:20px}
      .rv-card{border-radius:24px;max-height:86vh}
      .rv-drag-pill{display:none}
    }

    /* ---- grid pictogramas ---- */
    .rv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:10px}
    .rv-pick{
      background:${T.panel};border:2px solid ${T.line};border-radius:16px;
      padding:12px 6px;display:flex;flex-direction:column;align-items:center;gap:6px;
      cursor:pointer;color:${T.text};font-family:inherit;position:relative;
      min-height:44px;
    }
    .rv-pick:hover{border-color:${baseWedge}}
    .rv-pick .emo{font-size:30px;line-height:1}
    .rv-pick img{width:40px;height:40px;object-fit:cover;border-radius:10px}
    .rv-pick .pn{font-size:11px;font-weight:700;text-align:center;word-break:break-word}
    .rv-pick .del{
      position:absolute;top:-7px;right:-7px;width:22px;height:22px;
      border-radius:50%;background:${T.text};color:${T.bg};
      border:none;font-size:12px;cursor:pointer;line-height:22px;text-align:center;
    }
    .rv-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:10px 0}
    .rv-label{font-size:13px;font-weight:800;color:${T.dim};min-width:90px}
    select.rv-input{width:auto;text-align:left}
    .rv-step{
      display:flex;align-items:center;gap:10px;background:${T.panel};
      border:1.5px solid ${T.line};border-radius:14px;padding:10px 12px;margin:7px 0;
    }
    .rv-step img{width:26px;height:26px;object-fit:cover;border-radius:7px}
    .rv-step .x{margin-left:auto;background:none;border:none;color:${T.dim};font-size:20px;cursor:pointer;padding:4px}
    .rv-swatches{display:flex;gap:8px;flex-wrap:wrap}
    .rv-sw{
      width:42px;height:42px;border-radius:12px;cursor:pointer;
      border:3px solid transparent;font-weight:900;font-size:18px;
      display:flex;align-items:center;justify-content:center;
    }
    .rv-sw.on{border-color:${T.text}}
    .rv-note{color:${T.dim};font-size:12px;margin-top:8px;line-height:1.5}

    /* ---- overlay: actividad terminada ---- */
    .rv-done{text-align:center;padding:10px 0}
    .rv-done .big{font-size:72px;margin:4px 0}
    .rv-done h2{font-size:24px}
    .rv-done .next-row{display:flex;align-items:center;justify-content:center;gap:12px;font-size:17px;font-weight:800;margin:14px 0}

    /* ===== RESPONSIVE ===== */

    /* móvil portrait: tab-bar visible, controles inline ocultos */
    @media(max-width:640px){
      .rv-tabbar{display:flex}
      .rv-controls{display:none}       /* reemplazados por tab-bar */
      .rv-hbtns{display:none}          /* botones header → tab-bar */
      .rv-stage{
        width:min(94vmin,420px);height:min(94vmin,420px);
        margin-top:4px;
      }
      /* panel de tiempo flotante sobre la tab-bar */
      .rv-timepanel{
        display:flex;align-items:center;gap:10px;
        padding:10px 16px 4px;justify-content:center;flex-wrap:wrap;
      }
    }
    @media(min-width:641px){
      .rv-timepanel{display:none}  /* incluido en rv-controls en desktop */
    }
  `;

  /* ---- panel de tiempo (móvil: flotante / desktop: dentro de controls) ---- */
  const TimePanelInner=(
    <>
      <div className="rv-seg">
        <button className={viewMode==="restante"?"on":""} onClick={()=>setViewMode("restante")}>Queda</button>
        <button className={viewMode==="transcurrido"?"on":""} onClick={()=>setViewMode("transcurrido")}>Llevo</button>
      </div>
      <input className="rv-input" type="number" min="1" max="60"
        value={minInput} disabled={running}
        inputMode="numeric" aria-label="Minutos"
        onChange={e=>setMinInput(e.target.value)}
        onBlur={()=>setMinutes(Number(minInput)||1)}
        onKeyDown={e=>e.key==="Enter"&&setMinutes(Number(minInput)||1)}/>
      <span style={{color:T.dim,fontWeight:800,fontSize:13}}>min</span>
      <button className="btn" onClick={reset}>↺</button>
    </>
  );

  return(
    <div className="rv" ref={rootRef}>
      <style>{css}</style>
      <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={handleFiles}/>

      {/* ---- header ---- */}
      <div className="rv-hdr">
        <div className="rv-title">Reloj visual</div>
        <div className="rv-hbtns">
          <button className="btn" onClick={()=>setModal("routine")}>📋 Rutina</button>
          <button className="btn" onClick={()=>setModal("settings")}>⚙️ Ajustes</button>
          <button className="btn" onClick={toggleFS} title="Pantalla completa">⛶</button>
        </div>
      </div>

      {/* ---- reloj ---- */}
      <div className="rv-stage">
        {warnState!=="ok"&&!done&&(
          <div className="rv-badge">⏳ {warnState==="w1"?"¡Ya casi!":"Queda poco"}</div>
        )}
        <svg ref={svgRef} className="rv-svg" viewBox="0 0 400 400"
          onPointerDown={onPointerDown} onPointerMove={onPointerMove}
          onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <circle cx={CX} cy={CY} r={R} fill={T.panel} stroke={T.line} strokeWidth="2"/>
          {ticks}{numbers}
          <path d={wedgePath(wedgeAngle,dir)} fill={wedgeColor} opacity={.92}
            style={{transition:reducedMotion?"none":"fill .5s"}}/>
          <line x1={CX} y1={CY} x2={handlePos.x} y2={handlePos.y}
            stroke={T.text} strokeWidth="3" strokeLinecap="round" opacity=".85"/>
          {/* hitbox touch grande */}
          <circle cx={handlePos.x} cy={handlePos.y} r="24"
            fill="transparent" style={{cursor:running?"default":"grab"}}/>
          <circle cx={handlePos.x} cy={handlePos.y} r="13"
            fill={T.text} stroke={T.bg} strokeWidth="3" style={{pointerEvents:"none"}}/>
          <circle cx={CX} cy={CY} r="6" fill={T.text}/>
        </svg>

        <div className="rv-center" role="button" tabIndex={0}
          onClick={()=>!running&&setModal("picker")}
          onKeyDown={e=>e.key==="Enter"&&!running&&setModal("picker")}
          title={running?"Pausa para cambiar la actividad":"Cambiar actividad"}>
          {activity.img
            ?<img src={activity.img} alt={activity.n} style={{width:"56%",height:"56%",objectFit:"cover",borderRadius:"16%"}}/>
            :<div style={{fontSize:"clamp(32px,9vmin,62px)",lineHeight:1}}>{activity.e}</div>}
          <div className="rv-actname">{activity.n}</div>
          <div className="rv-digital">{fmt(shownSecs)}</div>
        </div>
      </div>

      {/* ---- panel de tiempo móvil ---- */}
      <div className="rv-timepanel">{TimePanelInner}</div>

      {/* ---- controles desktop ---- */}
      <div className="rv-controls">
        {TimePanelInner}
        {!running
          ?<button className="btn primary" onClick={start}>▶ Comenzar</button>
          :<button className="btn primary" onClick={pause}>⏸ Pausa</button>}
      </div>

      {/* ---- franja rutina ---- */}
      {routine.length>0&&(
        <div className="rv-strip">
          {routine.map((s,i)=>(
            <div key={s.id} className={"rv-chip"+(i===stepIdx?" cur":i<stepIdx?" done":"")}>
              {s.img?<img src={s.img} alt=""/>:<span>{s.e}</span>}
              <span>{s.n}</span>
              <span style={{opacity:.7}}>{s.mins}′</span>
            </div>
          ))}
        </div>
      )}

      {/* ---- tab-bar móvil ---- */}
      <div className="rv-tabbar">
        <button className="tab" onClick={()=>setModal("picker")}>
          <span className="ico">🖼️</span>Actividad
        </button>
        <button className="tab" onClick={()=>setModal("routine")}>
          <span className="ico">📋</span>Rutina
        </button>
        <button className={"tab main"} onClick={running?pause:start}>
          <span className="ico">{running?"⏸":"▶"}</span>
          {running?"Pausar":"Comenzar"}
        </button>
        <button className="tab" onClick={reset}>
          <span className="ico">↺</span>Reiniciar
        </button>
        <button className="tab" onClick={()=>setModal("settings")}>
          <span className="ico">⚙️</span>Ajustes
        </button>
      </div>

      {/* ===== MODALES ===== */}

      {/* ---- actividad terminada ---- */}
      {done&&(
        <div className="rv-overlay">
          <div className="rv-card rv-done">
            <div className="rv-drag-pill"/>
            <div className="big">{hasNext?"✅":"🎉"}</div>
            <h2>{hasNext?"¡Listo!":stepIdx>=0?"¡Rutina completada!":"¡Tiempo terminado!"}</h2>
            {hasNext&&(
              <div className="next-row">
                <span>Ahora:</span>
                {renderPicto(routine[stepIdx+1],44)}
                <span>{routine[stepIdx+1].n}</span>
              </div>
            )}
            <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap",marginTop:12}}>
              {hasNext&&<button className="btn primary" onClick={()=>goNextStep(true)}>▶ Siguiente</button>}
              <button className="btn" onClick={()=>{setDone(false);if(!hasNext){setStepIdx(-1);reset();}}}>
                {hasNext?"Esperar aquí":"Cerrar"}
              </button>
            </div>
            {hasNext&&<p className="rv-note" style={{textAlign:"center",marginTop:12}}>Avanza solo en unos segundos…</p>}
          </div>
        </div>
      )}

      {/* ---- selector pictograma ---- */}
      {modal==="picker"&&(
        <div className="rv-overlay" onClick={()=>setModal(null)}>
          <div className="rv-card" onClick={e=>e.stopPropagation()}>
            <div className="rv-drag-pill"/>
            <h2>¿Qué actividad viene?</h2>
            {customPictos.length>0&&(
              <>
                <p style={{color:T.dim,fontSize:12.5,fontWeight:800,margin:"0 0 8px"}}>Mis pictogramas</p>
                <div className="rv-grid" style={{marginBottom:14}}>
                  {customPictos.map(p=>(
                    <button key={p.id} className="rv-pick"
                      onClick={()=>{setActivity(p);setModal(null);}}>
                      <img src={p.img} alt={p.n}/>
                      <input className="pn" value={p.n}
                        onClick={e=>e.stopPropagation()}
                        onChange={e=>renameCustom(p.id,e.target.value)}
                        style={{border:"none",background:"transparent",width:"100%",
                          textAlign:"center",fontFamily:"inherit",fontWeight:700,
                          fontSize:11,color:T.text}}/>
                      <span className="del" role="button"
                        onClick={e=>{e.stopPropagation();removeCustom(p.id);}}>✕</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="rv-grid">
              <button className="rv-pick" style={{borderStyle:"dashed"}}
                onClick={()=>fileRef.current?.click()}>
                <span className="emo">＋</span><span className="pn">Subir imagen</span>
              </button>
              {PICTOS.map(p=>(
                <button key={p.n} className="rv-pick"
                  onClick={()=>{setActivity(p);setModal(null);}}>
                  <span className="emo">{p.e}</span><span className="pn">{p.n}</span>
                </button>
              ))}
            </div>
            <p className="rv-note">Las imágenes subidas se mantienen durante la sesión. Toca el nombre para editarlo.</p>
            <button className="btn" style={{width:"100%",marginTop:12}} onClick={()=>setModal(null)}>Cerrar</button>
          </div>
        </div>
      )}

      {/* ---- rutina ---- */}
      {modal==="routine"&&(
        <div className="rv-overlay" onClick={()=>setModal(null)}>
          <div className="rv-card" onClick={e=>e.stopPropagation()}>
            <div className="rv-drag-pill"/>
            <h2>Rutina encadenada</h2>
            <p style={{color:T.dim,fontSize:13,marginTop:-8,marginBottom:12}}>
              Agrega actividades en orden. Al terminar una, avanza a la siguiente automáticamente.
            </p>
            <div className="rv-row">
              <select className="rv-input" style={{width:"auto",flex:1}} value={draft.key}
                onChange={e=>setDraft({...draft,key:e.target.value})}>
                {allOptions.map(o=><option key={o.key} value={o.key}>{o.label}</option>)}
              </select>
              <input className="rv-input" type="number" min="1" max="60"
                inputMode="numeric" value={draft.mins}
                onChange={e=>setDraft({...draft,mins:Number(e.target.value)})}/>
              <span style={{color:T.dim,fontWeight:800,fontSize:13}}>min</span>
              <button className="btn" onClick={addStep}>+</button>
            </div>
            {routine.map((s,i)=>(
              <div className="rv-step" key={s.id}>
                <strong style={{color:T.dim,minWidth:16}}>{i+1}.</strong>
                {s.img?<img src={s.img} alt=""/>:<span style={{fontSize:22}}>{s.e}</span>}
                <span style={{fontWeight:700,flex:1}}>{s.n}</span>
                <span style={{color:T.dim,whiteSpace:"nowrap"}}>{s.mins} min</span>
                <button className="x" onClick={()=>removeStep(s.id)}>✕</button>
              </div>
            ))}
            {routine.length===0&&<p style={{color:T.dim,fontSize:14}}>Aún no hay actividades.</p>}
            <div style={{display:"flex",gap:10,marginTop:14}}>
              <button className="btn primary" style={{flex:1}} onClick={startRoutine} disabled={!routine.length}>
                ▶ Cargar rutina
              </button>
              <button className="btn" onClick={()=>setModal(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ---- ajustes ---- */}
      {modal==="settings"&&(
        <div className="rv-overlay" onClick={()=>setModal(null)}>
          <div className="rv-card" onClick={e=>e.stopPropagation()}>
            <div className="rv-drag-pill"/>
            <h2>Ajustes</h2>

            <div className="rv-row">
              <span className="rv-label">Color</span>
              <div className="rv-swatches">
                {WEDGE_COLORS.map(w=>(
                  <button key={w.k} className={"rv-sw"+(w.k===wedgeKey?" on":"")}
                    style={{background:w.c,color:textOn(w.c)}} title={w.n}
                    onClick={()=>setWedgeKey(w.k)}>
                    {w.k===wedgeKey?"✓":""}
                  </button>
                ))}
              </div>
            </div>

            <div className="rv-row">
              <span className="rv-label">Orientación</span>
              <div className="rv-seg">
                <button className={!inverted?"on":""} onClick={()=>setInverted(false)}>Horaria ↻</button>
                <button className={inverted?"on":""} onClick={()=>setInverted(true)}>Inversa ↺</button>
              </div>
            </div>

            <div className="rv-row">
              <span className="rv-label">Sonido</span>
              <div className="rv-seg">
                {[["off","Sin sonido"],["suave","Suave"],["campana","Campana"]].map(([k,n])=>(
                  <button key={k} className={sound===k?"on":""} onClick={()=>{setSound(k);if(k!=="off")playEnd(k);}}>{n}</button>
                ))}
              </div>
            </div>

            <div className="rv-row">
              <span className="rv-label">Animación</span>
              <div className="rv-seg">
                <button className={!reducedMotion?"on":""} onClick={()=>setReducedMotion(false)}>Normal</button>
                <button className={reducedMotion?"on":""} onClick={()=>setReducedMotion(true)}>Reducida</button>
              </div>
            </div>

            <div className="rv-row">
              <span className="rv-label">Aviso 5 min</span>
              <div className="rv-seg">
                <button className={warn5On?"on":""} onClick={()=>setWarn5On(true)}>Sí</button>
                <button className={!warn5On?"on":""} onClick={()=>setWarn5On(false)}>No</button>
              </div>
            </div>

            <div className="rv-row">
              <span className="rv-label">Aviso 1 min</span>
              <div className="rv-seg">
                <button className={warn1On?"on":""} onClick={()=>setWarn1On(true)}>Sí</button>
                <button className={!warn1On?"on":""} onClick={()=>setWarn1On(false)}>No</button>
              </div>
            </div>

            <button className="btn" style={{width:"100%",marginTop:14}} onClick={()=>setModal(null)}>Listo</button>
          </div>
        </div>
      )}
    </div>
  );
}
