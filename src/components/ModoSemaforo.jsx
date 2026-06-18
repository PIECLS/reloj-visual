import { useState, useEffect, useRef } from "react";
import { T, textOn, playWarn, playEnd } from "../shared";

const DEFAULTS_TEXTOS = {
  verde:    { titulo:"Seguir",    subtitulo:"Todo bien, continúa" },
  amarillo: { titulo:"Con calma", subtitulo:"Espera un momento" },
  rojo:     { titulo:"Alto",      subtitulo:"Necesito una pausa" },
};

const DEFAULTS_CONFIG = {
  duraciones: {
    verde:    { valor: 10, unidad: "seg" },
    amarillo: { valor: 10, unidad: "seg" },
    rojo:     { valor: 10, unidad: "seg" },
  },
  modoAvance: "C",
  mostrarCrono: false,
};

// Orden de avance automático: verde → amarillo → rojo
const ORDEN_AVANCE = ["verde", "amarillo", "rojo"];

const LUCES = [
  { key:"rojo",     color:"#E04F4F" },
  { key:"amarillo", color:"#E3C334" },
  { key:"verde",    color:"#46A877" },
];

function durEnSegs({ valor, unidad }) {
  const n = Math.max(1, Number(valor) || 1);
  return unidad === "min" ? n * 60 : n;
}

function cargar(key, defaults) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
  } catch(e) { return { ...defaults }; }
}

function guardarLS(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) {}
}

function clonar(obj) { return JSON.parse(JSON.stringify(obj)); }

