import { useState, useEffect, useRef } from "react";
import { T, WEDGE_COLORS, textOn, CX, CY, R, polar, wedgePath, arcSegPath, fmt, darkenColor } from "../shared";
import useTimer from "../hooks/useTimer";
import AjustesComunes from "./AjustesComunes";
import PanelRadial from "./PanelRadial";

function cargarLS(key, def) {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? def; }
  catch(e) { return def; }
}
function guardarLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
}

const DEFAULTS_AJUSTES = { alTerminar: "avanzar" };

export default function ModoTareas({
  // props compartidos de App
  wakeLockOn, setWakeLockOn,
  reducedMotion,
  // props independientes de Tareas
  tWedgeKey, setTWedgeKey,
  tInverted, setTInverted,
  tSound, setTSound,
  tSpeechOn, setTSpeechOn,
  tActiveHitos, toggleTHito,
}) {
  const dir       = tInverted ? -1 : 1;
  const baseWedge = WEDGE_COLORS.find(w => w.k === tWedgeKey).c;

  const {
    totalSecs, remaining, running, done, setDone,
    minInput, setMinInput, setMinutes, loadMinutes, start, pause, reset,
  } = useTimer({ sound: tSound, activeHitos: tActiveHitos, speechOn: tSpeechOn });

  const [viewMode, setViewMode] = useState("restante");
  const svgRef  = useRef(null);
  const dragRef = useRef(false);

  // ---- tareas ----
  const [tareas,      setTareas]     = useState(() => cargarLS("rv-tareas", []));
  const [input,       setInput]      = useState("");
  const [tareaActiva,     setTareaActiva]     = useState(() => cargarLS("rv-tareas-activa", -1));
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null); // id de tarea hecha con highlight visual
  const inputRef = useRef(null);

  useEffect(() => { guardarLS("rv-tareas", tareas); }, [tareas]);
  useEffect(() => { guardarLS("rv-tareas-activa", tareaActiva); }, [tareaActiva]);

  // Al montar (tras cambio de módulo), restaura el timer con el tiempo de la tarea activa
  useEffect(() => {
    const idx = cargarLS("rv-tareas-activa", -1);
    const mins = tareas[idx]?.mins;
    if (idx >= 0 && mins) loadMinutes(mins, false);
  }, []); // eslint-disable-line — solo al montar

  // Cuando el timer termina y hay una tarea activa, aplica el comportamiento configurado
  useEffect(() => {
    if (!done || tareaActiva < 0) return;
    if (ajustesTareas.alTerminar === "tachar") {
      setTareas(ts => ts.map((t, i) => i === tareaActiva ? { ...t, hecha: true } : t));
    }
    // Saltar tareas ya tachadas o sin tiempo asignado
    const siguiente = tareas.findIndex((t, i) => i > tareaActiva && !t.hecha && t.mins);
    if (siguiente >= 0) {
      setTareaActiva(siguiente);
      loadMinutes(tareas[siguiente].mins, true);
      setDone(false);
    }
    // Si no hay siguiente, deja el modal de "¡Tiempo terminado!" visible
  }, [done]); // eslint-disable-line

  const agregar = () => {
    const texto = input.trim();
    if (!texto) return;
    setTareas(t => [...t, { id: Date.now(), texto, hecha: false }]);
    setInput("");
    inputRef.current?.focus();
  };
  const toggleHecha = (id) => {
    const idx = tareas.findIndex(t => t.id === id);
    const nuevaHecha = !tareas[idx].hecha;
    setTareas(ts => ts.map((t, i) => i === idx ? { ...t, hecha: nuevaHecha } : t));
    // CAMBIO 1: tachar la tarea activa con tiempo → avanzar a la siguiente no-tachada
    if (nuevaHecha && idx === tareaActiva && tareas[idx].mins) {
      const siguiente = tareas.findIndex((t, i) => i > idx && !t.hecha && t.mins);
      if (siguiente >= 0) {
        setTareaActiva(siguiente);
        loadMinutes(tareas[siguiente].mins, running);
      } else {
        setTareaActiva(-1);
        pause();
      }
      setTareaSeleccionada(null);
    }
    // CAMBIO 2: destachar → futureSecs se recalcula automáticamente (incluye la tarea de nuevo)
  };
  const eliminar      = (id) => {
    setTareas(t => {
      const nuevo = t.filter(x => x.id !== id);
      // reajusta tareaActiva si era o estaba antes de la eliminada
      const idx = t.findIndex(x => x.id === id);
      setTareaActiva(prev => prev === idx ? -1 : prev > idx ? prev - 1 : prev);
      return nuevo;
    });
  };
  const limpiarHechas = () => {
    setTareas(t => t.filter(x => !x.hecha));
    setTareaActiva(-1);
    setTareaSeleccionada(null);
  };

  const handleReset = () => {
    setTareas(ts => ts.map(t => ({ ...t, hecha: false })));
    if (tareas.length > 0) {
      setTareaActiva(0);
      if (tareas[0]?.mins) loadMinutes(tareas[0].mins, false);
      else reset();
    } else {
      setTareaActiva(-1);
      reset();
    }
  };

  const activarTarea = (idx) => {
    setTareaActiva(idx);
    const mins = tareas[idx]?.mins;
    if (mins) loadMinutes(mins, false);
  };

  // ---- ajustes del modo Tareas ----
  const [ajustesTareas,    setAjustesTareas]    = useState(() => cargarLS("rv-tareas-ajustes", DEFAULTS_AJUSTES));
  const [modalAjustes,     setModalAjustes]     = useState(false);
  const [editAjustes,      setEditAjustes]      = useState(DEFAULTS_AJUSTES);

  useEffect(() => { guardarLS("rv-tareas-ajustes", ajustesTareas); }, [ajustesTareas]);

  const abrirAjustes = () => {
    setEditAjustes({ ...ajustesTareas });
    setModalAjustes(true);
  };
  const guardarAjustes = () => {
    setAjustesTareas(editAjustes);
    setModalAjustes(false);
  };

  // ---- rutinas de tareas ----
  const [tareasRutinas,   setTareasRutinas]  = useState(() => cargarLS("rv-tareas-rutinas", []));
  useEffect(() => { guardarLS("rv-tareas-rutinas", tareasRutinas); }, [tareasRutinas]);

  const [modalRutina,     setModalRutina]    = useState(false);
  const [vistaRutina,     setVistaRutina]    = useState("lista");
  const [editRutina,      setEditRutina]     = useState({ nombre: "", pasos: [] });
  const [confirmarBorrar, setConfirmarBorrar] = useState(null);

  const nuevoStep = () => ({ id: Date.now() + Math.random(), texto: "", mins: 5 });

  const abrirEditor = (rutina = null) => {
    if (rutina) {
      setEditRutina({ nombre: rutina.nombre, pasos: rutina.pasos.map(p => ({ ...p })), editId: rutina.id });
    } else {
      setEditRutina({ nombre: "", pasos: [nuevoStep()], editId: null });
    }
    setVistaRutina("editor");
  };

  const guardarRutina = () => {
    const nombre = editRutina.nombre.trim() || "Rutina sin nombre";
    const pasos  = editRutina.pasos
      .filter(p => p.texto.trim())
      .map(p => ({ id: p.id, texto: p.texto.trim(), mins: Math.max(1, Number(p.mins) || 1) }));
    if (!pasos.length) return;
    if (editRutina.editId) {
      setTareasRutinas(rs => rs.map(r => r.id === editRutina.editId ? { ...r, nombre, pasos } : r));
    } else {
      setTareasRutinas(rs => [...rs, { id: Date.now(), nombre, pasos }]);
    }
    setVistaRutina("lista");
  };

  const cargarRutina = (rutina) => {
    pause();
    const nuevasTareas = rutina.pasos.map(p => ({
      id: Date.now() + Math.random(),
      texto: p.texto,
      hecha: false,
      mins: p.mins,
    }));
    setTareas(nuevasTareas);
    setTareaActiva(0);
    // Siempre carga el tiempo de la primera tarea — visTiempo solo afecta la pantalla
    loadMinutes(Math.min(120, rutina.pasos[0]?.mins ?? 1), false);
    setModalRutina(false);
  };

  const eliminarRutina = (id) => {
    setTareasRutinas(rs => rs.filter(r => r.id !== id));
    setConfirmarBorrar(null);
  };

  const actualizarPaso = (idx, field, val) => {
    setEditRutina(prev => ({
      ...prev,
      pasos: prev.pasos.map((p, i) => i === idx ? { ...p, [field]: val } : p),
    }));
  };

  // ---- reloj visual ----
  // Siempre acumulado: suma los minutos de todas las tareas futuras
  const futureSecs = tareaActiva >= 0
    ? tareas.slice(tareaActiva + 1).reduce((s, t) => s + (!t.hecha && t.mins ? t.mins * 60 : 0), 0)
    : 0;
  // Tiempo consumido total (tareas pasadas + elapsed en tarea activa)
  const pastTasksSecs    = tareaActiva > 0
    ? tareas.slice(0, tareaActiva).reduce((s, t) => s + (t.mins || 0) * 60, 0)
    : 0;
  const activeElapsedSecs = tareaActiva >= 0 && tareas[tareaActiva]?.mins
    ? Math.max(0, tareas[tareaActiva].mins * 60 - remaining)
    : 0;
  const consumedSecs = pastTasksSecs + activeElapsedSecs;

  const warn5On  = tActiveHitos.m5;
  const warn1On  = tActiveHitos.m1;
  const warnState =
    (running || remaining < totalSecs)
      ? remaining <= 60  && warn1On && totalSecs > 90  ? "w1"
      : remaining <= 300 && warn5On && totalSecs > 330 ? "w5" : "ok"
    : "ok";
  const wedgeColor = warnState === "w1" ? T.warn1 : warnState === "w5" ? T.warn5 : baseWedge;
  // shownSecs: Queda = total restante (todas las tareas); Llevo = total consumido
  const shownSecs  = viewMode === "restante" ? remaining + futureSecs : consumedSecs;
  // El anillo muestra remaining+futureSecs, visualmente capeado en 120 min (2 vueltas)
  const ringSecs   = Math.min(remaining + futureSecs, 7200);
  const lap1Secs   = Math.min(ringSecs, 3600);
  const lap2Secs   = Math.max(0, ringSecs - 3600);
  const lap1Angle  = lap1Secs / 10;
  const lap2Angle  = lap2Secs / 10;
  const handleAngle = lap2Secs > 0 ? lap2Angle : lap1Angle;
  const handlePos  = polar(handleAngle, dir);

  const ticks = [], numbers = [];
  for (let i = 0; i < 60; i++) {
    const major = i % 5 === 0, a = i * 6;
    const p1 = polar(a, dir, R + 4), p2 = polar(a, dir, R + (major ? 16 : 10));
    ticks.push(<line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
      stroke={T.dim} strokeWidth={major ? 2.4 : 1} opacity={major ? .9 : .45}/>);
  }
  for (let m = 0; m < 60; m += 5) {
    const p = polar(m * 6, dir, R + 30);
    numbers.push(<text key={m} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
      fontSize="15" fontWeight="700" fill={T.dim}>{m === 0 ? "0" : m}</text>);
  }

  const getAngle = (ev) => {
    const rect = svgRef.current.getBoundingClientRect();
    const cx = ev.touches ? ev.touches[0].clientX : ev.clientX;
    const cy = ev.touches ? ev.touches[0].clientY : ev.clientY;
    const x  = ((cx - rect.left) / rect.width)  * 400 - CX;
    const y  = ((cy - rect.top)  / rect.height) * 400 - CY;
    let a = (Math.atan2(x, -y) * 180) / Math.PI;
    if (a < 0) a += 360;
    if (dir === -1) a = (360 - a) % 360;
    return a;
  };
  const onPointerDown = (ev) => {
    if (running) return;
    dragRef.current = true;
    ev.currentTarget.setPointerCapture?.(ev.pointerId);
    const a = getAngle(ev);
    const futureMin = futureSecs / 60;
    // ringSecs > 3600 → dial está en la segunda vuelta visual
    const visMins = ringSecs > 3600 ? a / 6 + 60 : a / 6;
    setMinutes(Math.max(1, visMins - futureMin));
  };
  const onPointerMove = (ev) => {
    if (!dragRef.current || running) return;
    const a = getAngle(ev);
    const futureMin = futureSecs / 60;
    // visCur: minutos visuales totales (tarea activa + futuras) para detectar en qué vuelta estamos
    const visCur = (totalSecs + futureSecs) / 60;
    let visMin = a / 6;
    if (visCur > 60) {
      let extra = visMin;
      if (visCur > 110 && extra < 5) extra = 60;
      if (visCur < 65  && extra > 55) extra = 0;
      setMinutes(Math.max(1, extra + 60 - futureMin));
    } else {
      if (visCur >= 60 && visMin < 2) { setMinutes(Math.max(1, 61 - futureMin)); return; }
      if (visCur > 50 && visMin < 5) visMin = 60;
      if (visCur < 10 && visMin > 55) visMin = 1;
      setMinutes(Math.max(1, visMin - futureMin));
    }
  };
  const onPointerUp = () => { dragRef.current = false; };

  const hechas = tareas.filter(t => t.hecha).length;
  const total  = tareas.length;

  const panelButtons = [
    { ico:"＋", label:"Tarea",    onClick:()=>inputRef.current?.focus() },
    { ico:"📋", label:"Rutinas",  onClick:()=>{ setVistaRutina("lista"); setModalRutina(true); } },
    { ico:running?"⏸":"▶", label:running?"Pausar":"Comenzar", onClick:running?pause:start, isMain:true },
    { ico:"↺",  label:"Reiniciar", onClick:handleReset },
    { ico:"⚙️", label:"Ajustes",   onClick:abrirAjustes },
  ];

  return (
    <>
      <style>{`
        .rv-tareas-layout {
          display: flex; flex-direction: row; width: 100%;
          max-width: min(940px, calc(100vw - 160px));
          gap: 24px; padding: 0 16px 80px; flex: 1; flex-wrap: wrap;
        }
        @media (max-width: 640px) {
          .rv-tareas-layout { max-width: 100%; justify-content: center; }
        }
      `}</style>

      {/* ---- panel radial desktop ---- */}
      <PanelRadial buttons={panelButtons} accent={baseWedge} reducedMotion={reducedMotion}/>

      {/* ===== Layout principal ===== */}
      <div className="rv-tareas-layout">

        {/* ---- Columna izquierda: reloj ---- */}
        <div style={{
          display:"flex", flexDirection:"column", alignItems:"center",
          flex:"0 0 auto", width:"min(88vmin,400px)",
        }}>
          {warnState !== "ok" && !done && (
            <div style={{
              background:wedgeColor, color:textOn(wedgeColor),
              fontWeight:800, fontSize:12, padding:"5px 14px",
              borderRadius:999, marginBottom:8, whiteSpace:"nowrap",
              animation: reducedMotion ? "none" : "rvpulse 1.6s ease-in-out infinite",
            }}>
              ⏳ {warnState === "w1" ? "¡Ya casi!" : "Queda poco"}
            </div>
          )}

          <div style={{position:"relative", width:"100%", aspectRatio:"1"}}>
            <svg ref={svgRef}
              style={{width:"100%",height:"100%",display:"block",touchAction:"none"}}
              viewBox="0 0 400 400"
              onPointerDown={onPointerDown} onPointerMove={onPointerMove}
              onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
              <circle cx={CX} cy={CY} r={R} fill={T.panel} stroke={T.line} strokeWidth="2"/>
              {ticks}{numbers}
              {(() => {
                // Sin tarea activa: arco único
                if (tareaActiva < 0 || !tareas[tareaActiva]?.mins) {
                  return (
                    <>
                      <path d={wedgePath(lap1Angle, dir)} fill={wedgeColor} opacity={.92}
                        style={{transition: reducedMotion ? "none" : "fill .5s"}}/>
                      {lap2Secs > 0 && (
                        <path d={wedgePath(lap2Angle, dir)} fill={darkenColor(wedgeColor)} opacity={.92}/>
                      )}
                    </>
                  );
                }
                // Orden correcto: [futuras N→1] cerca del 0°, [activa] junto al dial
                // La activa SIEMPRE ocupa los últimos `remaining` segundos del anillo.
                const futureShown = ringSecs - remaining; // segundos reservados para futuras

                const futureTasks = [];
                for (let i = tareaActiva + 1; i < tareas.length; i++) {
                  if (tareas[i].mins && !tareas[i].hecha) futureTasks.push({ t: tareas[i], idx: i });
                }

                const segs = [];
                let cum = 0;
                // Futuras en orden inverso: la ÚLTIMA queda en el 0°, la PRIMERA junto a la activa
                for (let fi = futureTasks.length - 1; fi >= 0 && cum < futureShown; fi--) {
                  const { t, idx } = futureTasks[fi];
                  const end = Math.min(cum + t.mins * 60, futureShown);
                  segs.push({ secStart: cum, secEnd: end, idx });
                  cum = end;
                }
                // Tarea activa: último segmento, siempre junto al dial
                if (remaining > 0) {
                  segs.push({ secStart: futureShown, secEnd: ringSecs, idx: tareaActiva });
                }

                return segs.map((seg, ri) => {
                  const isActive = seg.idx === tareaActiva;
                  // Alternación contada desde la activa (posFromActive 0=activa, 1=future1, ...)
                  // → future1 siempre contrasta con la activa
                  const posFromActive = segs.length - 1 - ri;
                  const shade = posFromActive % 2 === 1 ? darkenColor(baseWedge, 0.22) : baseWedge;
                  const c1 = isActive ? wedgeColor : shade;
                  const c2 = darkenColor(c1);
                  const op = isActive ? 0.92 : 0.55;
                  const l1s = Math.min(seg.secStart, 3600) / 10;
                  const l1e = Math.min(seg.secEnd,   3600) / 10;
                  const l2s = Math.max(seg.secStart - 3600, 0) / 10;
                  const l2e = Math.max(seg.secEnd   - 3600, 0) / 10;
                  return (
                    <g key={seg.idx}>
                      {l1e > l1s + 0.1 && (
                        <path d={arcSegPath(l1s, l1e, dir)} fill={c1} opacity={op}
                          style={{transition: isActive && !reducedMotion ? "fill .5s" : "none"}}/>
                      )}
                      {l2e > l2s + 0.1 && (
                        <path d={arcSegPath(l2s, l2e, dir)} fill={c2} opacity={op}/>
                      )}
                    </g>
                  );
                });
              })()}
              <line x1={CX} y1={CY} x2={handlePos.x} y2={handlePos.y}
                stroke={T.text} strokeWidth="3" strokeLinecap="round" opacity=".85"/>
              <circle cx={handlePos.x} cy={handlePos.y} r="24" fill="transparent"
                style={{cursor: running ? "default" : "grab"}}/>
              <circle cx={handlePos.x} cy={handlePos.y} r="13"
                fill={T.text} stroke={T.bg} strokeWidth="3" style={{pointerEvents:"none"}}/>
              <circle cx={CX} cy={CY} r="6" fill={T.text}/>
            </svg>

            <div style={{
              position:"absolute", left:"50%", top:"50%", transform:"translate(-50%,-50%)",
              width:"38%", height:"38%", borderRadius:"50%",
              background:T.bg, border:`2px solid ${T.line}`,
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:`0 0 0 6px ${T.bg}`, userSelect:"none",
            }}>
              <div style={{
                fontSize:"clamp(12px,2.4vmin,17px)", fontWeight:800,
                color:T.dim, fontVariantNumeric:"tabular-nums",
              }}>
                {fmt(shownSecs)}
              </div>
            </div>
          </div>

          <div style={{display:"flex",gap:8,alignItems:"center",marginTop:10,flexWrap:"wrap",justifyContent:"center"}}>
            <div className="rv-seg">
              <button className={viewMode === "restante" ? "on" : ""}
                onClick={() => setViewMode("restante")}>Queda</button>
              <button className={viewMode === "transcurrido" ? "on" : ""}
                onClick={() => setViewMode("transcurrido")}>Llevo</button>
            </div>
            <input className="rv-input" type="number" min="1" max="120"
              value={minInput} disabled={running} inputMode="numeric" aria-label="Minutos"
              onChange={e => setMinInput(e.target.value)}
              onBlur={() => setMinutes(Number(minInput) || 1)}
              onKeyDown={e => e.key === "Enter" && setMinutes(Number(minInput) || 1)}/>
            <span style={{color:T.dim,fontWeight:800,fontSize:13}}>min</span>
            <button className="btn" onClick={handleReset}>↺</button>
          </div>
        </div>

        {/* ---- Columna derecha: tareas ---- */}
        <div style={{flex:1, minWidth:260, display:"flex", flexDirection:"column"}}>

          {total > 0 && (
            <div style={{marginBottom:14}}>
              <div style={{
                display:"flex", justifyContent:"space-between",
                fontSize:13, fontWeight:800, color:T.dim, marginBottom:6,
              }}>
                <span>{hechas} de {total} {total === 1 ? "tarea" : "tareas"}</span>
                {hechas > 0 && (
                  <button onClick={limpiarHechas}
                    style={{background:"none",border:"none",cursor:"pointer",
                      color:T.dim,fontSize:13,fontWeight:800,padding:0}}>
                    Limpiar hechas ✕
                  </button>
                )}
              </div>
              <div style={{height:6,background:T.panel,borderRadius:999,
                border:`1.5px solid ${T.line}`,overflow:"hidden"}}>
                <div style={{
                  height:"100%", background:"#46A877",
                  width:`${total === 0 ? 0 : Math.round(hechas / total * 100)}%`,
                  borderRadius:999, transition:"width .4s",
                }}/>
              </div>
            </div>
          )}

          <div style={{display:"flex",gap:8,marginBottom:14}}>
            <input ref={inputRef} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && agregar()}
              placeholder="Agregar tarea…" className="rv-input"
              style={{flex:1,width:"auto",textAlign:"left",paddingLeft:14,fontSize:15}}/>
            <button className="btn primary" onClick={agregar}
              style={{minWidth:48,fontSize:22,padding:"0 14px"}}>+</button>
          </div>

          {tareas.length === 0 && (
            <div style={{textAlign:"center",padding:"48px 0",color:T.dim,fontSize:14,fontWeight:700}}>
              <div style={{fontSize:48,marginBottom:12}}>📋</div>
              Agrega la primera tarea
            </div>
          )}

          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {tareas.map((t, idx) => {
              const esActiva = idx === tareaActiva;
              const esSeleccionada = t.hecha && t.id === tareaSeleccionada;
              // Solo un indicador activo a la vez: si hay tachada seleccionada, la activa no resalta
              const resaltada = esSeleccionada || (esActiva && !tareaSeleccionada);
              return (
                <div key={t.id} style={{
                  display:"flex", alignItems:"center", gap:12,
                  background: t.hecha ? T.panel : T.bg,
                  border:`1.5px solid ${resaltada ? baseWedge : T.line}`,
                  borderRadius:14, padding:"12px 14px",
                  transition:"background .2s, border-color .2s",
                  boxShadow: resaltada ? `0 0 0 2px ${baseWedge}${esSeleccionada ? "44" : "33"}` : "none",
                }}>
                  <button onClick={() => toggleHecha(t.id)}
                    aria-label={t.hecha ? "Marcar pendiente" : "Marcar hecha"}
                    style={{
                      width:28, height:28, borderRadius:"50%", flexShrink:0,
                      border:`2px solid ${t.hecha ? "#46A877" : T.line}`,
                      background: t.hecha ? "#46A877" : T.bg,
                      cursor:"pointer", display:"flex", alignItems:"center",
                      justifyContent:"center", fontSize:14, transition:"all .2s",
                    }}>
                    {t.hecha && <span style={{color:"#fff",lineHeight:1}}>✓</span>}
                  </button>

                  {/* Tarea clickable: si no-hecha → activar; si hecha → highlight visual (CAMBIO 3) */}
                  <div style={{flex:1, cursor: (t.hecha || t.mins) ? "pointer" : "default"}}
                    onClick={() => {
                      if (t.hecha) setTareaSeleccionada(prev => prev === t.id ? null : t.id);
                      else if (t.mins) { activarTarea(idx); setTareaSeleccionada(null); }
                    }}>
                    <span style={{
                      fontSize:15, fontWeight:700,
                      color: t.hecha ? T.dim : esActiva ? T.text : T.text,
                      textDecoration: t.hecha ? "line-through" : "none",
                    }}>{t.texto}</span>
                    {t.mins && (
                      <span style={{
                        marginLeft:8, fontSize:12, fontWeight:700,
                        color: esActiva ? textOn(baseWedge) : T.dim,
                        background: esActiva ? baseWedge : T.panel,
                        border:`1px solid ${esActiva ? baseWedge : T.line}`,
                        borderRadius:999, padding:"1px 7px",
                        transition:"all .2s",
                      }}>{t.mins} min</span>
                    )}
                  </div>

                  <button onClick={() => eliminar(t.id)} aria-label="Eliminar"
                    style={{background:"none",border:"none",cursor:"pointer",
                      color:T.dim,fontSize:18,padding:"4px 2px",lineHeight:1}}>✕</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---- Overlay: tiempo terminado ---- */}
      {done && tareaActiva < 0 && (
        <div className="rv-overlay">
          <div className="rv-card" style={{textAlign:"center",padding:"24px 20px"}}>
            <div className="rv-drag-pill"/>
            <div style={{fontSize:72,margin:"4px 0"}}>🎉</div>
            <h2>¡Tiempo terminado!</h2>
            <div style={{display:"flex",gap:10,justifyContent:"center",marginTop:12}}>
              <button className="btn primary"
                onClick={() => { setDone(false); reset(); }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal rutinas de tareas ===== */}
      {modalRutina && (
        <div className="rv-overlay" onClick={() => setModalRutina(false)}>
          <div className="rv-card" onClick={e => e.stopPropagation()}
            style={{maxHeight:"85vh", overflowY:"auto"}}>
            <div className="rv-drag-pill"/>

            {vistaRutina === "lista" ? (
              <>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                  <h2 style={{margin:0}}>Rutinas de tareas</h2>
                  <button className="btn primary"
                    style={{fontSize:13,padding:"6px 14px"}}
                    onClick={() => abrirEditor()}>+ Nueva</button>
                </div>

                {tareasRutinas.length === 0 ? (
                  <div style={{textAlign:"center",padding:"32px 0",color:T.dim,fontSize:14,fontWeight:700}}>
                    <div style={{fontSize:40,marginBottom:10}}>📋</div>
                    Todavía no hay rutinas guardadas
                  </div>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {tareasRutinas.map(r => (
                      <div key={r.id} style={{
                        background:T.panel, border:`1.5px solid ${T.line}`,
                        borderRadius:14, padding:"12px 14px",
                      }}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                          <span style={{flex:1,fontWeight:800,fontSize:14,color:T.text}}>{r.nombre}</span>
                          <button className="btn" style={{fontSize:12,padding:"4px 10px"}}
                            onClick={() => abrirEditor(r)}>Editar</button>
                          {confirmarBorrar === r.id ? (
                            <>
                              <button className="btn"
                                style={{fontSize:12,padding:"4px 10px",background:"#E04F4F",color:"#fff",borderColor:"transparent"}}
                                onClick={() => eliminarRutina(r.id)}>Sí, borrar</button>
                              <button className="btn" style={{fontSize:12,padding:"4px 10px"}}
                                onClick={() => setConfirmarBorrar(null)}>No</button>
                            </>
                          ) : (
                            <button className="btn" style={{fontSize:12,padding:"4px 10px"}}
                              onClick={() => setConfirmarBorrar(r.id)}>✕</button>
                          )}
                        </div>
                        <div style={{fontSize:12,color:T.dim,marginBottom:10}}>
                          {r.pasos.length} {r.pasos.length === 1 ? "tarea" : "tareas"} ·{" "}
                          {r.pasos.reduce((s, p) => s + p.mins, 0)} min en total
                        </div>
                        <button className="btn primary" style={{width:"100%"}}
                          onClick={() => cargarRutina(r)}>
                          Cargar rutina
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button className="btn" style={{width:"100%",marginTop:16}}
                  onClick={() => setModalRutina(false)}>Cerrar</button>
              </>
            ) : (
              <>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                  <button className="btn" style={{fontSize:13,padding:"6px 12px"}}
                    onClick={() => setVistaRutina("lista")}>← Volver</button>
                  <h2 style={{margin:0,flex:1}}>
                    {editRutina.editId ? "Editar rutina" : "Nueva rutina"}
                  </h2>
                </div>

                <div className="rv-row" style={{margin:"0 0 16px"}}>
                  <span className="rv-label" style={{minWidth:60}}>Nombre</span>
                  <input className="rv-input"
                    style={{flex:1,width:"auto",textAlign:"left",paddingLeft:12}}
                    placeholder="Ej: Mañana de trabajo"
                    value={editRutina.nombre}
                    onChange={e => setEditRutina(prev => ({ ...prev, nombre: e.target.value }))}/>
                </div>

                <p style={{color:T.dim,fontSize:13,fontWeight:700,margin:"0 0 10px"}}>
                  Tareas de la rutina
                </p>

                <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
                  {editRutina.pasos.map((p, i) => (
                    <div key={p.id} style={{
                      display:"flex", alignItems:"center", gap:8,
                      background:T.panel, border:`1.5px solid ${T.line}`,
                      borderRadius:12, padding:"10px 12px",
                    }}>
                      <span style={{color:T.dim,fontSize:13,fontWeight:800,
                        minWidth:20,textAlign:"center"}}>{i + 1}</span>
                      <input className="rv-input"
                        style={{flex:1,width:"auto",textAlign:"left",paddingLeft:10,fontSize:14}}
                        placeholder="Nombre de la tarea"
                        value={p.texto}
                        onChange={e => actualizarPaso(i, "texto", e.target.value)}/>
                      <input className="rv-input" type="text" inputMode="numeric"
                        style={{width:52,textAlign:"center",padding:"8px 4px"}}
                        value={p.mins}
                        onChange={e => actualizarPaso(i, "mins", e.target.value.replace(/[^0-9]/g,""))}
                        onBlur={e => {
                          const v = Math.min(120, Math.max(1, parseInt(e.target.value,10)||1));
                          actualizarPaso(i, "mins", v);
                        }}/>
                      <span style={{color:T.dim,fontSize:12,fontWeight:700,whiteSpace:"nowrap"}}>min</span>
                      <button onClick={() => setEditRutina(prev => ({
                          ...prev, pasos: prev.pasos.filter((_, j) => j !== i),
                        }))}
                        style={{background:"none",border:"none",cursor:"pointer",
                          color:T.dim,fontSize:16,padding:"2px 4px",lineHeight:1}}>✕</button>
                    </div>
                  ))}
                </div>

                <button className="btn" style={{width:"100%",marginBottom:16}}
                  onClick={() => setEditRutina(prev => ({ ...prev, pasos: [...prev.pasos, nuevoStep()] }))}>
                  + Agregar tarea
                </button>

                <button className="btn primary" style={{width:"100%"}}
                  onClick={guardarRutina}
                  disabled={!editRutina.pasos.some(p => p.texto.trim())}>
                  💾 Guardar rutina
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== Modal ajustes del modo Tareas ===== */}
      {modalAjustes && (
        <div className="rv-overlay" onClick={() => setModalAjustes(false)}>
          <div className="rv-card" onClick={e => e.stopPropagation()}
            style={{maxHeight:"88vh", overflowY:"auto"}}>
            <div className="rv-drag-pill"/>
            <h2>Ajustes del modo Tareas</h2>

            {/* Secciones comunes: color, orientación, sonido, avisos, pantalla */}
            <AjustesComunes
              wedgeKey={tWedgeKey} setWedgeKey={setTWedgeKey}
              inverted={tInverted} setInverted={setTInverted}
              sound={tSound} setSound={setTSound}
              speechOn={tSpeechOn} setSpeechOn={setTSpeechOn}
              activeHitos={tActiveHitos} toggleHito={toggleTHito}
              wakeLockOn={wakeLockOn} setWakeLockOn={setWakeLockOn}
            />

            {/* Sección específica de Tareas */}
            <div style={{borderTop:`1.5px solid ${T.line}`,marginTop:16,paddingTop:16}}>
              <p style={{color:T.dim,fontSize:13,fontWeight:700,margin:"0 0 10px"}}>
                Al acabarse el tiempo de una tarea
              </p>
              {[
                { val:"avanzar", label:"Solo avanzar",
                  desc:"Resalta la siguiente tarea; el estudiante la marca cuando termina." },
                { val:"tachar",  label:"Tachar automáticamente",
                  desc:"Marca la tarea como completada y avanza a la siguiente." },
              ].map(op => (
                <button key={op.val} onClick={() => setEditAjustes(prev => ({ ...prev, alTerminar: op.val }))}
                  style={{
                    width:"100%", textAlign:"left", padding:"12px 14px",
                    marginBottom:8, borderRadius:14, cursor:"pointer",
                    border:`1.5px solid ${editAjustes.alTerminar === op.val ? "#4A90D9" : T.line}`,
                    background: editAjustes.alTerminar === op.val ? "#4A90D922" : T.panel,
                    color:T.text, fontSize:13,
                  }}>
                  <div style={{fontWeight:800,marginBottom:3}}>{op.label}</div>
                  <div style={{color:T.dim,fontSize:12}}>{op.desc}</div>
                </button>
              ))}

            </div>

            <button className="btn primary" style={{width:"100%",marginTop:14}}
              onClick={guardarAjustes}>Listo</button>
          </div>
        </div>
      )}

      {/* ---- Tab-bar ---- */}
      <div className="rv-tabbar">
        <button className="tab" onClick={() => inputRef.current?.focus()}>
          <span className="ico">＋</span>Tarea
        </button>
        <button className="tab" onClick={() => { setVistaRutina("lista"); setModalRutina(true); }}>
          <span className="ico">📋</span>Rutinas
        </button>
        <button className="tab main" onClick={running ? pause : start}>
          <span className="ico">{running ? "⏸" : "▶"}</span>
          {running ? "Pausar" : "Comenzar"}
        </button>
        <button className="tab" onClick={handleReset}>
          <span className="ico">↺</span>Reiniciar
        </button>
        <button className="tab" onClick={abrirAjustes}>
          <span className="ico">⚙️</span>Ajustes
        </button>
      </div>
    </>
  );
}
