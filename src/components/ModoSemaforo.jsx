import { useState } from "react";
import { T, textOn, playWarn } from "../shared";

const DEFAULTS = {
  verde:    { titulo:"Seguir",    subtitulo:"Todo bien, continúa" },
  amarillo: { titulo:"Con calma", subtitulo:"Espera un momento" },
  rojo:     { titulo:"Alto",      subtitulo:"Necesito una pausa" },
};

const LUCES = [
  { key:"rojo",     color:"#E04F4F" },
  { key:"amarillo", color:"#E3C334" },
  { key:"verde",    color:"#46A877" },
];

function cargarTextos() {
  try {
    const raw = localStorage.getItem("rv-semaforo-textos");
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch(e) { return { ...DEFAULTS }; }
}

export default function ModoSemaforo({ sound, reducedMotion }) {
  const [activa, setActiva]         = useState("verde");
  const [modalOpen, setModalOpen]   = useState(false);
  const [textos, setTextos]         = useState(cargarTextos);
  const [editando, setEditando]     = useState(() => JSON.parse(JSON.stringify(DEFAULTS)));
  const [confirmar, setConfirmar]   = useState(false);

  const cambiar = (key) => {
    if(key === activa) return;
    setActiva(key);
    playWarn(sound);
  };

  const abrirAjustes = () => {
    setEditando(JSON.parse(JSON.stringify(textos))); // copia para editar
    setConfirmar(false);
    setModalOpen(true);
  };

  const guardar = () => {
    // Si un campo está vacío, usa el default
    const merged = {};
    for(const k of Object.keys(DEFAULTS)){
      merged[k] = {
        titulo:    editando[k].titulo.trim()    || DEFAULTS[k].titulo,
        subtitulo: editando[k].subtitulo.trim() || DEFAULTS[k].subtitulo,
      };
    }
    setTextos(merged);
    try { localStorage.setItem("rv-semaforo-textos", JSON.stringify(merged)); } catch(e){}
    setModalOpen(false);
  };

  const restaurar = () => {
    setTextos({ ...DEFAULTS });
    try { localStorage.removeItem("rv-semaforo-textos"); } catch(e){}
    setConfirmar(false);
    setModalOpen(false);
  };

  const luzActiva = LUCES.find(l=>l.key===activa);
  const textoActivo = textos[activa];

  return (
    <div style={{
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", flex:1, padding:"16px 24px 40px",
      position:"relative",
    }}>

      {/* Botón ajustes — esquina superior derecha */}
      <button onClick={abrirAjustes} aria-label="Ajustes del semáforo"
        className="btn ghost"
        style={{
          position:"absolute", top:0, right:8,
          fontSize:22, padding:10, minHeight:44, minWidth:44,
        }}>
        ⚙️
      </button>

      {/* Carcasa del semáforo */}
      <div style={{
        background:"#1A1A1A", borderRadius:999,
        padding:"20px 18px", display:"flex", flexDirection:"column",
        gap:16, alignItems:"center",
        boxShadow:"0 8px 32px rgba(0,0,0,.22)",
      }}>
        {LUCES.map(luz=>{
          const on = activa===luz.key;
          return (
            <button key={luz.key} onClick={()=>cambiar(luz.key)}
              aria-label={textos[luz.key].titulo} aria-pressed={on}
              style={{
                width:"min(30vmin,160px)", height:"min(30vmin,160px)",
                borderRadius:"50%", border:"none", cursor:"pointer",
                background: on ? luz.color : "#333",
                boxShadow: on
                  ? `0 0 48px ${luz.color}99, 0 0 12px ${luz.color}66, inset 0 2px 6px rgba(255,255,255,.15)`
                  : "inset 0 2px 6px rgba(0,0,0,.4)",
                transition: reducedMotion?"none":"background .25s, box-shadow .25s",
                display:"flex", alignItems:"center", justifyContent:"center",
                flexShrink:0,
              }}>
              <div style={{
                width:"42%", height:"42%", borderRadius:"50%",
                background: on ? "rgba(255,255,255,.22)" : "transparent",
                transition: reducedMotion?"none":"background .25s",
              }}/>
            </button>
          );
        })}
      </div>

      {/* Etiqueta contextual */}
      <div style={{
        marginTop:28, textAlign:"center",
        background: luzActiva.color,
        color: textOn(luzActiva.color),
        borderRadius:999, padding:"10px 28px",
        transition: reducedMotion?"none":"background .3s, color .3s",
        minWidth:180,
      }}>
        <div style={{fontSize:20,fontWeight:900,letterSpacing:".04em"}}>{textoActivo.titulo}</div>
        <div style={{fontSize:13,fontWeight:700,opacity:.85,marginTop:2}}>{textoActivo.subtitulo}</div>
      </div>

      <p style={{color:T.dim, fontSize:12, marginTop:16, textAlign:"center"}}>
        Toca una luz para cambiar el estado
      </p>

      {/* ===== Modal de ajustes ===== */}
      {modalOpen&&(
        <div className="rv-overlay" onClick={()=>setModalOpen(false)}>
          <div className="rv-card" onClick={e=>e.stopPropagation()}>
            <div className="rv-drag-pill"/>
            <h2>Ajustes del semáforo</h2>
            <p style={{color:T.dim,fontSize:13,marginTop:-8,marginBottom:16}}>
              Personaliza el texto que aparece bajo cada luz.
            </p>

            {LUCES.map(luz=>(
              <div key={luz.key} style={{
                background:T.panel, border:`1.5px solid ${T.line}`,
                borderRadius:16, padding:"14px 14px 10px", marginBottom:12,
              }}>
                {/* Indicador de color */}
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <div style={{width:18,height:18,borderRadius:"50%",background:luz.color,flexShrink:0}}/>
                  <span style={{fontWeight:800,fontSize:13,color:T.text,textTransform:"capitalize"}}>{luz.key}</span>
                </div>

                <div className="rv-row" style={{margin:"0 0 8px"}}>
                  <span className="rv-label" style={{minWidth:70}}>Título</span>
                  <input className="rv-input"
                    style={{flex:1,width:"auto",textAlign:"left",paddingLeft:12}}
                    placeholder={DEFAULTS[luz.key].titulo}
                    value={editando[luz.key].titulo}
                    onChange={e=>setEditando(prev=>({
                      ...prev,
                      [luz.key]:{...prev[luz.key],titulo:e.target.value},
                    }))}/>
                </div>

                <div className="rv-row" style={{margin:0}}>
                  <span className="rv-label" style={{minWidth:70}}>Subtítulo</span>
                  <input className="rv-input"
                    style={{flex:1,width:"auto",textAlign:"left",paddingLeft:12}}
                    placeholder={DEFAULTS[luz.key].subtitulo}
                    value={editando[luz.key].subtitulo}
                    onChange={e=>setEditando(prev=>({
                      ...prev,
                      [luz.key]:{...prev[luz.key],subtitulo:e.target.value},
                    }))}/>
                </div>
              </div>
            ))}

            {/* Restaurar defaults */}
            {!confirmar
              ? <button className="btn" style={{width:"100%",marginTop:4,color:T.dim}}
                  onClick={()=>setConfirmar(true)}>
                  Restaurar valores predeterminados
                </button>
              : <div style={{
                  background:"#FFF8E7",border:`1.5px solid #E3C334`,
                  borderRadius:14,padding:"12px 14px",marginTop:4,
                  display:"flex",flexDirection:"column",gap:10,
                }}>
                  <p style={{margin:0,fontSize:13,fontWeight:700,color:T.text}}>
                    ¿Restaurar los textos predeterminados? Se perderán los cambios guardados.
                  </p>
                  <div style={{display:"flex",gap:8}}>
                    <button className="btn" style={{flex:1,background:"#E04F4F",color:"#fff",borderColor:"transparent"}}
                      onClick={restaurar}>Sí, restaurar</button>
                    <button className="btn" style={{flex:1}} onClick={()=>setConfirmar(false)}>Cancelar</button>
                  </div>
                </div>
            }

            <button className="btn primary" style={{width:"100%",marginTop:14}}
              onClick={guardar}>Listo</button>
          </div>
        </div>
      )}
    </div>
  );
}
