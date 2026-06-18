import { useState, useRef, useEffect, useCallback } from "react";
import { T, WEDGE_COLORS, MILESTONES, textOn, CX, CY, R, polar, wedgePath, fmt, playEnd, playWarn, speak } from "../shared";
import ModalPicker from "./ModalPicker";
import ModalRutina from "./ModalRutina";
import ModalAjustes from "./ModalAjustes";

export default function ModoReloj({
  // estado compartido
  customPictos, onUploadClick, onRenameCustom, onRemoveCustom,
  savedRoutines, setSavedRoutines,
  // ajustes
  wedgeKey, setWedgeKey,
  inverted, setInverted,
  sound, setSound,
  reducedMotion, setReducedMotion,
  speechOn, setSpeechOn,
  activeHitos, toggleHito,
}) {
  const dir = inverted ? -1 : 1;
  const baseWedge = WEDGE_COLORS.find(w=>w.k===wedgeKey).c;

  const [activity, setActivity] = useState({ e:"🧩", n:"Trabajo en mesa" });
  const [routine, setRoutine] = useState([]);
  const [stepIdx, setStepIdx] = useState(-1);

  const [totalSecs, setTotalSecs] = useState(15*60);
  const [remaining, setRemaining] = useState(15*60);
  const [running, setRunning] = useState(false);
  const [viewMode, setViewMode] = useState("restante");
  const [done, setDone] = useState(false);
  const [minInput, setMinInput] = useState("15");
  const [modal, setModal] = useState(null);

  const endAtRef = useRef(null);
  const prevRemRef = useRef(remaining);
  const svgRef = useRef(null);
  const dragRef = useRef(false);

  /* ---- tick ---- */
  useEffect(()=>{
    if(!running) return;
    endAtRef.current = Date.now()+remaining*1000;
    const id = setInterval(()=>{
      const rem = Math.max(0,(endAtRef.current-Date.now())/1000);
      const prev = prevRemRef.current;
      MILESTONES.forEach(({key,secs,minTotal,text})=>{
        if(activeHitos[key]&&prev>secs&&rem<=secs&&totalSecs>minTotal){
          playWarn(sound);
          if(speechOn&&sound!=="off") speak(text);
        }
      });
      prevRemRef.current = rem;
      setRemaining(rem);
      if(rem<=0){ clearInterval(id); setRunning(false); playEnd(sound); setDone(true); }
    },200);
    return ()=>clearInterval(id);
  },[running]); // eslint-disable-line

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
    const secs = st.mins*60;
    setTotalSecs(secs); setRemaining(secs);
    prevRemRef.current = secs;
    setMinInput(String(st.mins));
    setDone(false); setRunning(!!autostart);
  },[routine]);

  const goNextStep = (autostart) => {
    if(hasNext) loadStep(stepIdx+1,autostart);
    else { setDone(false); setStepIdx(-1); }
  };

  const setMinutes = (mins) => {
    const m = Math.min(60,Math.max(1,Math.round(mins)));
    const secs = m*60;
    setTotalSecs(secs); setRemaining(secs);
    prevRemRef.current = secs;
    setMinInput(String(m)); setDone(false);
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
    setMinutes(getAngle(ev)/6);
  };
  const onPointerMove = (ev) => {
    if(!dragRef.current||running) return;
    const a = getAngle(ev);
    const cur = totalSecs/60;
    let mins = a/6;
    if(cur>50&&mins<5) mins=60;
    if(cur<10&&mins>55) mins=1;
    setMinutes(mins);
  };
  const onPointerUp = () => { dragRef.current = false; };

  /* ---- controles ---- */
  const start = () => { if(remaining<=0) setMinutes(Number(minInput)||15); setDone(false); setRunning(true); };
  const pause = () => setRunning(false);
  const reset = () => { setRunning(false); setDone(false); setRemaining(totalSecs); prevRemRef.current=totalSecs; };
  const toggleFS = () => {
    if(!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(()=>{});
    else document.exitFullscreen?.();
  };

  /* ---- estado visual ---- */
  const warn5On = activeHitos.m5;
  const warn1On = activeHitos.m1;
  const warnState =
    (running||remaining<totalSecs)
      ? remaining<=60&&warn1On&&totalSecs>90 ? "w1"
      : remaining<=300&&warn5On&&totalSecs>330 ? "w5" : "ok"
    : "ok";
  const wedgeColor = warnState==="w1"?T.warn1:warnState==="w5"?T.warn5:baseWedge;
  const shownSecs = viewMode==="restante" ? remaining : totalSecs-remaining;
  const wedgeAngle = (viewMode==="restante" ? remaining : totalSecs-remaining)/10;
  const handlePos = polar(wedgeAngle,dir);

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
      <input className="rv-input" type="number" min="1" max="60"
        value={minInput} disabled={running} inputMode="numeric" aria-label="Minutos"
        onChange={e=>setMinInput(e.target.value)}
        onBlur={()=>setMinutes(Number(minInput)||1)}
        onKeyDown={e=>e.key==="Enter"&&setMinutes(Number(minInput)||1)}/>
      <span style={{color:T.dim,fontWeight:800,fontSize:13}}>min</span>
      <button className="btn" onClick={reset}>↺</button>
    </>
  );

  return (
    <>
      {/* ---- header botones (desktop) ---- */}
      <div className="rv-hbtns">
        <button className="btn" onClick={()=>setModal("routine")}>📋 Rutina</button>
        <button className="btn" onClick={()=>setModal("settings")}>⚙️ Ajustes</button>
        <button className="btn" onClick={toggleFS} title="Pantalla completa">⛶</button>
      </div>

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
          <path d={wedgePath(wedgeAngle,dir)} fill={wedgeColor} opacity={.92}
            style={{transition:reducedMotion?"none":"fill .5s"}}/>
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
        />
      )}

      {modal==="routine"&&(
        <ModalRutina
          routine={routine} setRoutine={setRoutine}
          customPictos={customPictos}
          savedRoutines={savedRoutines} setSavedRoutines={setSavedRoutines}
          onClose={()=>setModal(null)}
          onStart={()=>{ if(!routine.length) return; setModal(null); loadStep(0,false); }}
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
          onClose={()=>setModal(null)}
        />
      )}
    </>
  );
}