export default function ModoSemaforo({ sound, reducedMotion }) {
  const [activa, setActiva]       = useState("verde");
  const [textos, setTextos]       = useState(() => cargar("rv-semaforo-textos", DEFAULTS_TEXTOS));
  const [config, setConfig]       = useState(() => cargar("rv-semaforo-config", DEFAULTS_CONFIG));

  // Timer automático
  const [running, setRunning]     = useState(false);
  const [tiempoR, setTiempoR]     = useState(() => {
    const cfg = cargar("rv-semaforo-config", DEFAULTS_CONFIG);
    return durEnSegs(cfg.duraciones.verde);
  });
  const endAtRef  = useRef(null);
  const activaRef = useRef(activa);
  useEffect(() => { activaRef.current = activa; }, [activa]);

  // Modal
  const [modalOpen, setModalOpen]     = useState(false);
  const [editTextos, setEditTextos]   = useState(clonar(DEFAULTS_TEXTOS));
  const [editConfig, setEditConfig]   = useState(clonar(DEFAULTS_CONFIG));
  const [confirmar, setConfirmar]     = useState(false);

  // ---- tick del temporizador ----
  useEffect(() => {
    if (!running) return;
    endAtRef.current = Date.now() + tiempoR * 1000;
    const id = setInterval(() => {
      const rem = Math.max(0, (endAtRef.current - Date.now()) / 1000);
      setTiempoR(rem);
      if (rem <= 0) {
        playEnd(sound);
        const modo = config.modoAvance;
        const cur  = activaRef.current;
        if (modo === "C") {
          clearInterval(id);
          setRunning(false);
        } else {
          const idx  = ORDEN_AVANCE.indexOf(cur);
          const next = ORDEN_AVANCE[idx + 1];
          if (next) {
            // avanzar — el interval sigue corriendo
            setActiva(next);
            activaRef.current = next;
            playWarn(sound);
            const dur = durEnSegs(config.duraciones[next]);
            setTiempoR(dur);
            endAtRef.current = Date.now() + dur * 1000;
          } else {
            if (modo === "B") {
              // bucle — el interval sigue corriendo
              setActiva("verde");
              activaRef.current = "verde";
              playWarn(sound);
              const dur = durEnSegs(config.duraciones.verde);
              setTiempoR(dur);
              endAtRef.current = Date.now() + dur * 1000;
            } else {
              // modo A: llegamos a rojo, detener
              clearInterval(id);
              setRunning(false);
            }
          }
        }
      }
    }, 200);
    return () => clearInterval(id);
  }, [running]); // eslint-disable-line

  // Al cambiar la luz activa manualmente, reinicia el tiempo de esa luz
  const cambiar = (key) => {
    setActiva(key);
    activaRef.current = key;
    const dur = durEnSegs(config.duraciones[key]);
    setTiempoR(dur);
    if (running) endAtRef.current = Date.now() + dur * 1000;
    if (key !== activa) playWarn(sound);
  };

  const iniciar  = () => {
    if (tiempoR <= 0) setTiempoR(durEnSegs(config.duraciones[activa]));
    setRunning(true);
  };
  const pausar   = () => setRunning(false);
  const reiniciar = () => {
    setRunning(false);
    setActiva("verde");
    activaRef.current = "verde";
    setTiempoR(durEnSegs(config.duraciones.verde));
  };

  // ---- ajustes ----
  const abrirAjustes = () => {
    setEditTextos(clonar(textos));
    setEditConfig(clonar(config));
    setConfirmar(false);
    setModalOpen(true);
  };

  const guardar = () => {
    // textos: campo vacío cae a default
    const mergedT = {};
    for (const k of Object.keys(DEFAULTS_TEXTOS)) {
      mergedT[k] = {
        titulo:    editTextos[k].titulo.trim()    || DEFAULTS_TEXTOS[k].titulo,
        subtitulo: editTextos[k].subtitulo.trim() || DEFAULTS_TEXTOS[k].subtitulo,
      };
    }
    // duraciones: valor mínimo 1
    const mergedC = {
      modoAvance: editConfig.modoAvance,
      mostrarCrono: editConfig.mostrarCrono,
      duraciones: {},
    };
    for (const k of ORDEN_AVANCE) {
      const v = Math.max(1, Number(editConfig.duraciones[k].valor) || 1);
      mergedC.duraciones[k] = { valor: v, unidad: editConfig.duraciones[k].unidad };
    }
    setTextos(mergedT);
    setConfig(mergedC);
    guardarLS("rv-semaforo-textos", mergedT);
    guardarLS("rv-semaforo-config", mergedC);
    // si no está corriendo, actualiza el tiempo de la luz activa
    if (!running) setTiempoR(durEnSegs(mergedC.duraciones[activa]));
    setModalOpen(false);
  };

  const restaurar = () => {
    setTextos(clonar(DEFAULTS_TEXTOS));
    setConfig(clonar(DEFAULTS_CONFIG));
    try { localStorage.removeItem("rv-semaforo-textos"); } catch(e) {}
    try { localStorage.removeItem("rv-semaforo-config"); } catch(e) {}
    setRunning(false);
    setActiva("verde");
    setTiempoR(durEnSegs(DEFAULTS_CONFIG.duraciones.verde));
    setConfirmar(false);
    setModalOpen(false);
  };

  const luzActiva   = LUCES.find(l => l.key === activa);
  const textoActivo = textos[activa];

  // Formato mm:ss
  const fmtTiempo = (s) => {
    const t = Math.ceil(s);
    const m = Math.floor(t / 60);
    const sg = t % 60;
    return `${String(m).padStart(2,"0")}:${String(sg).padStart(2,"0")}`;
  };

  const durActiva = durEnSegs(config.duraciones[activa]);
  const progreso  = durActiva > 0 ? Math.max(0, tiempoR / durActiva) : 0;

  const MODO_LABELS = {
    A: "Verde → Amarillo → Rojo (una vez)",
    B: "Verde → Amarillo → Rojo (bucle)",
    C: "Sin avance automático",
  };

  return (
    <>
    <div style={{
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", flex:1, padding:"16px 24px 80px",
    }}>

      {/* Carcasa del semáforo */}
      <div style={{
        background:"#1A1A1A", borderRadius:999,
        padding:"20px 18px", display:"flex", flexDirection:"column",
        gap:16, alignItems:"center",
        boxShadow:"0 8px 32px rgba(0,0,0,.22)",
      }}>
        {LUCES.map(luz => {
          const on = activa === luz.key;
          return (
            <button key={luz.key} onClick={() => cambiar(luz.key)}
              aria-label={textos[luz.key].titulo} aria-pressed={on}
              style={{
                width:"min(30vmin,160px)", height:"min(30vmin,160px)",
                borderRadius:"50%", border:"none", cursor:"pointer",
                background: on ? luz.color : "#333",
                boxShadow: on
                  ? `0 0 48px ${luz.color}99, 0 0 12px ${luz.color}66, inset 0 2px 6px rgba(255,255,255,.15)`
                  : "inset 0 2px 6px rgba(0,0,0,.4)",
                transition: reducedMotion ? "none" : "background .25s, box-shadow .25s",
                display:"flex", alignItems:"center", justifyContent:"center",
                flexShrink:0,
              }}>
              <div style={{
                width:"42%", height:"42%", borderRadius:"50%",
                background: on ? "rgba(255,255,255,.22)" : "transparent",
                transition: reducedMotion ? "none" : "background .25s",
              }}/>
            </button>
          );
        })}
      </div>

      {/* Barra de progreso de la luz activa */}
      {config.modoAvance !== "C" && (
        <div style={{
          width:"min(88vmin,320px)", height:6, background:T.panel,
          border:`1.5px solid ${T.line}`, borderRadius:999,
          overflow:"hidden", marginTop:18,
        }}>
          <div style={{
            height:"100%", borderRadius:999,
            background: luzActiva.color,
            width:`${progreso * 100}%`,
            transition: reducedMotion ? "none" : "width .2s linear, background .3s",
          }}/>
        </div>
      )}

      {/* Etiqueta contextual */}
      <div style={{
        marginTop: config.modoAvance !== "C" ? 10 : 28,
        textAlign:"center",
        background: luzActiva.color,
        color: textOn(luzActiva.color),
        borderRadius:999, padding:"10px 28px",
        transition: reducedMotion ? "none" : "background .3s, color .3s",
        minWidth:180,
      }}>
        <div style={{fontSize:20,fontWeight:900,letterSpacing:".04em"}}>{textoActivo.titulo}</div>
        <div style={{fontSize:13,fontWeight:700,opacity:.85,marginTop:2}}>{textoActivo.subtitulo}</div>
      </div>

      {/* Cronómetro numérico opcional */}
      {config.mostrarCrono && (
        <div style={{
          marginTop:10, fontVariantNumeric:"tabular-nums",
          fontSize:15, fontWeight:800, color:T.dim, letterSpacing:".06em",
        }}>
          {fmtTiempo(tiempoR)}
        </div>
      )}

      <p style={{color:T.dim, fontSize:12, marginTop:14, textAlign:"center"}}>
        Toca una luz para cambiar el estado
      </p>

      {/* Modo activo (etiqueta discreta) */}
      <p style={{color:T.dim, fontSize:11, marginTop:2, textAlign:"center"}}>
        {MODO_LABELS[config.modoAvance]}
      </p>

      {/* ===== Modal de ajustes ===== */}
      {modalOpen && (
        <div className="rv-overlay" onClick={() => setModalOpen(false)}>
          <div className="rv-card" onClick={e => e.stopPropagation()}
            style={{maxHeight:"85vh", overflowY:"auto"}}>
            <div className="rv-drag-pill"/>
            <h2>Ajustes del semáforo</h2>

            {/* ── Duración y textos por luz ── */}
            <p style={{color:T.dim,fontSize:13,fontWeight:700,margin:"0 0 10px"}}>
              Configuración por luz
            </p>
            {ORDEN_AVANCE.map(key => {
              const luz = LUCES.find(l => l.key === key);
              return (
                <div key={key} style={{
                  background:T.panel, border:`1.5px solid ${T.line}`,
                  borderRadius:16, padding:"14px 14px 10px", marginBottom:12,
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                    <div style={{width:18,height:18,borderRadius:"50%",background:luz.color,flexShrink:0}}/>
                    <span style={{fontWeight:800,fontSize:13,color:T.text,textTransform:"capitalize"}}>{key}</span>
                  </div>

                  {/* Duración */}
                  <div className="rv-row" style={{margin:"0 0 8px"}}>
                    <span className="rv-label" style={{minWidth:70}}>Duración</span>
                    <input className="rv-input" type="number" min="1"
                      style={{width:64,textAlign:"center"}}
                      value={editConfig.duraciones[key].valor}
                      onChange={e => setEditConfig(prev => ({
                        ...prev,
                        duraciones: {
                          ...prev.duraciones,
                          [key]: { ...prev.duraciones[key], valor: e.target.value },
                        },
                      }))}/>
                    <div className="rv-seg" style={{marginLeft:8}}>
                      <button
                        className={editConfig.duraciones[key].unidad === "seg" ? "on" : ""}
                        onClick={() => setEditConfig(prev => ({
                          ...prev,
                          duraciones: { ...prev.duraciones, [key]: { ...prev.duraciones[key], unidad:"seg" } },
                        }))}>seg</button>
                      <button
                        className={editConfig.duraciones[key].unidad === "min" ? "on" : ""}
                        onClick={() => setEditConfig(prev => ({
                          ...prev,
                          duraciones: { ...prev.duraciones, [key]: { ...prev.duraciones[key], unidad:"min" } },
                        }))}>min</button>
                    </div>
                  </div>

                  {/* Título */}
                  <div className="rv-row" style={{margin:"0 0 8px"}}>
                    <span className="rv-label" style={{minWidth:70}}>Título</span>
                    <input className="rv-input"
                      style={{flex:1,width:"auto",textAlign:"left",paddingLeft:12}}
                      placeholder={DEFAULTS_TEXTOS[key].titulo}
                      value={editTextos[key].titulo}
                      onChange={e => setEditTextos(prev => ({
                        ...prev, [key]: { ...prev[key], titulo: e.target.value },
                      }))}/>
                  </div>

                  {/* Subtítulo */}
                  <div className="rv-row" style={{margin:0}}>
                    <span className="rv-label" style={{minWidth:70}}>Subtítulo</span>
                    <input className="rv-input"
                      style={{flex:1,width:"auto",textAlign:"left",paddingLeft:12}}
                      placeholder={DEFAULTS_TEXTOS[key].subtitulo}
                      value={editTextos[key].subtitulo}
                      onChange={e => setEditTextos(prev => ({
                        ...prev, [key]: { ...prev[key], subtitulo: e.target.value },
                      }))}/>
                  </div>
                </div>
              );
            })}

            {/* ── Modo de avance automático ── */}
            <p style={{color:T.dim,fontSize:13,fontWeight:700,margin:"16px 0 10px"}}>
              Avance automático
            </p>
            {["A","B","C"].map(m => (
              <button key={m} onClick={() => setEditConfig(prev => ({ ...prev, modoAvance: m }))}
                style={{
                  width:"100%", textAlign:"left", padding:"12px 14px",
                  marginBottom:8, borderRadius:14, cursor:"pointer",
                  border: `1.5px solid ${editConfig.modoAvance===m ? "#4A90D9" : T.line}`,
                  background: editConfig.modoAvance===m ? "#4A90D922" : T.panel,
                  color: T.text, fontWeight: editConfig.modoAvance===m ? 800 : 600,
                  fontSize:13,
                }}>
                <span style={{
                  display:"inline-block", width:20, height:20,
                  borderRadius:"50%", border:`2px solid ${editConfig.modoAvance===m ? "#4A90D9" : T.dim}`,
                  background: editConfig.modoAvance===m ? "#4A90D9" : "transparent",
                  marginRight:10, verticalAlign:"middle",
                }}/>
                {MODO_LABELS[m]}
              </button>
            ))}

            {/* ── Cronómetro numérico ── */}
            <div className="rv-row" style={{margin:"16px 0 4px"}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:13,color:T.text}}>Cronómetro numérico</div>
                <div style={{fontSize:12,color:T.dim,marginTop:2}}>
                  Muestra el tiempo de la luz activa (ayuda para el profesional)
                </div>
              </div>
              <button onClick={() => setEditConfig(prev => ({
                  ...prev, mostrarCrono: !prev.mostrarCrono,
                }))}
                style={{
                  width:48, height:28, borderRadius:999, border:"none",
                  cursor:"pointer", flexShrink:0,
                  background: editConfig.mostrarCrono ? "#4A90D9" : T.line,
                  transition:"background .2s", position:"relative",
                }}>
                <div style={{
                  position:"absolute", top:3,
                  left: editConfig.mostrarCrono ? "calc(100% - 25px)" : 3,
                  width:22, height:22, borderRadius:"50%",
                  background:"#fff", transition:"left .2s",
                  boxShadow:"0 1px 4px rgba(0,0,0,.2)",
                }}/>
              </button>
            </div>

            {/* ── Restaurar ── */}
            {!confirmar
              ? <button className="btn" style={{width:"100%",marginTop:8,color:T.dim}}
                  onClick={() => setConfirmar(true)}>
                  Restaurar valores predeterminados
                </button>
              : <div style={{
                  background:"#FFF8E7", border:`1.5px solid #E3C334`,
                  borderRadius:14, padding:"12px 14px", marginTop:8,
                  display:"flex", flexDirection:"column", gap:10,
                }}>
                  <p style={{margin:0,fontSize:13,fontWeight:700,color:T.text}}>
                    ¿Restaurar todos los ajustes predeterminados?
                  </p>
                  <div style={{display:"flex",gap:8}}>
                    <button className="btn"
                      style={{flex:1,background:"#E04F4F",color:"#fff",borderColor:"transparent"}}
                      onClick={restaurar}>Sí, restaurar</button>
                    <button className="btn" style={{flex:1}}
                      onClick={() => setConfirmar(false)}>Cancelar</button>
                  </div>
                </div>
            }

            <button className="btn primary" style={{width:"100%",marginTop:14}}
              onClick={guardar}>Listo</button>
          </div>
        </div>
      )}
    </div>

    {/* ---- Tab-bar ---- */}
    <div className="rv-tabbar">
      <div style={{flex:1}}/>
      <div style={{flex:1}}/>
      <button className="tab main" onClick={running ? pausar : iniciar}>
        <span className="ico">{running ? "⏸" : "▶"}</span>
        {running ? "Pausar" : "Comenzar"}
      </button>
      <button className="tab" onClick={reiniciar}>
        <span className="ico">↺</span>Reiniciar
      </button>
      <button className="tab" onClick={abrirAjustes}>
        <span className="ico">⚙️</span>Ajustes
      </button>
    </div>
    </>
  );
}
