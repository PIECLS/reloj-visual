import { useState, useRef, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { T, WEDGE_COLORS, textOn, CX, CY, R, polar, wedgePath, fmt, darkenColor } from "../shared";
import useTimer from "../hooks/useTimer";
import ModalPicker from "./ModalPicker";
import ModalRutina from "./ModalRutina";
import ModalAjustes from "./ModalAjustes";
import ModalBiblioteca from "./ModalBiblioteca";
import PanelRadial from "./PanelRadial";

// ── Componente renderizado dentro de la ventana PiP ──────────────────────────
function MiniClock({ lap1Angle, lap2Angle, lap2Secs, wedgeColor, darkColor, dir, activity, shownSecs }) {
  const ticks = [];
  for(let i=0;i<60;i++){
    const major=i%5===0,a=i*6;
    const p1=polar(a,dir,R+4),p2=polar(a,dir,R+(major?16:10));
    ticks.push(<line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
      stroke={T.dim} strokeWidth={major?2.4:1} opacity={major?.9:.45}/>);
  }
  const numbers = [];
  for(let m=0;m<60;m+=5){
    const p=polar(m*6,dir,R+30);
    numbers.push(<text key={m} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
      fontSize="15" fontWeight="700" fill={T.dim}>{m===0?"0":m}</text>);
  }
  return (
    <div style={{
      width:"100%",height:"100vh",display:"flex",flexDirection:"column",
      alignItems:"center",justifyContent:"center",background:T.bg,
      fontFamily:"ui-rounded,'Segoe UI',system-ui,sans-serif",
    }}>
      {/* Cuadrado inscrito en la ventana — mantiene ratio 1:1 al redimensionar */}
      <div style={{position:"relative",width:"min(100vw,100vh)",height:"min(100vw,100vh)",flexShrink:0}}>
        <svg viewBox="0 0 400 400" style={{width:"100%",height:"100%",display:"block"}}>
          <circle cx={CX} cy={CY} r={R} fill={T.panel} stroke={T.line} strokeWidth="2"/>
          {ticks}
          {numbers}
          <path d={wedgePath(lap1Angle,dir)} fill={wedgeColor} opacity={.92}/>
          {lap2Secs>0&&<path d={wedgePath(lap2Angle,dir)} fill={darkColor} opacity={.92}/>}
          <circle cx={CX} cy={CY} r="6" fill={T.text}/>
        </svg>
        <div style={{
          position:"absolute",left:"50%",top:"50%",transform:"translate(-50%,-50%)",
          width:"38%",height:"38%",borderRadius:"50%",
          background:T.bg,border:`2px solid ${T.line}`,
          display:"flex",flexDirection:"column",alignItems:"center",
          justifyContent:"center",gap:2,
          boxShadow:`0 0 0 6px ${T.bg}`,userSelect:"none",overflow:"hidden",
        }}>
          {activity.img
            ?<img src={activity.img} alt={activity.n}
              style={{width:"56%",height:"56%",objectFit:"cover",borderRadius:"16%"}}/>
            :<div style={{fontSize:"clamp(24px,9vmin,48px)",lineHeight:1}}>{activity.e}</div>}
          <div style={{fontSize:"clamp(7px,2vmin,11px)",fontWeight:800,
            textAlign:"center",padding:"0 4px",color:T.text,lineHeight:1.2}}>{activity.n}</div>
          <div style={{fontSize:"clamp(10px,2.4vmin,14px)",fontWeight:800,
            color:T.dim,fontVariantNumeric:"tabular-nums"}}>{fmt(shownSecs)}</div>
        </div>
      </div>
    </div>
  );
}

export default function ModoReloj({
  // estado compartido
  customPictos, onUploadClick, onRenameCustom, onRemoveCustom, onAddCustomPicto,
  savedRoutines, setSavedRoutines,
  // ajustes
  wedgeKey, setWedgeKey,
  inverted, setInverted,
  sound, setSound,
  reducedMotion, setReducedMotion,
  speechOn, setSpeechOn,
  activeHitos, toggleHito,
  wakeLockOn, setWakeLockOn,
  // Firebase — Bloque 2: solo ModoReloj recibe estos props
  fbUser, onConectar, onDesconectar, fbCargando, fbError, fbEsColegio,
  // Picture-in-Picture
  openPiPRef, onPipAvailable,
}) {
  const dir = inverted ? -1 : 1;
  const baseWedge = WEDGE_COLORS.find(w=>w.k===wedgeKey).c;

  const [activity, setActivity] = useState({ e:"🧩", n:"Trabajo en mesa" });
  const [routine, setRoutine] = useState([]);
  const [stepIdx, setStepIdx] = useState(-1);
  const [viewMode, setViewMode] = useState("restante");
  const [modal, setModal] = useState(null); // "picker"|"routine"|"settings"|"biblioteca"

  const svgRef = useRef(null);
  const dragRef = useRef(false);

  // ── Picture-in-Picture ──────────────────────────────────────────────────────
  const pipWindowRef = useRef(null);
  const pipRootRef   = useRef(null);
  const [pipOpen, setPipOpen] = useState(false); // fuerza re-render al abrir/cerrar

  const openPiP = useCallback(async () => {
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.focus(); return;
    }
    try {
      const pipWin = await window.documentPictureInPicture.requestWindow({
        width: 320, height: 320,
      });
      pipWindowRef.current = pipWin;
      const style = pipWin.document.createElement("style");
      style.textContent = "*{box-sizing:border-box;margin:0;padding:0}body{overflow:hidden;width:100%;height:100vh}";
      pipWin.document.head.appendChild(style);
      const container = pipWin.document.createElement("div");
      container.style.cssText = "width:100%;height:100%";
      pipWin.document.body.appendChild(container);
      pipRootRef.current = createRoot(container);
      setPipOpen(true);
      pipWin.addEventListener("pagehide", () => {
        pipWindowRef.current = null;
        pipRootRef.current = null;
        setPipOpen(false);
      });
    } catch(e) {}
  }, []); // eslint-disable-line

  // Registra openPiP con App.jsx y notifica disponibilidad; limpia al desmontar
  useEffect(() => {
    const available = "documentPictureInPicture" in window;
    onPipAvailable?.(available);
    if (available && openPiPRef) openPiPRef.current = openPiP;
    return () => {
      onPipAvailable?.(false);
      if (openPiPRef) openPiPRef.current = null;
      pipWindowRef.current?.close?.();
    };
  }, []); // eslint-disable-line

  // Sincroniza contenido PiP en cada render (el timer llama setRemaining cada 200ms)
  useEffect(() => {
    if (!pipRootRef.current) return;
    pipRootRef.current.render(
      <MiniClock
        lap1Angle={lap1Angle ?? 0}
        lap2Angle={lap2Angle ?? 0}
        lap2Secs={lap2Secs ?? 0}
        wedgeColor={wedgeColor}
        darkColor={darkenColor(wedgeColor)}
        dir={dir}
        activity={activity}
        shownSecs={shownSecs ?? 0}
      />
    );
  }); // eslint-disable-line — sin deps: corre en cada render para mantener PiP en sync

  const {
    totalSecs, remaining, running, done, setDone,
    minInput, setMinInput, setMinutes, loadMinutes, start, pause, reset,
  } = useTimer({ sound, activeHitos, speechOn });

  const hasNext = stepIdx>=0 && stepIdx<routine.length-1;
  useEffect(()=>{
    if(!done||!hasNext) return;
    const t = setTimeout(()=>goNextStep(true),8000);
    return ()=>clearTimeout(t);
  },[done,hasNext]); // eslint-disable-line

  const loadStep = useCallback((idx,autostart)=>{
    const st = routine[idx]; if(!st) return;
    setStepIdx(idx);
    setActivity({ e:st.e, img:st.img, n:st.n });
    loadMinutes(st.mins, autostart);
  },[routine, loadMinutes]); // eslint-disable-line

  const goNextStep = (autostart) => {
    if(hasNext) loadStep(stepIdx+1,autostart);
    else { setDone(false); setStepIdx(-1); }
  };

  /* ---- arrastre ---- */
  const getAngle = (ev) => {
    const rect = svgRef.current.getBoundingClientRect();
    const cx = ev.touches?ev.touches[0].clientX:ev.clientX;
    const cy = ev.touches?ev.touches[0].clientY:ev.clientY;
    const x = ((cx-rect.left)/rect.width)*400-CX;
    const y = ((cy-rect.top)/rect.height)*400-CY;
    let a = (Math.atan2(x,-y)*180)/Math.PI;
    if(a<0) a+=360;
    if(dir===-1) a=(360-a)%360;
    return a;
  };
  const onPointerDown = (ev) => {
    if(running) return;
    dragRef.current = true;
    ev.currentTarget.setPointerCapture?.(ev.pointerId);
    const a = getAngle(ev);
    // Si ya estamos en segunda vuelta, el ángulo representa minutos extra sobre 60
    if(totalSecs > 3600) setMinutes(a/6 + 60);
    else setMinutes(a/6);
  };
  const onPointerMove = (ev) => {
    if(!dragRef.current||running) return;
    const a = getAngle(ev);
    const cur = totalSecs/60;
    let mins = a/6;
    if(cur > 60) {
      // Segunda vuelta: ángulo = minutos extra sobre 60
      let extra = mins;
      if(cur > 110 && extra < 5) extra = 60;   // ancla en 120 min
      if(cur < 65  && extra > 55) extra = 0;   // vuelve a 60 min
      setMinutes(extra + 60);
    } else {
      // Primera vuelta; cruzar 0° con cur≥60 inicia segunda vuelta
      if(cur >= 60 && mins < 2) { setMinutes(61); return; }
      if(cur > 50 && mins < 5) mins = 60;
      if(cur < 10 && mins > 55) mins = 1;
      setMinutes(mins);
    }
  };
  const onPointerUp = () => { dragRef.current = false; };

  /* ---- estado visual ---- */
  const warn5On = activeHitos.m5;
  const warn1On = activeHitos.m1;
  const warnState =
    (running||remaining<totalSecs)
      ? remaining<=60&&warn1On&&totalSecs>90 ? "w1"
      : remaining<=300&&warn5On&&totalSecs>330 ? "w5" : "ok"
    : "ok";
  const wedgeColor = warnState==="w1"?T.warn1:warnState==="w5"?T.warn5:baseWedge;
  const shownSecs  = viewMode==="restante" ? remaining : totalSecs-remaining;
  // Segunda vuelta: separa el arco en primera vuelta (≤60 min) y exceso
  const lap1Secs   = Math.min(shownSecs, 3600);
  const lap2Secs   = Math.max(0, shownSecs - 3600);
  const lap1Angle  = lap1Secs / 10;          // 0–360°
  const lap2Angle  = lap2Secs / 10;          // 0–360° (exceso sobre 60 min)
  const handleAngle = lap2Secs > 0 ? lap2Angle : lap1Angle;
  const handlePos  = polar(handleAngle, dir);

  const ticks = [];
  for(let i=0;i<60;i++){
    const major=i%5===0, a=i*6;
    const p1=polar(a,dir,R+4), p2=polar(a,dir,R+(major?16:10));
    ticks.push(<line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
      stroke={T.dim} strokeWidth={major?2.4:1} opacity={major?.9:.45}/>);
  }
  const numbers = [];
  for(let m=0;m<60;m+=5){
    const p=polar(m*6,dir,R+30);
    numbers.push(<text key={m} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
      fontSize="15" fontWeight="700" fill={T.dim}>{m===0?"0":m}</text>);
  }

  const renderPicto = (p,size) => p?.img
    ?<img src={p.img} alt={p.n} style={{width:size,height:size,objectFit:"cover",borderRadius:"18%"}}/>
    :<span style={{fontSize:size*.82,lineHeight:1}}>{p.e}</span>;

  const TimePanelInner = (
    <>
      <div className="rv-seg">
        <button className={viewMode==="restante"?"on":""} onClick={()=>setViewMode("restante")}>Queda</button>
        <button className={viewMode==="transcurrido"?"on":""} onClick={()=>setViewMode("transcurrido")}>Llevo</button>
      </div>
      <input className="rv-input" type="number" min="1" max="120"
        value={minInput} disabled={running} inputMode="numeric" aria-label="Minutos"
        onChange={e=>setMinInput(e.target.value)}
        onBlur={()=>setMinutes(Number(minInput)||1)}
        onKeyDown={e=>e.key==="Enter"&&setMinutes(Number(minInput)||1)}/>
      <span style={{color:T.dim,fontWeight:800,fontSize:13}}>min</span>
      <button className="btn" onClick={reset}>↺</button>
    </>
  );

  const panelButtons = [
    { ico:"🖼️", label:"Actividad", onClick:()=>setModal("picker") },
    { ico:"📋", label:"Rutina",    onClick:()=>setModal("routine") },
    { ico:running?"⏸":"▶", label:running?"Pausar":"Comenzar", onClick:running?pause:start, isMain:true },
    { ico:"↺",  label:"Reiniciar", onClick:reset },
    { ico:"⚙️", label:"Ajustes",   onClick:()=>setModal("settings") },
  ];

  const fbProps = { fbUser, fbEsColegio, onAbrirBiblioteca: ()=>setModal("biblioteca") };

  return (
    <>
      {/* ---- panel radial desktop ---- */}
      <PanelRadial buttons={panelButtons} accent={wedgeColor} reducedMotion={reducedMotion}/>

      {/* ---- reloj ---- */}
      <div className="rv-stage">
        {warnState!=="ok"&&!done&&(
          <div className="rv-badge" style={{
            background:wedgeColor, color:textOn(wedgeColor),
            animation: reducedMotion?"none":"rvpulse 1.6s ease-in-out infinite",
          }}>
            ⏳ {warnState==="w1"?"¡Ya casi!":"Queda poco"}
          </div>
        )}
        <svg ref={svgRef} className="rv-svg" viewBox="0 0 400 400"
          onPointerDown={onPointerDown} onPointerMove={onPointerMove}
          onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <circle cx={CX} cy={CY} r={R} fill={T.panel} stroke={T.line} strokeWidth="2"/>
          {ticks}{numbers}
          <path d={wedgePath(lap1Angle,dir)} fill={wedgeColor} opacity={.92}
            style={{transition:reducedMotion?"none":"fill .5s"}}/>
          {lap2Secs > 0 && (
            <path d={wedgePath(lap2Angle,dir)} fill={darkenColor(wedgeColor)} opacity={.92}/>
          )}
          <line x1={CX} y1={CY} x2={handlePos.x} y2={handlePos.y}
            stroke={T.text} strokeWidth="3" strokeLinecap="round" opacity=".85"/>
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
        <button className="tab main" onClick={running?pause:start}>
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
              <button className="btn" onClick={()=>{ setDone(false); if(!hasNext){ setStepIdx(-1); reset(); } }}>
                {hasNext?"Esperar aquí":"Cerrar"}
              </button>
            </div>
            {hasNext&&<p className="rv-note" style={{textAlign:"center",marginTop:12}}>Avanza solo en unos segundos…</p>}
          </div>
        </div>
      )}

      {modal==="picker"&&(
        <ModalPicker
          customPictos={customPictos}
          onSelect={p=>{ setActivity(p); setModal(null); }}
          onClose={()=>setModal(null)}
          onUploadClick={onUploadClick}
          onRename={onRenameCustom}
          onRemove={onRemoveCustom}
          onAddCustomPicto={onAddCustomPicto}
          {...fbProps}
        />
      )}

      {modal==="routine"&&(
        <ModalRutina
          routine={routine} setRoutine={setRoutine}
          customPictos={customPictos}
          savedRoutines={savedRoutines} setSavedRoutines={setSavedRoutines}
          onClose={()=>setModal(null)}
          onStart={()=>{ if(!routine.length) return; setModal(null); loadStep(0,false); }}
          {...fbProps}
        />
      )}

      {modal==="settings"&&(
        <ModalAjustes
          wedgeKey={wedgeKey} setWedgeKey={setWedgeKey}
          inverted={inverted} setInverted={setInverted}
          sound={sound} setSound={setSound}
          reducedMotion={reducedMotion} setReducedMotion={setReducedMotion}
          speechOn={speechOn} setSpeechOn={setSpeechOn}
          activeHitos={activeHitos} toggleHito={toggleHito}
          wakeLockOn={wakeLockOn} setWakeLockOn={setWakeLockOn}
          onClose={()=>setModal(null)}
          fbUser={fbUser}
          fbCargando={fbCargando}
          fbError={fbError}
          fbEsColegio={fbEsColegio}
          onConectar={onConectar}
          onDesconectar={onDesconectar}
          onAbrirBiblioteca={()=>setModal("biblioteca")}
        />
      )}

      {modal==="biblioteca"&&fbUser&&fbEsColegio&&(
        <ModalBiblioteca
          user={fbUser}
          savedRoutines={savedRoutines}
          setSavedRoutines={setSavedRoutines}
          customPictos={customPictos}
          onAddCustomPicto={onAddCustomPicto}
          onClose={()=>setModal(null)}
        />
      )}
    </>
  );
}
