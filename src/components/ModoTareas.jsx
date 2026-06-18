import { useState, useEffect, useRef } from "react";
import { T, WEDGE_COLORS, textOn, CX, CY, R, polar, wedgePath, fmt } from "../shared";
import useTimer from "../hooks/useTimer";

function cargarTareas() {
  try { return JSON.parse(localStorage.getItem("rv-tareas")||"[]"); }
  catch(e) { return []; }
}

export default function ModoTareas({
  wedgeKey, inverted, sound, reducedMotion, activeHitos, speechOn,
}) {
  const dir = inverted ? -1 : 1;
  const baseWedge = WEDGE_COLORS.find(w=>w.k===wedgeKey).c;

  const {
    totalSecs, remaining, running, done, setDone,
    minInput, setMinInput, setMinutes, start, pause, reset,
  } = useTimer({ sound, activeHitos, speechOn });

  const [viewMode, setViewMode] = useState("restante");
  const svgRef  = useRef(null);
  const dragRef = useRef(false);

  // ---- tareas ----
  const [tareas, setTareas] = useState(cargarTareas);
  const [input, setInput]   = useState("");
  const inputRef = useRef(null);

  useEffect(()=>{
    try { localStorage.setItem("rv-tareas", JSON.stringify(tareas)); }
    catch(e){}
  },[tareas]);

  const agregar = () => {
    const texto = input.trim();
    if(!texto) return;
    setTareas(t=>[...t, { id:Date.now(), texto, hecha:false }]);
    setInput("");
    inputRef.current?.focus();
  };
  const toggleHecha = (id) => setTareas(t=>t.map(x=>x.id===id?{...x,hecha:!x.hecha}:x));
  const eliminar    = (id) => setTareas(t=>t.filter(x=>x.id!==id));
  const limpiarHechas = () => setTareas(t=>t.filter(x=>!x.hecha));

  // ---- reloj visual ----
  const warn5On = activeHitos.m5;
  const warn1On = activeHitos.m1;
  const warnState =
    (running||remaining<totalSecs)
      ? remaining<=60&&warn1On&&totalSecs>90 ? "w1"
      : remaining<=300&&warn5On&&totalSecs>330 ? "w5" : "ok"
    : "ok";
  const wedgeColor  = warnState==="w1"?T.warn1:warnState==="w5"?T.warn5:baseWedge;
  const shownSecs   = viewMode==="restante" ? remaining : totalSecs-remaining;
  const wedgeAngle  = (viewMode==="restante" ? remaining : totalSecs-remaining)/10;
  const handlePos   = polar(wedgeAngle, dir);

  const ticks=[], numbers=[];
  for(let i=0;i<60;i++){
    const major=i%5===0, a=i*6;
    const p1=polar(a,dir,R+4), p2=polar(a,dir,R+(major?16:10));
    ticks.push(<line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
      stroke={T.dim} strokeWidth={major?2.4:1} opacity={major?.9:.45}/>);
  }
  for(let m=0;m<60;m+=5){
    const p=polar(m*6,dir,R+30);
    numbers.push(<text key={m} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
      fontSize="15" fontWeight="700" fill={T.dim}>{m===0?"0":m}</text>);
  }

  const getAngle = (ev) => {
    const rect=svgRef.current.getBoundingClientRect();
    const cx=ev.touches?ev.touches[0].clientX:ev.clientX;
    const cy=ev.touches?ev.touches[0].clientY:ev.clientY;
    const x=((cx-rect.left)/rect.width)*400-CX;
    const y=((cy-rect.top)/rect.height)*400-CY;
    let a=(Math.atan2(x,-y)*180)/Math.PI;
    if(a<0) a+=360;
    if(dir===-1) a=(360-a)%360;
    return a;
  };
  const onPointerDown=(ev)=>{ if(running)return; dragRef.current=true; ev.currentTarget.setPointerCapture?.(ev.pointerId); setMinutes(getAngle(ev)/6); };
  const onPointerMove=(ev)=>{ if(!dragRef.current||running)return; const a=getAngle(ev),cur=totalSecs/60; let m=a/6; if(cur>50&&m<5)m=60; if(cur<10&&m>55)m=1; setMinutes(m); };
  const onPointerUp=()=>{ dragRef.current=false; };

  const hechas = tareas.filter(t=>t.hecha).length;
  const total  = tareas.length;

  return (
    <>
      {/* ===== Layout principal ===== */}
      <div style={{
        display:"flex", flexDirection:"row", width:"100%",
        maxWidth:940, gap:24, padding:"0 16px 80px", flex:1,
        flexWrap:"wrap",
      }}>

        {/* ---- Columna izquierda: reloj ---- */}
        <div style={{
          display:"flex", flexDirection:"column", alignItems:"center",
          flex:"0 0 auto", width:"min(88vmin,400px)",
        }}>
          {/* Aviso de estado */}
          {warnState!=="ok"&&!done&&(
            <div style={{
              background:wedgeColor, color:textOn(wedgeColor),
              fontWeight:800, fontSize:12, padding:"5px 14px",
              borderRadius:999, marginBottom:8, whiteSpace:"nowrap",
              animation: reducedMotion?"none":"rvpulse 1.6s ease-in-out infinite",
            }}>
              ⏳ {warnState==="w1"?"¡Ya casi!":"Queda poco"}
            </div>
          )}

          {/* SVG reloj */}
          <div style={{position:"relative", width:"100%", aspectRatio:"1"}}>
            <svg ref={svgRef} style={{width:"100%",height:"100%",display:"block",touchAction:"none"}}
              viewBox="0 0 400 400"
              onPointerDown={onPointerDown} onPointerMove={onPointerMove}
              onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
              <circle cx={CX} cy={CY} r={R} fill={T.panel} stroke={T.line} strokeWidth="2"/>
              {ticks}{numbers}
              <path d={wedgePath(wedgeAngle,dir)} fill={wedgeColor} opacity={.92}
                style={{transition:reducedMotion?"none":"fill .5s"}}/>
              <line x1={CX} y1={CY} x2={handlePos.x} y2={handlePos.y}
                stroke={T.text} strokeWidth="3" strokeLinecap="round" opacity=".85"/>
              <circle cx={handlePos.x} cy={handlePos.y} r="24" fill="transparent"
                style={{cursor:running?"default":"grab"}}/>
              <circle cx={handlePos.x} cy={handlePos.y} r="13"
                fill={T.text} stroke={T.bg} strokeWidth="3" style={{pointerEvents:"none"}}/>
              <circle cx={CX} cy={CY} r="6" fill={T.text}/>
            </svg>

            {/* Centro digital */}
            <div style={{
              position:"absolute", left:"50%", top:"50%", transform:"translate(-50%,-50%)",
              width:"38%", height:"38%", borderRadius:"50%",
              background:T.bg, border:`2px solid ${T.line}`,
              display:"flex", flexDirection:"column", alignItems:"center",
              justifyContent:"center", gap:2, boxShadow:`0 0 0 6px ${T.bg}`,
              userSelect:"none",
            }}>
              <div style={{fontSize:"clamp(12px,2.4vmin,17px)",fontWeight:800,color:T.dim,fontVariantNumeric:"tabular-nums"}}>
                {fmt(shownSecs)}
              </div>
            </div>
          </div>

          {/* Controles del reloj */}
          <div style={{display:"flex",gap:8,alignItems:"center",marginTop:10,flexWrap:"wrap",justifyContent:"center"}}>
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
            {!running
              ?<button className="btn primary" onClick={start}>▶ Comenzar</button>
              :<button className="btn primary" onClick={pause}>⏸ Pausa</button>}
          </div>
        </div>

        {/* ---- Columna derecha: tareas ---- */}
        <div style={{flex:1, minWidth:260, display:"flex", flexDirection:"column"}}>

          {total>0&&(
            <div style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:800,color:T.dim,marginBottom:6}}>
                <span>{hechas} de {total} {total===1?"tarea":"tareas"}</span>
                {hechas>0&&(
                  <button onClick={limpiarHechas} style={{background:"none",border:"none",cursor:"pointer",color:T.dim,fontSize:13,fontWeight:800,padding:0}}>
                    Limpiar hechas ✕
                  </button>
                )}
              </div>
              <div style={{height:6,background:T.panel,borderRadius:999,border:`1.5px solid ${T.line}`,overflow:"hidden"}}>
                <div style={{height:"100%",background:"#46A877",width:`${total===0?0:Math.round(hechas/total*100)}%`,borderRadius:999,transition:"width .4s"}}/>
              </div>
            </div>
          )}

          <div style={{display:"flex",gap:8,marginBottom:14}}>
            <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&agregar()}
              placeholder="Agregar tarea…" className="rv-input"
              style={{flex:1,width:"auto",textAlign:"left",paddingLeft:14,fontSize:15}}/>
            <button className="btn primary" onClick={agregar}
              style={{minWidth:48,fontSize:22,padding:"0 14px"}}>+</button>
          </div>

          {tareas.length===0&&(
            <div style={{textAlign:"center",padding:"48px 0",color:T.dim,fontSize:14,fontWeight:700}}>
              <div style={{fontSize:48,marginBottom:12}}>📋</div>
              Agrega la primera tarea
            </div>
          )}

          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {tareas.map(t=>(
              <div key={t.id} style={{
                display:"flex",alignItems:"center",gap:12,
                background:t.hecha?T.panel:T.bg,
                border:`1.5px solid ${T.line}`,borderRadius:14,padding:"12px 14px",
                transition:"background .2s",
              }}>
                <button onClick={()=>toggleHecha(t.id)}
                  aria-label={t.hecha?"Marcar pendiente":"Marcar hecha"}
                  style={{
                    width:28,height:28,borderRadius:"50%",flexShrink:0,
                    border:`2px solid ${t.hecha?"#46A877":T.line}`,
                    background:t.hecha?"#46A877":T.bg,
                    cursor:"pointer",display:"flex",alignItems:"center",
                    justifyContent:"center",fontSize:14,transition:"all .2s",
                  }}>
                  {t.hecha&&<span style={{color:"#fff",lineHeight:1}}>✓</span>}
                </button>
                <span style={{
                  flex:1,fontSize:15,fontWeight:700,
                  color:t.hecha?T.dim:T.text,
                  textDecoration:t.hecha?"line-through":"none",
                  transition:"color .2s",
                }}>{t.texto}</span>
                <button onClick={()=>eliminar(t.id)} aria-label="Eliminar"
                  style={{background:"none",border:"none",cursor:"pointer",color:T.dim,fontSize:18,padding:"4px 2px",lineHeight:1}}>✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Overlay: tiempo terminado ---- */}
      {done&&(
        <div className="rv-overlay">
          <div className="rv-card" style={{textAlign:"center",padding:"24px 20px"}}>
            <div className="rv-drag-pill"/>
            <div style={{fontSize:72,margin:"4px 0"}}>🎉</div>
            <h2>¡Tiempo terminado!</h2>
            <div style={{display:"flex",gap:10,justifyContent:"center",marginTop:12}}>
              <button className="btn primary" onClick={()=>{setDone(false);reset();}}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Tab-bar móvil ---- */}
      <div className="rv-tabbar">
        <button className="tab" onClick={reset}>
          <span className="ico">↺</span>Reiniciar
        </button>
        <button className="tab main" onClick={running?pause:start}>
          <span className="ico">{running?"⏸":"▶"}</span>
          {running?"Pausar":"Comenzar"}
        </button>
        <button className="tab" onClick={agregar} disabled={!input.trim()}>
          <span className="ico">＋</span>Tarea
        </button>
      </div>
    </>
  );
}
